export type NotificationEventType = 'document_approved' | 'needs_review' | 'workflow_error';

export interface NotificationPayload {
  event: NotificationEventType;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<{ id?: string }>;
}

export interface NotificationEmailData {
  orgName?: string;
  documentId?: string;
  documentName?: string;
  workflowRunId?: string;
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
