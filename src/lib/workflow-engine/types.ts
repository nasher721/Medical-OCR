export type WorkflowNodeType =
  | 'upload'
  | 'api_ingest'
  | 'email_ingest'
  | 'extract'
  | 'rule'
  | 'review'
  | 'webhook_export'
  | 'csv_export'
  | 'notify';

export interface WorkflowNodeConfig {
  // Extract node
  model_id?: string;

  // Rule node
  field?: string;
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold?: number;
  action_pass?: 'approve' | 'continue';
  action_fail?: 'needs_review' | 'reject' | 'continue';

  // Webhook export
  url?: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;

  // CSV export
  fields_to_export?: string[];

  // Notify
  email_to?: string;
  email_subject?: string;
  email_body?: string;
  notify_event?: 'document_approved' | 'needs_review' | 'workflow_error';

  // Generic label
  label?: string;
}

export interface SerializedNode {
  node_id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  config: WorkflowNodeConfig;
}

export interface SerializedEdge {
  edge_id: string;
  source: string;
  target: string;
}

export interface WorkflowExecutionContext {
  workflow_id: string;
  workflow_run_id: string;
  document_id: string;
  org_id: string;
  current_step: number;
}

export interface StepResult {
  status: 'success' | 'failed' | 'paused';
  message: string;
  data?: Record<string, unknown>;
}
