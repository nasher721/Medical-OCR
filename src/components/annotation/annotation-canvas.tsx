'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Annotation, OcrToken } from '@/lib/supabase/types';

const PdfViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});

export type AnnotationMode = 'select' | 'draw' | 'table' | 'redact';

export type SuggestionBox = {
  id: string;
  field_key: string;
  value: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  page_number: number;
};

interface AnnotationCanvasProps {
  imageUrl: string | null;
  mimeType?: string;
  tokens: OcrToken[];
  annotations: Annotation[];
  suggestions: SuggestionBox[];
  mode: AnnotationMode;
  zoom: number;
  activeAnnotationId: string | null;
  showPhi: boolean;
  pageNumber?: number;
  onLoadSuccess?: (numPages: number) => void;
  onCreateAnnotation: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
}

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{2}\/\d{2}\/\d{4}\b/,
  /\b[A-Z][a-z]+,\s[A-Z][a-z]+\b/,
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const normalizeBox = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  return { x: clamp(x), y: clamp(y), w: clamp(w), h: clamp(h) };
};

const getTokensInBox = (tokens: OcrToken[], box: { x: number; y: number; w: number; h: number }) => {
  return tokens.filter((token) => {
    const midX = token.bbox.x + token.bbox.w / 2;
    const midY = token.bbox.y + token.bbox.h / 2;
    return midX >= box.x && midX <= box.x + box.w && midY >= box.y && midY <= box.y + box.h;
  });
};

const snapBoxToTokens = (box: { x: number; y: number; w: number; h: number }, tokens: OcrToken[]) => {
  if (tokens.length === 0) return box;
  const minX = Math.min(...tokens.map((t) => t.bbox.x));
  const minY = Math.min(...tokens.map((t) => t.bbox.y));
  const maxX = Math.max(...tokens.map((t) => t.bbox.x + t.bbox.w));
  const maxY = Math.max(...tokens.map((t) => t.bbox.y + t.bbox.h));
  return {
    x: clamp(minX),
    y: clamp(minY),
    w: clamp(maxX - minX),
    h: clamp(maxY - minY),
  };
};


export function AnnotationCanvas({
  imageUrl,
  mimeType,
  tokens,
  annotations,
  suggestions,
  mode,
  zoom,
  activeAnnotationId,
  showPhi,
  pageNumber = 1,
  onLoadSuccess,
  onCreateAnnotation,
  onSelectAnnotation,
}: AnnotationCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const pageTokens = useMemo(() => tokens.filter((token) => token.page_number === pageNumber), [tokens, pageNumber]);
  const pageSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.page_number === pageNumber),
    [suggestions, pageNumber],
  );
  const pageAnnotations = useMemo(() => annotations.filter((annotation) => annotation.page_number === pageNumber), [annotations, pageNumber]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode === 'select') return;
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setDragStart({ x, y });
    setDragCurrent({ x, y });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setDragCurrent({ x, y });
  };

  const handlePointerUp = () => {
    if (!dragStart || !dragCurrent) return;
    const rawBox = normalizeBox(dragStart, dragCurrent);
    const tokensInBox = getTokensInBox(pageTokens, rawBox);
    const snappedBox = snapBoxToTokens(rawBox, tokensInBox);
    const value = tokensInBox.map((token) => token.text).join(' ').trim();
    onCreateAnnotation({
      document_id: '',
      page_number: pageNumber,
      field_key: mode === 'table' ? 'Table' : mode === 'redact' ? 'Redaction' : 'Unassigned',
      value,
      bbox: snappedBox,
      status: 'accepted',
      created_by: null,
    });
    setDragStart(null);
    setDragCurrent(null);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    onLoadSuccess?.(numPages);
  };

  return (
    <div className="relative h-full w-full overflow-auto bg-slate-100 p-6 flex justify-center">
      {!imageUrl ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        </div>
      ) : (
        <div
          className="relative shadow-lg"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            width: 'fit-content'
          }}
        >
          {mimeType === 'application/pdf' ? (
            <PdfViewer
              file={imageUrl}
              pageNumber={pageNumber}
              onLoadSuccess={onDocumentLoadSuccess}
            />
          ) : (
            <img src={imageUrl} alt="Document page" className="max-w-[720px]" draggable={false} />
          )}

          {/* Overlay Layer */}
          <div
            ref={wrapperRef}
            className="absolute inset-0 z-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            role="presentation"
          >
            {pageSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="absolute rounded-md border-2 border-dashed border-violet-400 bg-violet-200/20"
                style={{
                  left: `${suggestion.bbox.x * 100}%`,
                  top: `${suggestion.bbox.y * 100}%`,
                  width: `${suggestion.bbox.w * 100}%`,
                  height: `${suggestion.bbox.h * 100}%`,
                }}
              />
            ))}
            {pageAnnotations.map((annotation) => (
              <button
                key={annotation.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectAnnotation(annotation.id);
                }}
                className={`absolute rounded-md border-2 text-left ${annotation.field_key === 'Redaction'
                  ? 'border-rose-500 bg-rose-500/30'
                  : annotation.id === activeAnnotationId
                    ? 'border-primary bg-primary/15'
                    : 'border-emerald-400/80 bg-emerald-200/20'
                  }`}
                style={{
                  left: `${annotation.bbox.x * 100}%`,
                  top: `${annotation.bbox.y * 100}%`,
                  width: `${annotation.bbox.w * 100}%`,
                  height: `${annotation.bbox.h * 100}%`,
                }}
              >
                <span className="sr-only">{annotation.field_key}</span>
              </button>
            ))}
            {showPhi &&
              pageTokens.map((token) => {
                if (!PHI_PATTERNS.some((pattern) => pattern.test(token.text))) return null;
                return (
                  <div
                    key={`phi-${token.id}`}
                    className="absolute rounded border border-rose-500 bg-rose-500/15"
                    style={{
                      left: `${token.bbox.x * 100}%`,
                      top: `${token.bbox.y * 100}%`,
                      width: `${token.bbox.w * 100}%`,
                      height: `${token.bbox.h * 100}%`,
                    }}
                  />
                );
              })}
            {dragStart && dragCurrent && (
              <div
                className="absolute rounded-md border-2 border-blue-500 bg-blue-200/20"
                style={{
                  left: `${normalizeBox(dragStart, dragCurrent).x * 100}%`,
                  top: `${normalizeBox(dragStart, dragCurrent).y * 100}%`,
                  width: `${normalizeBox(dragStart, dragCurrent).w * 100}%`,
                  height: `${normalizeBox(dragStart, dragCurrent).h * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
