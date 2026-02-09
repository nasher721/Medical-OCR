'use client';

import { useState, useEffect } from 'react';
import { QueuePanel } from '@/components/workspace/queue-panel';
import { DocumentViewer } from '@/components/workspace/document-viewer';
import { SidePanel } from '@/components/workspace/side-panel';
import { useOrgStore } from '@/lib/hooks/use-org';
import { Document } from '@/lib/supabase/types';
import { DocumentService } from '@/lib/services/document-service';

export default function WorkspacePage() {
    const { currentOrg } = useOrgStore();
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!selectedDocId) {
            setSelectedDoc(null);
            return;
        }

        const fetchDoc = async () => {
            try {
                const { document } = await DocumentService.get(selectedDocId);
                setSelectedDoc(document);
            } catch (error) {
                console.error("Failed to fetch document details", error);
                setSelectedDoc(null);
            }
        };
        fetchDoc();
    }, [selectedDocId, refreshKey]);

    const handleApprove = async (id: string, data: any) => {
        try {
            await DocumentService.bulkAction('approve', [id]);
            // Refresh logic if needed, e.g. increment key to re-fetch if we want to show updated status
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to approve document", error);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await DocumentService.bulkAction('reject', [id]);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to reject document", error);
        }
    };

    if (!currentOrg) {
        return <div className="flex h-screen items-center justify-center">Loading organization...</div>;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
            <QueuePanel
                orgId={currentOrg.id}
                selectedId={selectedDocId}
                onSelect={setSelectedDocId}
                onRefresh={() => setRefreshKey(prev => prev + 1)}
            />
            <main className="flex flex-1 overflow-hidden">
                <DocumentViewer document={selectedDoc} extraction={null} />
                <SidePanel
                    documentId={selectedDocId}
                    orgId={currentOrg.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </main>
        </div>
    );
}
