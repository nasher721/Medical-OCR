import { useState } from 'react';
import { ValidationPanel } from './validation-panel';
import { CommentPanel } from './comment-panel';
import { CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';


interface SidePanelProps {
    documentId: string | null;
    orgId: string;
    onApprove: (id: string, data: Record<string, unknown>) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

type Tab = 'validation' | 'comments';

export function SidePanel({ documentId, orgId, onApprove, onReject }: SidePanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('validation');

    return (
        <div className="flex h-full w-96 flex-col border-l bg-background">
            <div className="flex items-center border-b px-2">
                <button
                    onClick={() => setActiveTab('validation')}
                    className={cn(
                        "flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
                        activeTab === 'validation'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <CheckSquare className="h-4 w-4" />
                    Validation
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                        "flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors",
                        activeTab === 'comments'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <MessageSquare className="h-4 w-4" />
                    Comments
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className={cn("absolute inset-0 flex flex-col", activeTab === 'validation' ? "z-10" : "z-0 hidden")}>
                    <ValidationPanel
                        documentId={documentId}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                </div>
                <div className={cn("absolute inset-0 flex flex-col", activeTab === 'comments' ? "z-10" : "z-0 hidden")}>
                    <CommentPanel
                        documentId={documentId}
                        orgId={orgId}
                    />
                </div>
            </div>
        </div>
    );
}
