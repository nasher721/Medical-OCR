-- ============================================================================
-- SETUP SCRIPT FOR MEDICAL OCR DATABASE
-- Run this script in your Supabase SQL Editor to fix missing tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create filter_presets table if missing (from migration 00003)
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their filter presets" ON filter_presets FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their filter presets" ON filter_presets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create filter_preset_tags (FIX for migration 00004 bug)
-- Note: Original migration incorrectly tried to create a TYPE instead of a TABLE
CREATE TABLE IF NOT EXISTS filter_preset_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filter_preset_id UUID NOT NULL REFERENCES filter_presets(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_filter_preset_tags_tag ON filter_preset_tags(tag);
CREATE INDEX IF NOT EXISTS idx_filter_preset_tags_filter_preset ON filter_preset_tags(filter_preset_id);

ALTER TABLE filter_presets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Create Medical Annotation tables (from migration 00005)
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  width NUMERIC NOT NULL DEFAULT 0,
  height NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, page_number)
);

CREATE TABLE IF NOT EXISTS ocr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  bbox JSONB NOT NULL,
  line_number INT,
  block_number INT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  field_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  bbox JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'corrected', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_schema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  repeating BOOLEAN NOT NULL DEFAULT false,
  synonyms JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

CREATE TABLE IF NOT EXISTS model_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('accept', 'correct', 'reject')),
  previous_value TEXT,
  corrected_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS structured_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_ocr_tokens_document_page ON ocr_tokens(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
CREATE INDEX IF NOT EXISTS idx_field_schema_org ON field_schema(org_id);

-- 4. Create Document Versions table (from migration 00006)
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  change_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_org ON document_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_extraction ON document_versions(extraction_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created ON document_versions(created_at DESC);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- 5. Update search_documents function (from migration 00007)
CREATE OR REPLACE FUNCTION search_documents(
  p_org_id UUID,
  p_status TEXT DEFAULT NULL,
  p_doc_types TEXT[] DEFAULT NULL,
  p_model_id UUID DEFAULT NULL,
  p_uploader_id UUID DEFAULT NULL,
  p_confidence_min NUMERIC DEFAULT NULL,
  p_confidence_max NUMERIC DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_full_text TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  uploader_id UUID,
  filename TEXT,
  storage_path TEXT,
  mime_type TEXT,
  doc_type TEXT,
  status TEXT,
  model_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      d.id,
      d.org_id,
      d.uploader_id,
      d.filename,
      d.storage_path,
      d.mime_type,
      d.doc_type,
      d.status,
      d.model_id,
      d.created_at,
      d.updated_at,
      COUNT(*) OVER() AS total_count
    FROM documents d
    LEFT JOIN LATERAL (
      SELECT e.id, e.full_text, e.document_id
      FROM extractions e
      WHERE e.document_id = d.id
      ORDER BY e.created_at DESC
      LIMIT 1
    ) e ON true
    WHERE d.org_id = p_org_id
      AND (p_status IS NULL OR d.status = p_status)
      AND (p_doc_types IS NULL OR d.doc_type = ANY(p_doc_types))
      AND (p_model_id IS NULL OR d.model_id = p_model_id)
      AND (p_uploader_id IS NULL OR d.uploader_id = p_uploader_id)
      AND (p_date_from IS NULL OR d.created_at >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at <= p_date_to)
      AND (
        p_full_text IS NULL
        OR to_tsvector('english', coalesce(e.full_text, '')) @@ websearch_to_tsquery('english', p_full_text)
      )
      AND (
        p_confidence_min IS NULL AND p_confidence_max IS NULL
        OR EXISTS (
          SELECT 1
          FROM extraction_fields ef
          WHERE ef.extraction_id = e.id
            AND (p_confidence_min IS NULL OR ef.confidence >= p_confidence_min)
            AND (p_confidence_max IS NULL OR ef.confidence <= p_confidence_max)
          )
      )
      AND (
        p_tags IS NULL OR d.id = ANY(
          SELECT fp.filter_preset_id
          FROM filter_preset_tags fp
          WHERE fp.tag = ANY(p_tags)
        )
      )
    ORDER BY d.created_at DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION search_documents TO postgres;
