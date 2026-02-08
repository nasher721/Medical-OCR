'use client';

import { useState } from 'react';
import { QueuePanel } from '@/components/workspace/queue-panel';
import { DocumentViewer } from '@/components/workspace/document-viewer';
import { ValidationPanel } from '@/components/workspace/validation-panel';
import { useOrgStore } from '@/lib/hooks/use-org';
import { Document } from '@/lib/supabase/types';
import { DocumentService } from '@/lib/services/document-service';

export default function WorkspacePage() {
    const { currentOrg } = useOrgStore();
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    // Ideally, we fetch the full document details when selected
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    const handleSelect = async (id: string) => {
        setSelectedDocId(id);
        // In a real implementation, we would fetch the document details here, 
        // but we might already have it from the queue if details are light.
        // For now, let's just assume we might need to fetch it or pass it.
        // If we have the doc list in QueuePanel, maybe we lift that state up?
        // For simplicity, let's just re-fetch or find it if we can, or just set ID.

        // FETCH FULL DOC DETAILS logic would go here.
        if (currentOrg) {
            try {
                const res = await DocumentService.search({ org_id: currentOrg.id, full_text: id, limit: 1 }); // Hacky get by ID if search supports it or add getById to service
                if (res.data.length > 0) setSelectedDoc(res.data[0]);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleApprove = async (id: string, data: any) => {
        console.log("Approved", id, data);
        // Call API to update status -> 'approved'
        // Remove from queue / Select next
        setSelectedDocId(null);
        setSelectedDoc(null);
    };

    const handleReject = async (id: string) => {
        console.log("Rejected", id);
        // Call API to update status -> 'rejected'
        setSelectedDocId(null);
        setSelectedDoc(null);
    };

    if (!currentOrg) return <div className="flex h-screen items-center justify-center">Loading Workspace...</div>;

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-background">
            <QueuePanel
                orgId={currentOrg.id}
                selectedId={selectedDocId}
                onSelect={handleSelect}
            />

            <main className="flex flex-1 overflow-hidden">
                <DocumentViewer document={selectedDoc} extraction={null} />
                <ValidationPanel
                    documentId={selectedDocId}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </main>
        </div>
    );
}
