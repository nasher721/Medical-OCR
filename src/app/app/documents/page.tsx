'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgStore } from '@/lib/hooks/use-org';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/documents/status-badge';
import { UploadDialog } from '@/components/documents/upload-dialog';
import type { Document, DocumentStatus, FilterPreset, Model } from '@/lib/supabase/types';
import { DocumentService } from '@/lib/services/document-service';
import { FileText, Upload, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

type BulkAction = 'approve' | 'reject' | 'reprocess' | 'delete';

const bulkActionLabels: Record<BulkAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  reprocess: 'Re-process',
  delete: 'Delete',
};

type UploaderOption = {
  id: string;
  label: string;
};



type FilterPresetPayload = {
  full_text: string;
  status: string;
  doc_types: string[];
  uploader_id: string;
  model_id: string;
  confidence_min: number;
  confidence_max: number;
  date_from: string;
  date_to: string;
};

function DocumentsContent() {
  const { currentOrg } = useOrgStore();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [docTypeFilters, setDocTypeFilters] = useState<string[]>([]);
  const [uploaderFilter, setUploaderFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [confidenceMax, setConfidenceMax] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [models, setModels] = useState<Pick<Model, 'id' | 'name'>[]>([]);
  const [uploaders, setUploaders] = useState<UploaderOption[]>([]);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [presetName, setPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const limit = 20;

  const fetchDocuments = async () => {
    if (!currentOrg) return;
    setLoading(true);

    try {
      const response = await DocumentService.search({
        org_id: currentOrg.id,
        page: page,
        limit: limit,
        full_text: search || undefined,
        status: statusFilter || undefined,
        doc_type: docTypeFilters.length > 0 ? docTypeFilters : undefined,
        uploader_id: uploaderFilter || undefined,
        model_id: modelFilter || undefined,
        confidence_min: confidenceMin !== 0 ? confidenceMin : undefined,
        confidence_max: confidenceMax !== 1 ? confidenceMax : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      setDocuments(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Optional: Add toast error here if needed, but existing code didn't have much error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [
    currentOrg,
    page,
    search,
    statusFilter,
    docTypeFilters,
    uploaderFilter,
    modelFilter,
    confidenceMin,
    confidenceMax,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (!searchParams) return;
    const searchValue = searchParams.get('full_text') ?? searchParams.get('search') ?? '';
    setSearchInput(searchValue);
    setSearch(searchValue);
    setStatusFilter(searchParams.get('status') ?? '');
    const docTypesFromQuery = searchParams.get('doc_type')?.split(',').filter(Boolean) ?? [];
    setDocTypeFilters(docTypesFromQuery);
    setUploaderFilter(searchParams.get('uploader_id') ?? '');
    setModelFilter(searchParams.get('model_id') ?? '');
    const minParamStr = searchParams.get('confidence_min');
    const maxParamStr = searchParams.get('confidence_max');
    setConfidenceMin(minParamStr !== null ? Number(minParamStr) : 0);
    setConfidenceMax(maxParamStr !== null ? Number(maxParamStr) : 1);
    setDateFrom(searchParams.get('date_from') ?? '');
    setDateTo(searchParams.get('date_to') ?? '');
    const pageParam = Number(searchParams.get('page') || '1');
    setPage(Number.isNaN(pageParam) ? 1 : pageParam);
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    if (search) params.set('full_text', search);
    if (statusFilter) params.set('status', statusFilter);
    if (docTypeFilters.length > 0) params.set('doc_type', docTypeFilters.join(','));
    if (uploaderFilter) params.set('uploader_id', uploaderFilter);
    if (modelFilter) params.set('model_id', modelFilter);
    if (confidenceMin !== 0) params.set('confidence_min', confidenceMin.toString());
    if (confidenceMax !== 1) params.set('confidence_max', confidenceMax.toString());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (page > 1) params.set('page', page.toString());
    const queryString = params.toString();
    router.replace(queryString ? `/app/documents?${queryString}` : '/app/documents', { scroll: false });
  }, [
    hydrated,
    search,
    statusFilter,
    docTypeFilters,
    uploaderFilter,
    modelFilter,
    confidenceMin,
    confidenceMax,
    dateFrom,
    dateTo,
    page,
    router,
  ]);

  useEffect(() => {
    if (!currentOrg) return;
    const loadMetadata = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      setUserId(user?.id ?? null);

      const { data: docTypeData } = await supabase
        .from('documents')
        .select('doc_type')
        .eq('org_id', currentOrg.id);
      const uniqueDocTypes = Array.from(new Set((docTypeData || []).map((row) => row.doc_type))).sort();
      setDocTypes(uniqueDocTypes);

      const { data: modelData } = await supabase
        .from('models')
        .select('id,name')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });
      setModels(modelData || []);

      const { data: membershipData } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', currentOrg.id);
      const uploaderIds = Array.from(new Set((membershipData || []).map((row) => row.user_id)));
      if (uploaderIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', uploaderIds);
        const profileMap = new Map((profileData || []).map((profile) => [profile.user_id, profile.display_name]));
        const uploaderOptions = uploaderIds.map((id) => ({
          id,
          label: profileMap.get(id) || `${id.slice(0, 8)}...`,
        }));
        setUploaders(uploaderOptions);
      } else {
        setUploaders([]);
      }

      if (user?.id) {
        const { data: presetData } = await supabase
          .from('filter_presets')
          .select('*')
          .eq('org_id', currentOrg.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setPresets(presetData || []);
      } else {
        setPresets([]);
      }
    };

    loadMetadata();
  }, [currentOrg, supabase]);

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
    setSearch(searchInput);
  };

  const handlePresetSelect = (presetId: string) => {
    setActivePresetId(presetId);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    const filters = preset.filters as Partial<FilterPresetPayload>;
    const nextSearch = filters.full_text ?? '';
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setStatusFilter(filters.status ?? '');
    setDocTypeFilters(filters.doc_types ?? []);
    setUploaderFilter(filters.uploader_id ?? '');
    setModelFilter(filters.model_id ?? '');
    setConfidenceMin(typeof filters.confidence_min === 'number' ? filters.confidence_min : 0);
    setConfidenceMax(typeof filters.confidence_max === 'number' ? filters.confidence_max : 1);
    setDateFrom(filters.date_from ?? '');
    setDateTo(filters.date_to ?? '');
    setPage(1);
    setPresetName(preset.name);
  };

  const handleSavePreset = async () => {
    if (!currentOrg || !userId || !presetName.trim()) return;
    setSavingPreset(true);
    const payload: FilterPresetPayload = {
      full_text: search,
      status: statusFilter,
      doc_types: docTypeFilters,
      uploader_id: uploaderFilter,
      model_id: modelFilter,
      confidence_min: confidenceMin,
      confidence_max: confidenceMax,
      date_from: dateFrom,
      date_to: dateTo,
    };
    await supabase
      .from('filter_presets')
      .upsert(
        {
          org_id: currentOrg.id,
          user_id: userId,
          name: presetName.trim(),
          filters: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,name' }
      );
    const { data: presetData } = await supabase
      .from('filter_presets')
      .select('*')
      .eq('org_id', currentOrg.id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPresets(presetData || []);
    setSavingPreset(false);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStatusFilter('');
    setDocTypeFilters([]);
    setUploaderFilter('');
    setModelFilter('');
    setConfidenceMin(0);
    setConfidenceMax(1);
    setDateFrom('');
    setDateTo('');
    setActivePresetId('');
    setPresetName('');
    setPage(1);
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
      <div className="mb-4 space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Saved filters</label>
              <select
                value={activePresetId}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select preset</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Preset name</label>
              <input
                type="text"
                placeholder="Name this filter set..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSavePreset}
              disabled={savingPreset || !presetName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingPreset ? 'Saving...' : 'Save Preset'}
            </button>
            <button
              onClick={handleClearFilters}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={handleSearch} className="relative lg:col-span-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full-text search</label>
              <Search className="absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search extracted text..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-20 text-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-[30px] rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Search
              </button>
            </form>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Document Types</label>
              <select
                multiple
                value={docTypeFilters}
                onChange={(e) => {
                  const selections = Array.from(e.target.selectedOptions).map((option) => option.value);
                  setDocTypeFilters(selections);
                  setPage(1);
                }}
                className="h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {docTypes.length === 0 && (
                  <option disabled>No document types</option>
                )}
                {docTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Uploader</label>
              <select
                value={uploaderFilter}
                onChange={(e) => { setUploaderFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Uploaders</option>
                {uploaders.map((uploader) => (
                  <option key={uploader.id} value={uploader.id}>{uploader.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
              <select
                value={modelFilter}
                onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Models</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mb-3 block text-xs font-medium text-muted-foreground">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags</label>
              <input
                type="text"
                placeholder="Enter tags (comma separated)"
                value={tags.join(', ')}
                onChange={(e) => setTags(e.target.value.split(', '))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-10 text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Confidence range</label>
              <div className="flex flex-col gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={confidenceMin}
                  onChange={(e) => {
                    const nextValue = Math.min(Number(e.target.value), confidenceMax);
                    setConfidenceMin(nextValue);
                    setPage(1);
                  }}
                  className="w-full accent-primary"
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={confidenceMax}
                  onChange={(e) => {
                    const nextValue = Math.max(Number(e.target.value), confidenceMin);
                    setConfidenceMax(nextValue);
                    setPage(1);
                  }}
                  className="w-full accent-primary"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {confidenceMin.toFixed(2)} – {confidenceMax.toFixed(2)}
              </p>
            </div>
          </div>
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${action === 'delete'
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
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
