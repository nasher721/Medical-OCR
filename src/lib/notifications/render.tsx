import * as React from 'react';
import { render } from '@react-email/render';
import type { NotificationEmailData, NotificationEventType } from './types';
import { DocumentApprovedEmail } from './templates/document-approved-email';
import { DocumentNeedsReviewEmail } from './templates/document-needs-review-email';
import { WorkflowErrorEmail } from './templates/workflow-error-email';

const SUBJECTS: Record<NotificationEventType, string> = {
  document_approved: 'Document approved',
  needs_review: 'Document needs review',
  workflow_error: 'Workflow error',
};

export function renderNotificationEmail(
  event: NotificationEventType,
  data: NotificationEmailData
): { subject: string; html: string; text: string } {
  const subjectBase = SUBJECTS[event];
  const subject = data.documentName ? `${subjectBase}: ${data.documentName}` : subjectBase;

  const template = (() => {
    switch (event) {
      case 'document_approved':
        return <DocumentApprovedEmail {...data} />;
      case 'needs_review':
        return <DocumentNeedsReviewEmail {...data} />;
      case 'workflow_error':
        return <WorkflowErrorEmail {...data} />;
      default:
        return <DocumentApprovedEmail {...data} />;
    }
  })();

  const html = render(template);
  const text = render(template, { plainText: true });

  return { subject, html, text };
}
