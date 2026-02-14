'use client';

import { Document } from '@/lib/supabase/types';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ZoomIn, ZoomOut, RotateCw, Download, FileWarning } from 'lucide-react';

interface DocumentViewerProps {
    document: Document | null;
    extraction: unknown;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!document?.storage_path) {
            setSignedUrl(null);
            return;
        }

        const fetchSignedUrl = async () => {
            setLoading(true);
            setError(null);
            try {
                const supabase = createClient();
                const { data, error: urlError } = await supabase.storage
                    .from('documents')
                    .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

                if (urlError) throw urlError;
                setSignedUrl(data.signedUrl);
            } catch (err: unknown) {
                console.error('Failed to get signed URL:', err);
                setError('Failed to load document. The file may have been moved or deleted.');
            } finally {
                setLoading(false);
            }
        };

        fetchSignedUrl();
        setZoom(1);
        setRotation(0);
    }, [document?.id, document?.storage_path]);

    if (!document) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-muted/5">
                <p className="text-muted-foreground">Select a document to review</p>
            </div>
        );
    }

    const isPdf = document.mime_type === 'application/pdf' || document.filename?.endsWith('.pdf');
    const isImage = document.mime_type?.startsWith('image/') ||
        /\.(png|jpg|jpeg|gif|webp|tiff|bmp)$/i.test(document.filename || '');

    return (
        <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-muted/20">
            {/* Toolbar */}
            <div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-sm font-semibold truncate">{document.filename}</h2>
                    <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {document.mime_type?.split('/')[1] || 'unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {isImage && (
                        <>
                            <button
                                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Zoom out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Zoom in"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Rotate"
                            >
                                <RotateCw className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    {signedUrl && (
                        <a
                            href={signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Download / Open in new tab"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto pt-14">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                        <FileWarning className="h-12 w-12 opacity-30" />
                        <p className="text-sm">{error}</p>
                        <p className="text-xs break-all max-w-md text-center opacity-60">{document.storage_path}</p>
                    </div>
                ) : signedUrl ? (
                    <div className="flex min-h-full items-start justify-center p-4">
                        {isPdf ? (
                            <iframe
                                src={`${signedUrl}#toolbar=1&navpanes=0`}
                                className="w-full h-full min-h-[calc(100vh-8rem)] rounded-lg border shadow-sm bg-white"
                                title={document.filename}
                            />
                        ) : isImage ? (
                            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                                <img
                                    src={signedUrl}
                                    alt={document.filename}
                                    className="max-w-full rounded-lg shadow-sm transition-transform duration-200"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transformOrigin: 'center center',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground min-h-[calc(100vh-8rem)]">
                                <FileWarning className="h-12 w-12 opacity-30" />
                                <p className="text-sm">Preview not available for this file type</p>
                                <a
                                    href={signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    Open in new tab
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground min-h-[calc(100vh-8rem)]">
                        <FileWarning className="h-12 w-12 opacity-30" />
                        <p className="text-sm">No preview available</p>
                        <p className="text-xs break-all max-w-md text-center opacity-60">{document.storage_path}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
