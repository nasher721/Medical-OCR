'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import { DocumentViewer } from '@/components/review/document-viewer';
import { FieldList } from '@/components/review/field-list';
import { CommentsSection } from '@/components/review/comments-section';
import { StatusBadge } from '@/components/documents/status-badge';
import type { Document, ExtractionField, Extraction, ReviewComment, DocumentStatus } from '@/lib/supabase/types';
import { ArrowLeft, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function DocumentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { currentOrg } = useOrgStore();

  const [doc, setDoc] = useState<Document | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [fields, setFields] = useState<ExtractionField[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDocument = async () => {
    setLoading(true);
    const resp = await fetch(`/api/documents/${documentId}`);
    if (resp.ok) {
      const data = await resp.json();
      setDoc(data.document);
      setExtraction(data.extraction);
      setFields(data.fields || []);
      setComments(data.comments || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocument(); }, [documentId]);

  const handleFieldEdit = async (fieldId: string, value: string) => {
    const resp = await fetch(`/api/documents/${documentId}/fields`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, value }),
    });
    if (resp.ok) {
      setFields(prev => prev.map(f => f.id === fieldId ? { ...f, value, edited_by: 'current', edited_at: new Date().toISOString() } : f));
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    const resp = await fetch(`/api/documents/${documentId}/approve`, { method: 'POST' });
    if (resp.ok) {
      setDoc(prev => prev ? { ...prev, status: 'approved' } : prev);
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    setActionLoading(true);
    const resp = await fetch(`/api/documents/${documentId}/reject`, { method: 'POST' });
    if (resp.ok) {
      setDoc(prev => prev ? { ...prev, status: 'rejected' } : prev);
    }
    setActionLoading(false);
  };

  const handleAddComment = async (body: string) => {
    const resp = await fetch(`/api/documents/${documentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (resp.ok) {
      const { data } = await resp.json();
      setComments(prev => [...prev, data]);
    }
  };

  const handleFieldClick = (field: ExtractionField) => {
    setActiveFieldId(field.id === activeFieldId ? null : field.id);
  };

  const handleProcess = async () => {
    setActionLoading(true);
    await fetch(`/api/documents/${documentId}/process`, { method: 'POST' });
    await fetchDocument();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Document not found</p>
          <Link href="/app/documents" className="mt-2 text-sm text-primary hover:underline">Back to documents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/app/documents" className="rounded-md p-1.5 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{doc.filename}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge status={doc.status as DocumentStatus} />
              <span className="capitalize">{doc.doc_type}</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.status === 'uploaded' && (
            <button
              onClick={handleProcess}
              disabled={actionLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Process Document
            </button>
          )}
          {(doc.status === 'needs_review' || doc.status === 'processing') && (
            <>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="flex-[3] border-r">
          <DocumentViewer
            storagePath={doc.storage_path}
            mimeType={doc.mime_type}
            fields={fields}
            activeFieldId={activeFieldId}
            onFieldClick={handleFieldClick}
          />
        </div>

        {/* Right: Fields + Comments */}
        <div className="flex flex-[2] flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Extracted Fields ({fields.length})
            </h2>
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {doc.status === 'uploaded' ? 'Process the document to extract fields' : 'No fields extracted'}
                </p>
              </div>
            ) : (
              <FieldList
                fields={fields}
                activeFieldId={activeFieldId}
                onFieldClick={handleFieldClick}
                onFieldEdit={handleFieldEdit}
              />
            )}
          </div>

          {/* Comments */}
          <div className="border-t p-4">
            <CommentsSection
              comments={comments}
              onAddComment={handleAddComment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
