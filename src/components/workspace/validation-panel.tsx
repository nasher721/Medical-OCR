'use client';

import { Extraction, ExtractionField } from '@/lib/supabase/types';
import { useState, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationPanelProps {
    documentId: string | null;
    onApprove: (id: string, data: any) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

export function ValidationPanel({ documentId, onApprove, onReject }: ValidationPanelProps) {
    const [fields, setFields] = useState<ExtractionField[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!documentId) {
            setFields([]);
            return;
        }
        // TODO: Fetch fields from API/RPC
        // Mocking for now
        setLoading(true);
        setTimeout(() => {
            setFields([
                { id: '1', key: 'invoice_number', value: 'INV-001', confidence: 0.98 } as any,
                { id: '2', key: 'date', value: '2023-10-25', confidence: 0.85 } as any,
                { id: '3', key: 'total_amount', value: '$1,250.00', confidence: 0.60 } as any,
            ]);
            setLoading(false);
        }, 500);
    }, [documentId]);


    if (!documentId) {
        return <div className="w-80 border-l bg-background p-4 text-center text-muted-foreground">No document selected</div>;
    }

    if (loading) {
        return (
            <div className="flex w-80 items-center justify-center border-l bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex w-96 flex-col border-l bg-background">
            <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">Validation</h2>
                <div className="flex gap-2">
                    {/* Quick Actions */}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                    {fields.map((field, idx) => (
                        <div key={field.id} className="space-y-1.5 animation-delay-[100ms]" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium uppercase text-muted-foreground">{field.key.replace('_', ' ')}</label>
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                    field.confidence > 0.9 ? "bg-green-100 text-green-700" :
                                        field.confidence > 0.7 ? "bg-yellow-100 text-yellow-700" :
                                            "bg-red-100 text-red-700"
                                )}>{Math.round(field.confidence * 100)}%</span>
                            </div>
                            <input
                                type="text"
                                defaultValue={field.value}
                                className={cn(
                                    "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1",
                                    field.confidence < 0.8 ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500" : "border-input focus:ring-primary"
                                )}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t bg-muted/10 p-4">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onReject(documentId)}
                        disabled={saving}
                        className="flex justify-center items-center gap-2 rounded-lg border border-transparent bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                        Reject
                    </button>
                    <button
                        onClick={() => onApprove(documentId, {})}
                        disabled={saving}
                        className="flex justify-center items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                    </button>
                </div>
            </div>
        </div>
    );
}
