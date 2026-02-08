import * as React from 'react';
import { Body, Container, Heading, Html, Preview, Section, Text } from '@react-email/components';
import type { NotificationEmailData } from '../types';

export function WorkflowErrorEmail({ orgName, documentName, documentId, workflowRunId }: NotificationEmailData) {
  const previewText = 'A workflow encountered an error.';
  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '24px auto', padding: '24px', borderRadius: 8 }}>
          <Heading style={{ fontSize: 20, marginBottom: 12 }}>Workflow Error</Heading>
          <Text style={{ margin: '0 0 16px' }}>
            A workflow run encountered an error{orgName ? ` in ${orgName}` : ''}. Please investigate.
          </Text>
          <Section>
            {documentName && <Text style={{ margin: '0 0 4px' }}><strong>Document:</strong> {documentName}</Text>}
            {documentId && <Text style={{ margin: '0 0 4px' }}><strong>Document ID:</strong> {documentId}</Text>}
            {workflowRunId && <Text style={{ margin: '0 0 4px' }}><strong>Workflow Run:</strong> {workflowRunId}</Text>}
          </Section>
          <Text style={{ marginTop: 16 }}>Check the workflow logs for more details.</Text>
        </Container>
      </Body>
    </Html>
  );
}
