'use client';

import { useEffect, useState } from 'react';
import { useOrgStore } from '@/lib/hooks/use-org';
import { BarChart3, FileText, CheckCircle, Clock, Edit3, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
  total_documents: number;
  status_breakdown: Record<string, number>;
  stp_rate: number;
  avg_review_time_seconds: number;
  edit_rate: number;
  field_edit_counts: Record<string, number>;
  documents_per_day: Array<{ date: string; count: number }>;
  pending_review: number;
}

export default function AnalyticsPage() {
  const { currentOrg } = useOrgStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    fetch(`/api/analytics?org_id=${currentOrg.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentOrg]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Documents', String(data.total_documents)],
      ['STP Rate (%)', String(data.stp_rate)],
      ['Avg Review Time (s)', String(data.avg_review_time_seconds)],
      ['Edit Rate (%)', String(data.edit_rate)],
      ...Object.entries(data.status_breakdown).map(([k, v]) => [`Status: ${k}`, String(v)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_export.csv';
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-muted-foreground">Failed to load analytics</div>;
  }

  const fieldEditData = Object.entries(data.field_edit_counts).map(([key, count]) => ({ name: key.replace(/_/g, ' '), count }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Document processing metrics and insights</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Total Documents</span>
          </div>
          <p className="text-3xl font-bold">{data.total_documents}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">STP Rate</span>
          </div>
          <p className="text-3xl font-bold">{data.stp_rate}%</p>
          <p className="text-xs text-muted-foreground">Auto-approved documents</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Review Time</span>
          </div>
          <p className="text-3xl font-bold">{data.avg_review_time_seconds}s</p>
          <p className="text-xs text-muted-foreground">Time to approve/reject</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Edit3 className="h-4 w-4" />
            <span className="text-sm font-medium">Edit Rate</span>
          </div>
          <p className="text-3xl font-bold">{data.edit_rate}%</p>
          <p className="text-xs text-muted-foreground">Fields corrected by reviewers</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-semibold">Documents Per Day</h3>
          {data.documents_per_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.documents_per_day}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No data yet</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-semibold">Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(data.status_breakdown).map(([status, count]) => {
              const pct = data.total_documents > 0 ? (count / data.total_documents) * 100 : 0;
              const colorMap: Record<string, string> = {
                approved: 'bg-green-500', needs_review: 'bg-amber-500', rejected: 'bg-red-500',
                exported: 'bg-purple-500', processing: 'bg-blue-500', uploaded: 'bg-slate-400',
              };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-28 text-sm capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex-1 rounded-full bg-muted">
                    <div className={`h-4 rounded-full ${colorMap[status] || 'bg-slate-400'}`} style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {fieldEditData.length > 0 && (
          <div className="rounded-xl border bg-card p-5 lg:col-span-2">
            <h3 className="mb-4 font-semibold">Field Edit Rates</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fieldEditData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
