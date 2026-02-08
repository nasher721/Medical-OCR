-- Full-text index for extractions
CREATE INDEX IF NOT EXISTS idx_extractions_full_text_fts
ON extractions
USING GIN (to_tsvector('english', coalesce(full_text, '')));

-- Saved filter presets
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

CREATE POLICY "Users can view their filter presets" ON filter_presets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their filter presets" ON filter_presets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Document search function
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
  p_page_size INT DEFAULT 20
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
    SELECT e.id, e.full_text
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
      (p_confidence_min IS NULL AND p_confidence_max IS NULL)
      OR EXISTS (
        SELECT 1
        FROM extraction_fields ef
        WHERE ef.extraction_id = e.id
          AND (p_confidence_min IS NULL OR ef.confidence >= p_confidence_min)
          AND (p_confidence_max IS NULL OR ef.confidence <= p_confidence_max)
      )
    )
  ORDER BY d.created_at DESC
  OFFSET GREATEST(p_page - 1, 0) * p_page_size
  LIMIT p_page_size;
END;
$$;
