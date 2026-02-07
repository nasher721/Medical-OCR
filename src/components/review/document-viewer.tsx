'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ExtractionField } from '@/lib/supabase/types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface DocumentViewerProps {
  storagePath: string;
  mimeType: string;
  fields: ExtractionField[];
  activeFieldId: string | null;
  onFieldClick: (field: ExtractionField) => void;
}

export function DocumentViewer({ storagePath, mimeType, fields, activeFieldId, onFieldClick }: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [storagePath]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Scroll to active field bbox
  useEffect(() => {
    if (activeFieldId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-field-id="${activeFieldId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFieldId]);

  const pageFields = fields.filter(f => f.page === 1);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="rounded p-1.5 hover:bg-muted" title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[4rem] text-center text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="rounded p-1.5 hover:bg-muted" title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(1)} className="rounded p-1.5 hover:bg-muted" title="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Document area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100 p-4">
        {!url ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </div>
        ) : (
          <div
            className="relative mx-auto shadow-lg"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: 'fit-content',
            }}
          >
            {mimeType === 'application/pdf' ? (
              <iframe
                src={`${url}#toolbar=0`}
                className="h-[800px] w-[600px] bg-white"
                title="Document Preview"
              />
            ) : (
              <img
                ref={imgRef}
                src={url}
                alt="Document"
                onLoad={handleImageLoad}
                className="max-w-[600px] bg-white"
                draggable={false}
              />
            )}

            {/* Bounding box overlays */}
            {pageFields.map((field) => {
              if (!field.bbox) return null;
              const bbox = field.bbox as { x: number; y: number; w: number; h: number };
              const containerW = mimeType === 'application/pdf' ? 600 : (imgSize.width || 600);
              const containerH = mimeType === 'application/pdf' ? 800 : (imgSize.height || 800);
              const isActive = activeFieldId === field.id;

              return (
                <div
                  key={field.id}
                  data-field-id={field.id}
                  onClick={(e) => { e.stopPropagation(); onFieldClick(field); }}
                  className={`absolute cursor-pointer border-2 transition-all ${
                    isActive
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20'
                  }`}
                  style={{
                    left: `${bbox.x * 100}%`,
                    top: `${bbox.y * 100}%`,
                    width: `${bbox.w * 100}%`,
                    height: `${bbox.h * 100}%`,
                  }}
                  title={`${field.key}: ${field.value}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
