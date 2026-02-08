import * as React from 'react';
import { Body, Container, Heading, Html, Preview, Section, Text } from '@react-email/components';
import type { NotificationEmailData } from '../types';

export function DocumentApprovedEmail({ orgName, documentName, documentId, workflowRunId }: NotificationEmailData) {
  const previewText = 'A document has been approved.';
  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '24px auto', padding: '24px', borderRadius: 8 }}>
          <Heading style={{ fontSize: 20, marginBottom: 12 }}>Document Approved</Heading>
          <Text style={{ margin: '0 0 16px' }}>
            Great news! A document has been approved{orgName ? ` in ${orgName}` : ''}.
          </Text>
          <Section>
            {documentName && <Text style={{ margin: '0 0 4px' }}><strong>Document:</strong> {documentName}</Text>}
            {documentId && <Text style={{ margin: '0 0 4px' }}><strong>Document ID:</strong> {documentId}</Text>}
            {workflowRunId && <Text style={{ margin: '0 0 4px' }}><strong>Workflow Run:</strong> {workflowRunId}</Text>}
          </Section>
          <Text style={{ marginTop: 16 }}>You can review the document status in your dashboard.</Text>
        </Container>
      </Body>
    </Html>
  );
}
