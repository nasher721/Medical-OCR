import { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '@/lib/supabase/types';
import { AuditService } from '@/lib/services/audit-service';
import { ChevronLeft, ChevronRight, FileJson } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AuditLogViewerProps {
    orgId: string;
}

export function AuditLogViewer({ orgId }: AuditLogViewerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const limit = 20;

    useEffect(() => {
        if (orgId) {
            fetchLogs();
        }
    }, [orgId, page, fetchLogs]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await AuditService.getLogs({ org_id: orgId, page, limit });
            setLogs(response.data);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    }, [orgId, page]);

    const maxPage = Math.ceil(total / limit);

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Audit Logs</h2>
                <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-primary">Refresh</button>
            </div>

            <div className="rounded-lg border">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left text-sm font-medium">Action</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Entity</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">User</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Timestamp</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No audit logs found</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/5">
                                    <td className="px-4 py-2 text-sm font-medium">
                                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize bg-muted">
                                            {log.action.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-muted-foreground">
                                        <span className="capitalize">{log.entity_type}</span>
                                        {log.entity_id && <span className="ml-1 font-mono text-xs opacity-70" title={log.entity_id}>#{log.entity_id.slice(0, 6)}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-muted-foreground">
                                        {/* We might need to join with profiles to get names, but actor_id is a start */}
                                        {log.actor_id ? <span className="font-mono text-xs">{log.actor_id.slice(0, 8)}...</span> : 'System'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right">
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <button className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
                                                        <FileJson className="h-4 w-4" />
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Audit Log Details</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="mt-2 max-h-[60vh] overflow-y-auto rounded bg-muted p-4">
                                                        <pre className="text-xs font-mono whitespace-pre-wrap">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {maxPage > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-muted-foreground">Page {page} of {maxPage}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                            disabled={page >= maxPage || loading}
                            className="rounded p-1.5 hover:bg-muted disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
