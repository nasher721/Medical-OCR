'use client';

import { useState } from 'react';
import { ConfidenceBadge } from './confidence-badge';
import type { ExtractionField } from '@/lib/supabase/types';

interface FieldListProps {
  fields: ExtractionField[];
  activeFieldId: string | null;
  onFieldClick: (field: ExtractionField) => void;
  onFieldEdit: (fieldId: string, value: string) => void;
}

export function FieldList({ fields, activeFieldId, onFieldClick, onFieldEdit }: FieldListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field: ExtractionField) => {
    setEditingId(field.id);
    setEditValue(field.value);
  };

  const saveEdit = (fieldId: string) => {
    onFieldEdit(fieldId, editValue);
    setEditingId(null);
  };

  const formatKey = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-1">
      {fields.map((field) => (
        <div
          key={field.id}
          onClick={() => onFieldClick(field)}
          className={`cursor-pointer rounded-lg border p-3 transition-all ${
            activeFieldId === field.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-transparent hover:border-border hover:bg-muted/50'
          }`}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{formatKey(field.key)}</span>
            <ConfidenceBadge confidence={field.confidence} />
          </div>
          {editingId === field.id ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => saveEdit(field.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(field.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              autoFocus
              className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
            />
          ) : (
            <div
              onClick={(e) => { e.stopPropagation(); startEdit(field); }}
              className="cursor-text rounded px-2 py-1 text-sm font-medium hover:bg-muted"
            >
              {field.value || <span className="italic text-muted-foreground">Empty</span>}
            </div>
          )}
          {field.edited_by && (
            <span className="mt-1 text-xs text-blue-600">Edited</span>
          )}
        </div>
      ))}
    </div>
  );
}
