-- =============================================
-- Nanonets IDP SaaS - Full Database Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Organizations
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (linked to supabase auth.users)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'reviewer', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- =============================================
-- MODELS
-- =============================================

CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  active_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  version INT NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (model_id, version)
);

CREATE TABLE model_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT false,
  regex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DOCUMENTS
-- =============================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  doc_type TEXT NOT NULL DEFAULT 'invoice',
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'needs_review', 'approved', 'rejected', 'exported')),
  model_id UUID REFERENCES models(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EXTRACTIONS
-- =============================================

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id),
  version INT NOT NULL DEFAULT 1,
  full_text TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extraction_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  confidence NUMERIC NOT NULL DEFAULT 0,
  bbox JSONB,
  page INT NOT NULL DEFAULT 1,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TRAINING
-- =============================================

CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  correct_value TEXT NOT NULL,
  bbox JSONB,
  page INT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- WORKFLOWS
-- =============================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'invoice',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  type TEXT NOT NULL,
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 0,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INTEGRATIONS & API KEYS
-- =============================================

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- =============================================
-- AUDIT & REVIEW
-- =============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook test receipts
CREATE TABLE webhook_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  headers JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(org_id);
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_extractions_document ON extractions(document_id);
CREATE INDEX idx_extraction_fields_extraction ON extraction_fields(extraction_id);
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_logs_run ON workflow_logs(workflow_run_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_training_examples_model ON training_examples(model_id);

-- =============================================
-- HELPER FUNCTION: Check org membership
-- =============================================

CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth.user_org_role(check_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM memberships WHERE user_id = auth.uid() AND org_id = check_org_id LIMIT 1;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Orgs
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their orgs" ON orgs
  FOR SELECT USING (id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Users can create orgs" ON orgs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update orgs" ON orgs
  FOR UPDATE USING (auth.user_org_role(id) = 'admin');

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Memberships
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view memberships in their orgs" ON memberships
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Admins can manage memberships" ON memberships
  FOR INSERT WITH CHECK (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can update memberships" ON memberships
  FOR UPDATE USING (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete memberships" ON memberships
  FOR DELETE USING (auth.user_org_role(org_id) = 'admin');

-- Models
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view models" ON models
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Admins can manage models" ON models
  FOR INSERT WITH CHECK (auth.user_org_role(org_id) IN ('admin'));
CREATE POLICY "Admins can update models" ON models
  FOR UPDATE USING (auth.user_org_role(org_id) IN ('admin'));
CREATE POLICY "Admins can delete models" ON models
  FOR DELETE USING (auth.user_org_role(org_id) IN ('admin'));

-- Model versions
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view model versions" ON model_versions
  FOR SELECT USING (model_id IN (SELECT id FROM models WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "Admins can manage model versions" ON model_versions
  FOR INSERT WITH CHECK (model_id IN (SELECT id FROM models WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));
CREATE POLICY "Admins can update model versions" ON model_versions
  FOR UPDATE USING (model_id IN (SELECT id FROM models WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));

-- Model fields
ALTER TABLE model_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view model fields" ON model_fields
  FOR SELECT USING (model_version_id IN (
    SELECT mv.id FROM model_versions mv JOIN models m ON mv.model_id = m.id WHERE m.org_id IN (SELECT auth.user_org_ids())
  ));
CREATE POLICY "Admins can manage model fields" ON model_fields
  FOR INSERT WITH CHECK (model_version_id IN (
    SELECT mv.id FROM model_versions mv JOIN models m ON mv.model_id = m.id WHERE m.org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(m.org_id) = 'admin'
  ));
CREATE POLICY "Admins can update model fields" ON model_fields
  FOR UPDATE USING (model_version_id IN (
    SELECT mv.id FROM model_versions mv JOIN models m ON mv.model_id = m.id WHERE m.org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(m.org_id) = 'admin'
  ));

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view documents" ON documents
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Members+ can upload documents" ON documents
  FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) IN ('admin', 'reviewer', 'member'));
CREATE POLICY "Reviewers+ can update documents" ON documents
  FOR UPDATE USING (org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) IN ('admin', 'reviewer'));
CREATE POLICY "Admins can delete documents" ON documents
  FOR DELETE USING (auth.user_org_role(org_id) = 'admin');

-- Extractions
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view extractions" ON extractions
  FOR SELECT USING (document_id IN (SELECT id FROM documents WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "System can create extractions" ON extractions
  FOR INSERT WITH CHECK (document_id IN (SELECT id FROM documents WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "System can update extractions" ON extractions
  FOR UPDATE USING (document_id IN (SELECT id FROM documents WHERE org_id IN (SELECT auth.user_org_ids())));

-- Extraction fields
ALTER TABLE extraction_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view extraction fields" ON extraction_fields
  FOR SELECT USING (extraction_id IN (
    SELECT e.id FROM extractions e JOIN documents d ON e.document_id = d.id WHERE d.org_id IN (SELECT auth.user_org_ids())
  ));
CREATE POLICY "Reviewers+ can edit extraction fields" ON extraction_fields
  FOR UPDATE USING (extraction_id IN (
    SELECT e.id FROM extractions e JOIN documents d ON e.document_id = d.id WHERE d.org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(d.org_id) IN ('admin', 'reviewer')
  ));
CREATE POLICY "System can create extraction fields" ON extraction_fields
  FOR INSERT WITH CHECK (extraction_id IN (
    SELECT e.id FROM extractions e JOIN documents d ON e.document_id = d.id WHERE d.org_id IN (SELECT auth.user_org_ids())
  ));

-- Training examples
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view training examples" ON training_examples
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Reviewers+ can create training examples" ON training_examples
  FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) IN ('admin', 'reviewer'));

-- Workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view workflows" ON workflows
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Admins can manage workflows" ON workflows
  FOR INSERT WITH CHECK (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can update workflows" ON workflows
  FOR UPDATE USING (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete workflows" ON workflows
  FOR DELETE USING (auth.user_org_role(org_id) = 'admin');

-- Workflow nodes
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view workflow nodes" ON workflow_nodes
  FOR SELECT USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "Admins can manage workflow nodes" ON workflow_nodes
  FOR INSERT WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));
CREATE POLICY "Admins can update workflow nodes" ON workflow_nodes
  FOR UPDATE USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));
CREATE POLICY "Admins can delete workflow nodes" ON workflow_nodes
  FOR DELETE USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));

-- Workflow edges
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view workflow edges" ON workflow_edges
  FOR SELECT USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "Admins can manage workflow edges" ON workflow_edges
  FOR INSERT WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));
CREATE POLICY "Admins can update workflow edges" ON workflow_edges
  FOR UPDATE USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));
CREATE POLICY "Admins can delete workflow edges" ON workflow_edges
  FOR DELETE USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) = 'admin'));

-- Workflow runs
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view workflow runs" ON workflow_runs
  FOR SELECT USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "Members+ can create workflow runs" ON workflow_runs
  FOR INSERT WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids())));
CREATE POLICY "System can update workflow runs" ON workflow_runs
  FOR UPDATE USING (workflow_id IN (SELECT id FROM workflows WHERE org_id IN (SELECT auth.user_org_ids())));

-- Workflow logs
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view workflow logs" ON workflow_logs
  FOR SELECT USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr JOIN workflows w ON wr.workflow_id = w.id WHERE w.org_id IN (SELECT auth.user_org_ids())
  ));
CREATE POLICY "System can create workflow logs" ON workflow_logs
  FOR INSERT WITH CHECK (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr JOIN workflows w ON wr.workflow_id = w.id WHERE w.org_id IN (SELECT auth.user_org_ids())
  ));

-- Integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view integrations" ON integrations
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Admins can manage integrations" ON integrations
  FOR INSERT WITH CHECK (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can update integrations" ON integrations
  FOR UPDATE USING (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete integrations" ON integrations
  FOR DELETE USING (auth.user_org_role(org_id) = 'admin');

-- API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view api keys" ON api_keys
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Admins can manage api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.user_org_role(org_id) = 'admin');
CREATE POLICY "Admins can delete api keys" ON api_keys
  FOR DELETE USING (auth.user_org_role(org_id) = 'admin');

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view audit logs" ON audit_logs
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Any member can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()));

-- Review comments
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view review comments" ON review_comments
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Reviewers+ can create review comments" ON review_comments
  FOR INSERT WITH CHECK (org_id IN (SELECT auth.user_org_ids()) AND auth.user_org_role(org_id) IN ('admin', 'reviewer'));

-- Webhook receipts
ALTER TABLE webhook_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view webhook receipts" ON webhook_receipts
  FOR SELECT USING (org_id IN (SELECT auth.user_org_ids()));
CREATE POLICY "Any can create webhook receipts" ON webhook_receipts
  FOR INSERT WITH CHECK (true);

-- =============================================
-- STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Org members can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (SELECT auth.user_org_ids()::text)
  );

CREATE POLICY "Org members can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (SELECT auth.user_org_ids()::text)
  );

CREATE POLICY "Admins can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM memberships WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER: Update documents.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
