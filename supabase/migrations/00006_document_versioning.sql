-- Document versions table to track extraction history per document
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL, -- Complete extraction fields as JSON snapshot
  change_reason TEXT, -- 'reprocess', 'manual_correction', 'version_restore'
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Indexes for efficient queries
CREATE INDEX idx_doc_versions_document ON document_versions(document_id);
CREATE INDEX idx_doc_versions_org ON document_versions(org_id);
CREATE INDEX idx_doc_versions_extraction ON document_versions(extraction_id);
CREATE INDEX idx_doc_versions_created ON document_versions(created_at DESC);

-- RLS Policies
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document versions for their orgs"
  ON document_versions
  FOR SELECT
  USING (org_id IN (SELECT auth.user_org_ids()));

CREATE POLICY "Users can create document version records"
  ON document_versions
  FOR INSERT
  WITH CHECK (
    org_id IN (SELECT auth.user_org_ids()),
    document_id IS NOT NULL
  );

CREATE POLICY "System can create/update/delete document versions"
  ON document_versions
  FOR ALL
  USING (org_id IN (SELECT auth.user_org_ids()))
  WITH CHECK (auth.jwt() IS NOT NULL);

-- Grant execute permission
GRANT EXECUTE ON ALL TABLES IN SCHEMA public TO postgres;