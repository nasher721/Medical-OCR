export type OrgRole = 'admin' | 'reviewer' | 'member' | 'viewer';
export type DocumentStatus = 'uploaded' | 'processing' | 'needs_review' | 'approved' | 'rejected' | 'exported';
export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'paused';

export interface Org {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Model {
  id: string;
  org_id: string;
  name: string;
  type: string;
  active_version: number;
  created_at: string;
}

export interface ModelVersion {
  id: string;
  model_id: string;
  version: number;
  schema: Record<string, unknown>;
  created_at: string;
}

export interface ModelField {
  id: string;
  model_version_id: string;
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  regex: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  uploader_id: string | null;
  filename: string;
  storage_path: string;
  mime_type: string;
  doc_type: string;
  status: DocumentStatus;
  model_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Extraction {
  id: string;
  document_id: string;
  model_id: string | null;
  version: number;
  full_text: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ExtractionField {
  id: string;
  extraction_id: string;
  key: string;
  value: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number } | null;
  page: number;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface TrainingExample {
  id: string;
  org_id: string;
  model_id: string;
  field_key: string;
  correct_value: string;
  bbox: { x: number; y: number; w: number; h: number } | null;
  page: number | null;
  document_id: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  doc_type: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  edge_id: string;
  source: string;
  target: string;
  source_handle?: string | null;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  document_id: string | null;
  status: WorkflowRunStatus;
  started_at: string;
  finished_at: string | null;
}

export interface WorkflowLog {
  id: string;
  workflow_run_id: string;
  step_order: number;
  node_id: string;
  status: string;
  message: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface Integration {
  id: string;
  org_id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  org_id: string;
  user_id: string;
  email: string;
  document_approved: boolean;
  needs_review: boolean;
  workflow_error: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  org_id: string;
  document_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface FilterPreset {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebhookReceipt {
  id: string;
  org_id: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown> | null;
  received_at: string;
}

export interface Database {
  public: {
    Tables: {
      orgs: { Row: Org; Insert: Partial<Org> & { name: string }; Update: Partial<Org> };
      profiles: { Row: Profile; Insert: Partial<Profile> & { user_id: string }; Update: Partial<Profile> };
      memberships: { Row: Membership; Insert: Partial<Membership> & { org_id: string; user_id: string }; Update: Partial<Membership> };
      models: { Row: Model; Insert: Partial<Model> & { org_id: string; name: string }; Update: Partial<Model> };
      model_versions: { Row: ModelVersion; Insert: Partial<ModelVersion> & { model_id: string; version: number }; Update: Partial<ModelVersion> };
      model_fields: { Row: ModelField; Insert: Partial<ModelField> & { model_version_id: string; key: string; label: string }; Update: Partial<ModelField> };
      documents: { Row: Document; Insert: Partial<Document> & { org_id: string; filename: string; storage_path: string }; Update: Partial<Document> };
      extractions: { Row: Extraction; Insert: Partial<Extraction> & { document_id: string }; Update: Partial<Extraction> };
      extraction_fields: { Row: ExtractionField; Insert: Partial<ExtractionField> & { extraction_id: string; key: string }; Update: Partial<ExtractionField> };
      training_examples: { Row: TrainingExample; Insert: Partial<TrainingExample> & { org_id: string; model_id: string; field_key: string; correct_value: string }; Update: Partial<TrainingExample> };
      workflows: { Row: Workflow; Insert: Partial<Workflow> & { org_id: string; name: string }; Update: Partial<Workflow> };
      workflow_nodes: { Row: WorkflowNode; Insert: Partial<WorkflowNode> & { workflow_id: string; node_id: string; type: string }; Update: Partial<WorkflowNode> };
      workflow_edges: { Row: WorkflowEdge; Insert: Partial<WorkflowEdge> & { workflow_id: string; edge_id: string; source: string; target: string }; Update: Partial<WorkflowEdge> };
      workflow_runs: { Row: WorkflowRun; Insert: Partial<WorkflowRun> & { workflow_id: string }; Update: Partial<WorkflowRun> };
      workflow_logs: { Row: WorkflowLog; Insert: Partial<WorkflowLog> & { workflow_run_id: string; node_id: string }; Update: Partial<WorkflowLog> };
      integrations: { Row: Integration; Insert: Partial<Integration> & { org_id: string; type: string; name: string }; Update: Partial<Integration> };
      notification_preferences: { Row: NotificationPreference; Insert: Partial<NotificationPreference> & { org_id: string; user_id: string; email: string }; Update: Partial<NotificationPreference> };
      api_keys: { Row: ApiKey; Insert: Partial<ApiKey> & { org_id: string; name: string; key_hash: string }; Update: Partial<ApiKey> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog> & { org_id: string; action: string; entity_type: string }; Update: Partial<AuditLog> };
      review_comments: { Row: ReviewComment; Insert: Partial<ReviewComment> & { org_id: string; document_id: string; user_id: string; body: string }; Update: Partial<ReviewComment> };
      filter_presets: { Row: FilterPreset; Insert: Partial<FilterPreset> & { org_id: string; user_id: string; name: string }; Update: Partial<FilterPreset> };
      webhook_receipts: { Row: WebhookReceipt; Insert: Partial<WebhookReceipt> & { org_id: string; payload: Record<string, unknown> }; Update: Partial<WebhookReceipt> };
    };
  };
}
