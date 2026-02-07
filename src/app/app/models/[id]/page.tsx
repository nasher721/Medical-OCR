'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Model, ModelVersion, ModelField, TrainingExample } from '@/lib/supabase/types';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

interface ModelDetail {
  model: Model;
  versions: ModelVersion[];
  fields: ModelField[];
  training_count: number;
  training_examples: TrainingExample[];
}

export default function ModelDetailPage() {
  const params = useParams();
  const modelId = params.id as string;
  const [data, setData] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schema' | 'training' | 'metrics'>('schema');
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Array<{ key: string; label: string; field_type: string; required: boolean; regex: string }>>([]);
  const [saving, setSaving] = useState(false);

  const fetchModel = async () => {
    setLoading(true);
    const resp = await fetch(`/api/models/${modelId}`);
    if (resp.ok) {
      const d = await resp.json();
      setData(d);
      setEditFields((d.fields || []).map((f: ModelField) => ({ key: f.key, label: f.label, field_type: f.field_type, required: f.required, regex: f.regex || '' })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchModel(); }, [modelId]);

  const handleSaveSchema = async () => {
    setSaving(true);
    await fetch(`/api/models/${modelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: editFields }),
    });
    setEditing(false);
    setSaving(false);
    fetchModel();
  };

  const addField = () => {
    setEditFields(prev => [...prev, { key: '', label: '', field_type: 'text', required: false, regex: '' }]);
  };

  const removeField = (idx: number) => {
    setEditFields(prev => prev.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, updates: Partial<typeof editFields[0]>) => {
    setEditFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-muted-foreground">Model not found</div>;
  }

  const { model, fields, training_count, training_examples } = data;

  // Compute metrics
  const fieldExampleCounts: Record<string, number> = {};
  training_examples.forEach(te => {
    fieldExampleCounts[te.field_key] = (fieldExampleCounts[te.field_key] || 0) + 1;
  });
  const maxExamples = Math.max(1, ...Object.values(fieldExampleCounts));
  const health = training_count > 50 ? 'Good' : training_count > 20 ? 'Fair' : 'Needs Data';
  const healthColor = training_count > 50 ? 'text-green-600' : training_count > 20 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/app/models" className="rounded-md p-1.5 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-2xl font-bold">{model.name}</h1>
          <p className="text-sm text-muted-foreground">Version {model.active_version} &middot; {model.type}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {(['schema', 'training', 'metrics'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'training' ? 'Training Examples' : tab}
          </button>
        ))}
      </div>

      {/* Schema Tab */}
      {activeTab === 'schema' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Field Schema</h2>
            {editing ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
                <button onClick={handleSaveSchema} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save (New Version)'}
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Edit Schema</button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              {editFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                  <input type="text" value={field.key} onChange={e => updateField(idx, { key: e.target.value })} placeholder="key" className="w-32 rounded border px-2 py-1 text-sm" />
                  <input type="text" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="Label" className="flex-1 rounded border px-2 py-1 text-sm" />
                  <select value={field.field_type} onChange={e => updateField(idx, { field_type: e.target.value })} className="rounded border px-2 py-1 text-sm">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="currency">Currency</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} /> Required</label>
                  <input type="text" value={field.regex} onChange={e => updateField(idx, { regex: e.target.value })} placeholder="Regex" className="w-28 rounded border px-2 py-1 text-sm" />
                  <button onClick={() => removeField(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={addField} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                <Plus className="h-3.5 w-3.5" /> Add Field
              </button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left text-sm font-medium">Key</th><th className="px-4 py-2 text-left text-sm font-medium">Label</th><th className="px-4 py-2 text-left text-sm font-medium">Type</th><th className="px-4 py-2 text-left text-sm font-medium">Required</th><th className="px-4 py-2 text-left text-sm font-medium">Regex</th></tr></thead>
                <tbody>
                  {fields.map(f => (
                    <tr key={f.id} className="border-b"><td className="px-4 py-2 text-sm font-mono">{f.key}</td><td className="px-4 py-2 text-sm">{f.label}</td><td className="px-4 py-2 text-sm capitalize">{f.field_type}</td><td className="px-4 py-2 text-sm">{f.required ? <span className="text-red-600">Yes</span> : 'No'}</td><td className="px-4 py-2 text-sm font-mono text-xs">{f.regex || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">{training_count} training examples collected from reviewed documents</p>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left text-sm font-medium">Field</th><th className="px-4 py-2 text-left text-sm font-medium">Correct Value</th><th className="px-4 py-2 text-left text-sm font-medium">Created</th></tr></thead>
              <tbody>
                {training_examples.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">No training examples yet. Approve documents with edits to create training data.</td></tr>
                ) : training_examples.map(te => (
                  <tr key={te.id} className="border-b"><td className="px-4 py-2 text-sm font-mono">{te.field_key}</td><td className="px-4 py-2 text-sm">{te.correct_value}</td><td className="px-4 py-2 text-sm text-muted-foreground">{new Date(te.created_at).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">Training Examples</p><p className="text-2xl font-bold">{training_count}</p></div>
            <div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">Model Health</p><p className={`text-2xl font-bold ${healthColor}`}>{health}</p></div>
            <div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">Active Version</p><p className="text-2xl font-bold">{model.active_version}</p></div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Examples per Field</h3>
            <div className="space-y-2">
              {Object.entries(fieldExampleCounts).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : Object.entries(fieldExampleCounts).sort(([, a], [, b]) => b - a).map(([key, count]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-mono">{key}</span>
                  <div className="flex-1"><div className="h-6 rounded bg-primary/20"><div className="h-6 rounded bg-primary" style={{ width: `${(count / maxExamples) * 100}%` }}><span className="px-2 text-xs font-medium text-primary-foreground leading-6">{count}</span></div></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
