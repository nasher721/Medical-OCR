CREATE TYPE filter_preset_tag AS (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filter_preset_id UUID NOT NULL REFERENCES filter_presets(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_filter_preset_tags_tag ON filter_preset_tags(tag);
CREATE INDEX idx_filter_preset_tags_filter_preset ON filter_preset_tags(filter_preset_id);

ALTER TABLE filter_presets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION search_documents_v2(
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
    ORDER BY d.created_at DESC NULLS LAST, d.created_at DESC
    LIMIT COALESCE(NULLIF(p_page, 1), 20);
END;
$$;

DROP FUNCTION IF EXISTS search_documents;

ALTER FUNCTION search_documents_v2 RENAME TO search_documents;

GRANT EXECUTE ON FUNCTION search_documents TO postgres;
