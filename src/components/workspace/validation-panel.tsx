import { ExtractionField } from '@/lib/supabase/types';
import { useState, useEffect } from 'react';
import { Loader2, Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { DocumentService } from '@/lib/services/document-service';
import { RoleGuard } from '@/components/auth/role-guard';
import { useOrgStore } from '@/lib/hooks/use-org';
import { hasRole } from '@/components/auth/role-guard';

interface ValidationPanelProps {
    documentId: string | null;
    onApprove: (id: string, data: Record<string, unknown>) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

export function ValidationPanel({ documentId, onApprove, onReject }: ValidationPanelProps) {
    const [fields, setFields] = useState<ExtractionField[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving] = useState(false);
    const { role } = useOrgStore();

    useKeyboardShortcuts([
        {
            key: 'Enter',
            ctrlKey: true,
            handler: () => {
                if (documentId && hasRole(role, 'reviewer')) onApprove(documentId, {});
            }
        },
        {
            key: 'Backspace',
            ctrlKey: true,
            handler: () => {
                if (documentId && hasRole(role, 'reviewer')) onReject(documentId);
            }
        }
    ]);

    useEffect(() => {
        const fetchDocumentData = async () => {
            if (!documentId) return;
            setLoading(true);
            try {
                const data = await DocumentService.get(documentId);
                setFields((data.fields || []) as unknown as ExtractionField[]);
            } catch (error) {
                console.error('Failed to fetch document fields', error);
            } finally {
                setLoading(false);
            }
        };

        if (documentId) {
            fetchDocumentData();
        } else {
            setFields([]);
        }
    }, [documentId]);

    if (!documentId) {
        return <div className="w-full bg-background p-4 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
            <Info className="h-8 w-8 mb-2 opacity-20" />
            <p>Select a document to validate</p>
        </div>;
    }

    if (loading) {
        return <div className="w-full bg-background p-4 flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>;
    }

    return (
        <TooltipProvider>
            <div className="flex w-full flex-col bg-background h-full">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Validation</h2>
                    <div className="flex gap-2">
                        {/* Quick Actions */}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-4">
                        {fields.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No extracted fields found.</p>
                        ) : fields.map((field, idx) => (
                            <div key={field.id} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">{field.key.replace(/_/g, ' ')}</label>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-help",
                                                field.confidence > 0.9 ? "bg-green-100 text-green-700" :
                                                    field.confidence > 0.7 ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-red-100 text-red-700"
                                            )}>
                                                {field.confidence <= 0.7 && <AlertTriangle className="h-3 w-3" />}
                                                <span>{Math.round(field.confidence * 100)}%</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                            <p>Confidence Score: {Math.round(field.confidence * 100)}%</p>
                                            {field.confidence <= 0.7 && <p className="text-red-400 mt-1 font-medium">Low confidence - please verify carefully.</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        defaultValue={field.value}
                                        className={cn(
                                            "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-1",
                                            field.confidence < 0.8
                                                ? "border-yellow-400/50 bg-yellow-50/10 focus:border-yellow-500 focus:ring-yellow-500"
                                                : "border-input focus:ring-primary"
                                        )}
                                    />
                                    {field.confidence < 0.8 && (
                                        <div className="absolute right-2 top-2.5 text-yellow-500 pointer-events-none">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t bg-muted/10 p-4 mt-auto">
                    <RoleGuard
                        minRole="reviewer"
                        fallback={
                            <div className="flex justify-center p-2 text-sm text-muted-foreground bg-muted/20 rounded">
                                <Info className="h-4 w-4 mr-2" />
                                <span>Read-only mode (Viewer)</span>
                            </div>
                        }
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => onReject(documentId)}
                                        disabled={saving}
                                        className="flex justify-center items-center gap-2 rounded-lg border border-transparent bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Reject Document <kbd className="ml-1 text-xs bg-muted px-1 rounded">Ctrl+Backspace</kbd></p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => onApprove(documentId, {})}
                                        disabled={saving}
                                        className="flex justify-center items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Approve
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Approve Document <kbd className="ml-1 text-xs bg-muted px-1 rounded">Ctrl+Enter</kbd></p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </RoleGuard>
                </div>
            </div>
        </TooltipProvider>
    );
}

