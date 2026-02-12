-- Bulk operation history table to track all bulk document actions
CREATE TABLE bulk_operation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'approve', 'reject', 'reprocess', 'delete'
  document_ids TEXT[] NOT NULL DEFAULT '{}', -- Array of document IDs affected
  before_snapshot JSONB NOT NULL, -- Document state before operation
  after_snapshot JSONB NOT NULL, -- Document state after operation
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled'
  error_message TEXT, -- Error details if failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_bulk_history_org ON bulk_operation_history(org_id, created_at DESC);
CREATE INDEX idx_bulk_history_user ON bulk_operation_history(user_id, created_at DESC);
CREATE INDEX idx_bulk_history_status ON bulk_operation_history(status);

-- RLS Policies
ALTER TABLE bulk_operation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bulk operations in their orgs"
  ON bulk_operation_history
  FOR SELECT
  USING (org_id IN (SELECT auth.user_org_ids()));

CREATE POLICY "Users can create bulk operation records"
  ON bulk_operation_history
  FOR INSERT
  WITH CHECK (
    org_id IN (SELECT auth.user_org_ids()),
    jsonb_array_length(document_ids) > 0,
    jsonb_array_length(document_ids) <= 100
  );

-- Grant execute permission
GRANT EXECUTE ON ALL TABLES IN SCHEMA public TO postgres;
