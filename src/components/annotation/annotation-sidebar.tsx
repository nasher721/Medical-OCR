'use client';

import type { Annotation, FieldSchema } from '@/lib/supabase/types';
import { ListChecks } from 'lucide-react';

interface AnnotationSidebarProps {
  annotations: Annotation[];
  schema: FieldSchema[];
  activeAnnotationId: string | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onUpdateAnnotation: (annotationId: string, payload: Partial<Annotation>) => void;
}

export function AnnotationSidebar({
  annotations,
  schema,
  activeAnnotationId,
  onSelectAnnotation,
  onUpdateAnnotation,
}: AnnotationSidebarProps) {
  const schemaOptions = schema.map((field) => field.key);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ListChecks className="h-4 w-4" />
        Annotations ({annotations.length})
      </div>
      <div className="mt-3 space-y-3">
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className={`rounded-md border p-3 text-xs ${annotation.id === activeAnnotationId ? 'border-primary bg-primary/10' : ''}`}
          >
            <button
              type="button"
              onClick={() => onSelectAnnotation(annotation.id)}
              className="w-full text-left"
            >
              <div className="text-xs text-muted-foreground">Field</div>
              <select
                value={annotation.field_key}
                onChange={(event) => onUpdateAnnotation(annotation.id, { field_key: event.target.value })}
                className="mt-1 w-full rounded-md border px-2 py-1 text-xs"
              >
                {schemaOptions.length === 0 && <option value="Unassigned">Unassigned</option>}
                {schemaOptions.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-muted-foreground">Value</div>
              <input
                value={annotation.value}
                onChange={(event) => onUpdateAnnotation(annotation.id, { value: event.target.value })}
                className="mt-1 w-full rounded-md border px-2 py-1 text-xs"
              />
            </button>
          </div>
        ))}
        {annotations.length === 0 && <p className="text-xs text-muted-foreground">Draw a box to create your first annotation.</p>}
      </div>
    </div>
  );
}
