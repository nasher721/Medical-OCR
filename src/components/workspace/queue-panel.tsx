import { useEffect, useState, useCallback } from 'react';
import { Document } from '@/lib/supabase/types';
import { DocumentService, SearchDocumentsParams } from '@/lib/services/document-service';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { FilterPanel } from './filter-panel';
import { RoleGuard } from '@/components/auth/role-guard';

interface QueuePanelProps {
    orgId: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRefresh?: () => void;
}

export function QueuePanel({ orgId, selectedId, onSelect, onRefresh }: QueuePanelProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    const [filters, setFilters] = useState<Partial<SearchDocumentsParams>>({
        status: 'needs_review',
        limit: 50,
        page: 1
    });

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const response = await DocumentService.search({
                org_id: orgId,
                ...filters,
                limit: filters.limit || 50,
                page: filters.page || 1,
            });
            setDocuments(response.data);
        } catch (error) {
            console.error('Failed to fetch queue', error);
        } finally {
            setLoading(false);
        }
    }, [orgId, filters]);

    useEffect(() => {
        if (orgId) {
            fetchQueue();
        }
    }, [orgId, fetchQueue]);

    const handleFilterChange = (newFilters: Partial<SearchDocumentsParams>) => {
        setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    };

    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        if (newSelected.size > 0) setIsMultiSelectMode(true);
        else setIsMultiSelectMode(false);
    };

    const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
        try {
            await DocumentService.bulkAction(action, Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsMultiSelectMode(false);
            fetchQueue();
            if (onRefresh) onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to perform action");
        }
    };

    return (
        <div className="flex h-full w-64 flex-col border-r bg-muted/10">
            <div className="flex items-center justify-between border-b p-4 relative">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Queue ({documents.length})
                </h2>

                {isMultiSelectMode ? (
                    <div className="flex gap-1">
                        <RoleGuard minRole="reviewer">
                            <button onClick={() => handleBulkAction('approve')} className="text-xs text-green-600 hover:text-green-700 font-medium mr-2">Approve</button>
                            <button onClick={() => handleBulkAction('reject')} className="text-xs text-red-600 hover:text-red-700 font-medium">Reject</button>
                        </RoleGuard>
                    </div>
                ) : (
                    <FilterPanel
                        orgId={orgId}
                        activeFilters={filters}
                        onApply={handleFilterChange}
                    />
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <CheckCircle className="mb-2 h-8 w-8 opacity-20" />
                        <p className="text-xs">No documents found.</p>
                        {Object.keys(filters).length > 3 && (
                            <button onClick={() => handleFilterChange({ status: 'needs_review', date_from: undefined, date_to: undefined, doc_type: undefined })} className="mt-2 text-xs text-primary underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className={cn(
                                    "group flex w-full gap-2 rounded-lg border p-3 text-left transition-all hover:bg-muted relative",
                                    selectedId === doc.id
                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                                        : "border-transparent bg-background"
                                )}
                            >
                                <div className="absolute left-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(doc.id)}
                                        onClick={(e) => toggleSelection(doc.id, e)}
                                        onChange={() => { }}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </div>
                                <button
                                    onClick={() => onSelect(doc.id)}
                                    className="flex flex-1 flex-col gap-1 w-full"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn("truncate text-sm font-medium", selectedIds.has(doc.id) ? "pl-6" : "")}>{doc.filename}</span>
                                    </div>
                                    <div className={cn("flex items-center justify-between text-xs text-muted-foreground", selectedIds.has(doc.id) ? "pl-6" : "")}>
                                        <span className="capitalize">{doc.doc_type}</span>
                                        <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                                    </div>
                                    {doc.status !== 'uploaded' && (
                                        <div className={cn("mt-1 flex items-center gap-1 text-[10px]", selectedIds.has(doc.id) ? "pl-6" : "")}>
                                            <span className={cn(
                                                "rounded-full px-1.5 py-0.5 capitalize",
                                                doc.status === 'approved' ? "bg-green-100 text-green-700" :
                                                    doc.status === 'rejected' ? "bg-red-100 text-red-700" :
                                                        "bg-yellow-100 text-yellow-700"
                                            )}>
                                                {doc.status}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

