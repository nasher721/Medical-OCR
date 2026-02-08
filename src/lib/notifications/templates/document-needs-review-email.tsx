import * as React from 'react';
import { Body, Container, Heading, Html, Preview, Section, Text } from '@react-email/components';
import type { NotificationEmailData } from '../types';

export function DocumentNeedsReviewEmail({ orgName, documentName, documentId, workflowRunId }: NotificationEmailData) {
  const previewText = 'A document requires review.';
  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '24px auto', padding: '24px', borderRadius: 8 }}>
          <Heading style={{ fontSize: 20, marginBottom: 12 }}>Document Needs Review</Heading>
          <Text style={{ margin: '0 0 16px' }}>
            A document has been flagged for review{orgName ? ` in ${orgName}` : ''}.
          </Text>
          <Section>
            {documentName && <Text style={{ margin: '0 0 4px' }}><strong>Document:</strong> {documentName}</Text>}
            {documentId && <Text style={{ margin: '0 0 4px' }}><strong>Document ID:</strong> {documentId}</Text>}
            {workflowRunId && <Text style={{ margin: '0 0 4px' }}><strong>Workflow Run:</strong> {workflowRunId}</Text>}
          </Section>
          <Text style={{ marginTop: 16 }}>Please review and take action in the dashboard.</Text>
        </Container>
      </Body>
    </Html>
  );
}
