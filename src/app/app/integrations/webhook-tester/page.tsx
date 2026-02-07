'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import type { WebhookReceipt } from '@/lib/supabase/types';
import { ArrowLeft, RefreshCw, Trash2, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import Link from 'next/link';

export default function WebhookTesterPage() {
  const supabase = createClient();
  const { currentOrg } = useOrgStore();
  const [receipts, setReceipts] = useState<WebhookReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReceipts = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('webhook_receipts')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('received_at', { ascending: false })
      .limit(50);
    setReceipts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReceipts(); }, [currentOrg]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchReceipts, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, currentOrg]);

  const handleClear = async () => {
    if (!currentOrg) return;
    for (const r of receipts) {
      await supabase.from('webhook_receipts').delete().eq('id', r.id);
    }
    setReceipts([]);
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook-receiver`
    : '/api/webhook-receiver';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/app/integrations" className="rounded-md p-1.5 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Webhook Tester</h1>
          <p className="text-sm text-muted-foreground">Receive and inspect webhook payloads</p>
        </div>
      </div>

      {/* Endpoint info */}
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium">Webhook Endpoint:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm font-mono text-green-400">
            POST {webhookUrl}
          </code>
          <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="rounded p-2 hover:bg-muted"><Copy className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Include <code className="rounded bg-muted px-1">org_id</code> in the JSON payload or <code className="rounded bg-muted px-1">x-org-id</code> header.
          Use this URL in your workflow webhook export nodes.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={fetchReceipts} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <label className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" style={{ transform: autoRefresh ? 'translateX(18px)' : 'translateX(2px)' }} />
            </button>
            Auto-refresh (5s)
          </label>
        </div>
        <button onClick={handleClear} disabled={receipts.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" /> Clear All
        </button>
      </div>

      {/* Receipts */}
      <div className="rounded-lg border">
        {loading ? (
          <div className="p-8 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : receipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No webhook payloads received yet. Configure a webhook export in your workflow and run it.
          </div>
        ) : (
          receipts.map(r => (
            <div key={r.id} className="border-b last:border-0">
              <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
                {expandedId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">POST</span>
                <span className="flex-1 text-sm font-medium">{r.id.slice(0, 8)}...</span>
                <span className="text-xs text-muted-foreground">{new Date(r.received_at).toLocaleString()}</span>
              </button>
              {expandedId === r.id && (
                <div className="border-t bg-muted/20 p-4">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-400">
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
