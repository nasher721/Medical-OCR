'use client';

import type { FieldSchema } from '@/lib/supabase/types';
import { CheckCircle, XCircle, Pencil } from 'lucide-react';
import type { SuggestionBox } from '@/components/annotation/annotation-canvas';

interface SuggestionPanelProps {
  suggestions: SuggestionBox[];
  schema: FieldSchema[];
  onAccept: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
  onCorrect: (suggestionId: string, value: string) => void;
}

export function SuggestionPanel({ suggestions, schema, onAccept, onReject, onCorrect }: SuggestionPanelProps) {
  const schemaMap = new Map(schema.map((field) => [field.key, field.label]));

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Suggested field</div>
              <div className="text-sm font-semibold">{schemaMap.get(suggestion.field_key) ?? suggestion.field_key}</div>
            </div>
            <div className="text-xs text-muted-foreground">{Math.round(suggestion.confidence * 100)}%</div>
          </div>
          <p className="mt-2 text-sm text-slate-700">{suggestion.value || 'No text captured'}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAccept(suggestion.id)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
            >
              <CheckCircle className="h-3 w-3" />
              Accept
            </button>
            <button
              type="button"
              onClick={() => onReject(suggestion.id)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => {
                const value = window.prompt('Correct value', suggestion.value);
                if (value !== null) onCorrect(suggestion.id, value);
              }}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-slate-700"
            >
              <Pencil className="h-3 w-3" />
              Correct
            </button>
          </div>
        </div>
      ))}
      {suggestions.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          No auto-suggestions yet. Add 3-5 annotations to unlock ghost boxes.
        </div>
      )}
    </div>
  );
}
