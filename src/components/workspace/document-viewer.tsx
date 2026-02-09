'use client';

import { Document, Extraction } from '@/lib/supabase/types';


interface DocumentViewerProps {
    document: Document | null;
    extraction: Extraction | null;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
    if (!document) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-muted/5">
                <p className="text-muted-foreground">Select a document to review</p>
            </div>
        );
    }

    return (
        <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-muted/20">
            <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
                <h2 className="text-sm font-semibold truncate">{document.filename}</h2>
                <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8">
                {/* 
            TODO: Render the actual PDF or Image here.
            For now, we will assume an image rendering or a PDF viewer.
            Since Supabase Storage paths are available, we can fetch a signed URL.
         */}
                <div className="mx-auto max-w-3xl rounded-lg border bg-white p-12 shadow-sm min-h-[800px] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Document Preview Placeholder</p>
                        <p className="text-xs text-muted-foreground break-all mt-2">{document.storage_path}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
