'use client';

import { useState } from 'react';
import type { FieldSchema } from '@/lib/supabase/types';
import { Plus, Merge, Pencil } from 'lucide-react';

interface FieldSchemaBuilderProps {
  fields: FieldSchema[];
  onCreateField: (payload: { key: string; label: string; field_type: string; repeating: boolean; synonyms: string[] }) => void;
  onUpdateField: (fieldId: string, payload: Partial<FieldSchema>) => void;
  onMergeFields: (sourceId: string, targetId: string) => void;
}

export function FieldSchemaBuilder({ fields, onCreateField, onUpdateField, onMergeFields }: FieldSchemaBuilderProps) {
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRepeating, setNewRepeating] = useState(false);
  const [newSynonyms, setNewSynonyms] = useState('');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Plus className="h-4 w-4" />
          Create new field
        </div>
        <div className="mt-3 grid gap-3">
          <input
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="Field key (e.g., Patient_Name)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Label"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <select
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            >
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="number">Number</option>
              <option value="table">Table</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={newRepeating}
                onChange={(event) => setNewRepeating(event.target.checked)}
              />
              Repeating
            </label>
          </div>
          <input
            value={newSynonyms}
            onChange={(event) => setNewSynonyms(event.target.value)}
            placeholder="Synonyms (comma-separated)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (!newKey.trim()) return;
              onCreateField({
                key: newKey.trim(),
                label: newLabel.trim() || newKey.trim(),
                field_type: newType,
                repeating: newRepeating,
                synonyms: newSynonyms.split(',').map((term) => term.trim()).filter(Boolean),
              });
              setNewKey('');
              setNewLabel('');
              setNewType('text');
              setNewRepeating(false);
              setNewSynonyms('');
            }}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            Add Field
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Merge className="h-4 w-4" />
          Merge fields
        </div>
        <div className="mt-3 grid gap-2">
          <select
            value={mergeSource}
            onChange={(event) => setMergeSource(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Source field</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.key}
              </option>
            ))}
          </select>
          <select
            value={mergeTarget}
            onChange={(event) => setMergeTarget(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Target field</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.key}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!mergeSource || !mergeTarget) return;
              onMergeFields(mergeSource, mergeTarget);
              setMergeSource('');
              setMergeTarget('');
            }}
            className="rounded-md border px-3 py-2 text-sm font-medium text-slate-700"
          >
            Merge
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Pencil className="h-4 w-4" />
          Active schema
        </div>
        <div className="mt-3 space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{field.key}</div>
                  <div className="text-xs text-muted-foreground">{field.label}</div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={field.repeating}
                    onChange={(event) => onUpdateField(field.id, { repeating: event.target.checked })}
                  />
                  Repeating
                </label>
              </div>
              <input
                value={field.label}
                onChange={(event) => onUpdateField(field.id, { label: event.target.value })}
                className="mt-2 w-full rounded-md border px-2 py-1 text-xs"
              />
              <input
                value={field.synonyms.join(', ')}
                onChange={(event) =>
                  onUpdateField(field.id, { synonyms: event.target.value.split(',').map((term) => term.trim()).filter(Boolean) })
                }
                className="mt-2 w-full rounded-md border px-2 py-1 text-xs"
                placeholder="Synonyms"
              />
            </div>
          ))}
          {fields.length === 0 && <p className="text-xs text-muted-foreground">No fields defined yet.</p>}
        </div>
      </div>
    </div>
  );
}
