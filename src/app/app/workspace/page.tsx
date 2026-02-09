'use client';

import { useState } from 'react';
import { QueuePanel } from '@/components/workspace/queue-panel';
import { DocumentViewer } from '@/components/workspace/document-viewer';
import { SidePanel } from '@/components/workspace/side-panel';

// ... (in WorkspacePage return)

<main className="flex flex-1 overflow-hidden">
    <DocumentViewer document={selectedDoc} extraction={null} />
    <SidePanel
        documentId={selectedDocId}
        orgId={currentOrg.id}
        onApprove={handleApprove}
        onReject={handleReject}
    />
</main>

