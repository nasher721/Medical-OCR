'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrgStore } from '@/lib/hooks/use-org';
import type { Model } from '@/lib/supabase/types';
import { Brain, Plus } from 'lucide-react';

export default function ModelsPage() {
  const { currentOrg } = useOrgStore();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('invoice');
  const [creating, setCreating] = useState(false);

  const fetchModels = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const resp = await fetch(`/api/models?org_id=${currentOrg.id}`);
    if (resp.ok) {
      const data = await resp.json();
      setModels(data.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchModels(); }, [currentOrg]);

  const handleCreate = async () => {
    if (!currentOrg || !newName.trim()) return;
    setCreating(true);

    const defaultFields = newType === 'invoice' ? [
      { key: 'invoice_number', label: 'Invoice Number', field_type: 'text', required: true },
      { key: 'invoice_date', label: 'Invoice Date', field_type: 'date', required: true },
      { key: 'vendor_name', label: 'Vendor Name', field_type: 'text', required: true },
      { key: 'total_amount', label: 'Total Amount', field_type: 'number', required: true },
      { key: 'tax_amount', label: 'Tax Amount', field_type: 'number', required: false },
      { key: 'due_date', label: 'Due Date', field_type: 'date', required: false },
      { key: 'po_number', label: 'PO Number', field_type: 'text', required: false },
      { key: 'payment_terms', label: 'Payment Terms', field_type: 'text', required: false },
    ] : [];

    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: currentOrg.id, name: newName, type: newType, fields: defaultFields }),
    });

    setShowCreate(false);
    setNewName('');
    setCreating(false);
    fetchModels();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Models</h1>
          <p className="text-sm text-muted-foreground">Manage extraction models and field schemas</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Create Model
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Brain className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No models yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first extraction model to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map(model => (
            <Link key={model.id} href={`/app/models/${model.id}`} className="group rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary">{model.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{model.type}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Version {model.active_version}</span>
                <span>{new Date(model.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Model</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Model Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Invoice Model" className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="form">Form</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
