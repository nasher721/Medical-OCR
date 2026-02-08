'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useOrgStore } from '@/lib/hooks/use-org';
import { StatusBadge } from '@/components/documents/status-badge';
import { UploadDialog } from '@/components/documents/upload-dialog';
import type { Document, DocumentStatus } from '@/lib/supabase/types';
import { FileText, Upload, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

type BulkAction = 'approve' | 'reject' | 'reprocess' | 'delete';

const bulkActionLabels: Record<BulkAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  reprocess: 'Re-process',
  delete: 'Delete',
};

export default function DocumentsPage() {
  const { currentOrg } = useOrgStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const limit = 20;

  const fetchDocuments = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const params = new URLSearchParams({
      org_id: currentOrg.id,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    const resp = await fetch(`/api/documents?${params}`);
    if (resp.ok) {
      const data = await resp.json();
      setDocuments(data.data || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [currentOrg, page, statusFilter]);

  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      const available = new Set(documents.map(doc => doc.id));
      prev.forEach(id => {
        if (available.has(id)) next.add(id);
      });
      return next;
    });
  }, [documents]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    const allSelected = documents.length > 0 && documents.every(doc => selectedIds.has(doc.id));
    const isIndeterminate = selectedIds.size > 0 && !allSelected;
    selectAllRef.current.indeterminate = isIndeterminate;
  }, [documents, selectedIds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const selectedCount = selectedIds.size;
  const allSelected = documents.length > 0 && documents.every(doc => selectedIds.has(doc.id));

  const bulkSummary = useMemo(() => {
    if (!bulkAction) return '';
    return `${bulkActionLabels[bulkAction]} ${selectedCount} document${selectedCount === 1 ? '' : 's'}`;
  }, [bulkAction, selectedCount]);

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (documents.length === 0) return prev;
      if (allSelected) {
        return new Set();
      }
      return new Set(documents.map(doc => doc.id));
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkSubmitting(true);
    setBulkStatus(`Running ${bulkActionLabels[bulkAction]} on ${selectedIds.size} documents...`);
    const resp = await fetch('/api/documents/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: bulkAction,
        document_ids: Array.from(selectedIds),
      }),
    });
    if (resp.ok) {
      setSelectedIds(new Set());
      await fetchDocuments();
    }
    setBulkSubmitting(false);
    setBulkAction(null);
    setBulkStatus('');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">{total} documents total</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="exported">Exported</option>
          </select>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{selectedCount} selected</p>
            {bulkSubmitting && bulkStatus && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <span>{bulkStatus}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['approve', 'reject', 'reprocess', 'delete'] as BulkAction[]).map((action) => (
              <button
                key={action}
                onClick={() => setBulkAction(action)}
                disabled={bulkSubmitting}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  action === 'delete'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                    : 'border border-input hover:bg-muted'
                }`}
              >
                {bulkActionLabels[action]} Selected
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all documents"
                  className="h-4 w-4 rounded border border-input text-primary focus:ring-1 focus:ring-primary"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Filename</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><div className="h-4 w-4 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-48 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-24 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                </tr>
              ))
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">No documents found</p>
                  <p className="mt-1 text-xs text-muted-foreground">Upload your first document to get started</p>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      aria-label={`Select ${doc.filename}`}
                      className="h-4 w-4 rounded border border-input text-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{doc.doc_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status as DocumentStatus} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/documents/${doc.id}`}
                      className="rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md p-1.5 hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md p-1.5 hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <UploadDialog open={showUpload} onClose={() => setShowUpload(false)} onUploaded={fetchDocuments} />

      {bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Confirm Bulk Action</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;re about to {bulkSummary.toLowerCase()}. This action will apply to the selected documents.
            </p>
            <div className="mt-4 rounded-lg border border-dashed px-3 py-2 text-sm">
              {bulkSummary}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setBulkAction(null)}
                disabled={bulkSubmitting}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={bulkSubmitting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {bulkSubmitting ? 'Working...' : `${bulkActionLabels[bulkAction]} ${selectedCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
