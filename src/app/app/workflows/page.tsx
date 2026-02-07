'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import type { Workflow } from '@/lib/supabase/types';
import { GitBranch, Plus, Play, Settings } from 'lucide-react';

export default function WorkflowsPage() {
  const supabase = createClient();
  const { currentOrg } = useOrgStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDocType, setNewDocType] = useState('invoice');
  const [creating, setCreating] = useState(false);

  const fetchWorkflows = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from('workflows')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });
    setWorkflows(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, [currentOrg]);

  const handleCreate = async () => {
    if (!currentOrg || !newName.trim()) return;
    setCreating(true);
    await supabase.from('workflows').insert({
      org_id: currentOrg.id,
      name: newName.trim(),
      doc_type: newDocType,
    });
    setShowCreate(false);
    setNewName('');
    setCreating(false);
    fetchWorkflows();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('workflows').update({ is_active: !isActive }).eq('id', id);
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: !isActive } : w));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground">Automate document processing pipelines</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Create Workflow
        </button>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Doc Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Active</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b"><td className="px-4 py-3" colSpan={5}><div className="h-4 w-full animate-pulse rounded bg-muted" /></td></tr>
              ))
            ) : workflows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <GitBranch className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No workflows yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first workflow to automate document processing</p>
              </td></tr>
            ) : workflows.map(wf => (
              <tr key={wf.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{wf.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{wf.doc_type}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(wf.id, wf.is_active)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wf.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${wf.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: wf.is_active ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(wf.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/app/workflows/${wf.id}`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10">
                    <Settings className="h-3.5 w-3.5" /> Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Create Workflow</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Workflow Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Invoice Processing" className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Document Type</label>
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2 text-sm">
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="form">Form</option>
                  <option value="other">Other</option>
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
