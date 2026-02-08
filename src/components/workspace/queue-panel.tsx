'use client';

import { useEffect, useState } from 'react';
import { Document } from '@/lib/supabase/types';
import { DocumentService } from '@/lib/services/document-service';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface QueuePanelProps {
    orgId: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRefresh?: () => void;
}

export function QueuePanel({ orgId, selectedId, onSelect, onRefresh }: QueuePanelProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            // Fetch documents that need review or are processing
            // In a real triage queue, we might prioritize 'needs_review'
            const response = await DocumentService.search({
                org_id: orgId,
                status: 'uploaded', // For now, let's grab uploaded ones too since status logic might be simple
                limit: 50,
                page: 1,
            });
            // Also fetch 'processing' and 'needs_review' if we can support multiple statuses in search
            // The current search implementation supports a single status string. 
            // We might need to update DocumentService to support multiple statuses OR just fetch 'needs_review' mostly.
            // For this MVP, let's fetch 'uploaded' as that's what we have after basic upload.

            setDocuments(response.data);
        } catch (error) {
            console.error('Failed to fetch queue', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchQueue();
        }
    }, [orgId]);

    /* 
       Polling or manual refresh could be added here.
       For now, we rely on parent to trigger refreshes if needed, 
       but initial load is handled here.
    */

    return (
        <div className="flex h-full w-64 flex-col border-r bg-muted/10">
            <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Queue ({documents.length})
                </h2>
                {/* Potentially a refresh button or filter here */}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                        <CheckCircle className="mb-2 h-8 w-8 opacity-20" />
                        <p className="text-xs">All caught up!</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => onSelect(doc.id)}
                                className={cn(
                                    "flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-all hover:bg-muted",
                                    selectedId === doc.id
                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                        : "border-transparent bg-background"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate text-sm font-medium">{doc.filename}</span>
                                    {/* Status Indicator logic could go here */}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="capitalize">{doc.doc_type}</span>
                                    <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
