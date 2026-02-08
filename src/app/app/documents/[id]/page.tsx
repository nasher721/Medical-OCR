'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import type { Annotation, Document, FieldSchema, OcrToken } from '@/lib/supabase/types';
import { AnnotationCanvas } from '@/components/annotation/annotation-canvas';
import type { AnnotationMode, SuggestionBox } from '@/components/annotation/annotation-canvas';
import { AnnotationSidebar } from '@/components/annotation/annotation-sidebar';
import { FieldSchemaBuilder } from '@/components/annotation/field-schema-builder';
import { SuggestionPanel } from '@/components/annotation/suggestion-panel';
import { TableExtractionPanel } from '@/components/annotation/table-extraction-panel';
import { ClinicalEntityPanel } from '@/components/annotation/clinical-entity-panel';
import { extractClinicalEntities } from '@/lib/annotation/clinical-nlp';
import { extractTableFromTokens } from '@/lib/annotation/table-extraction';
import { ArrowLeft, FileText, Sparkles, Table2, PenSquare, Eye, Zap } from 'lucide-react';

export default function DocumentReviewPage() {
  const params = useParams();
  const documentId = params.id as string;
  const { currentOrg } = useOrgStore();

  const [doc, setDoc] = useState<Document | null>(null);
  const [tokens, setTokens] = useState<OcrToken[]>([]);
  const [schema, setSchema] = useState<FieldSchema[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionBox[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AnnotationMode>('draw');
  const [zoom, setZoom] = useState(1);
  const [showPhi, setShowPhi] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tableExtraction, setTableExtraction] = useState<ReturnType<typeof extractTableFromTokens> | null>(null);
  const [activeTab, setActiveTab] = useState<'annotations' | 'schema' | 'suggestions' | 'table' | 'nlp'>('annotations');

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    const resp = await fetch(`/api/documents/${documentId}`);
    if (resp.ok) {
      const data = await resp.json();
      setDoc(data.document);
    }
    setLoading(false);
  }, [documentId]);

  const fetchOcrTokens = useCallback(async () => {
    const resp = await fetch(`/api/documents/${documentId}/ocr`);
    if (resp.ok) {
      const data = await resp.json();
      setTokens(data.tokens || []);
    }
  }, [documentId]);

  const fetchSchema = useCallback(async () => {
    if (!currentOrg) return;
    const resp = await fetch(`/api/field-schema?org_id=${currentOrg.id}`);
    if (resp.ok) {
      const data = await resp.json();
      setSchema(data.fields || []);
    }
  }, [currentOrg]);

  const fetchAnnotations = useCallback(async () => {
    const resp = await fetch(`/api/annotations?document_id=${documentId}`);
    if (resp.ok) {
      const data = await resp.json();
      setAnnotations(data.annotations || []);
    }
  }, [documentId]);

  const fetchSuggestions = useCallback(async () => {
    const resp = await fetch(`/api/suggestions/${documentId}`);
    if (resp.ok) {
      const data = await resp.json();
      setSuggestions(data.suggestions || []);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
    fetchOcrTokens();
    fetchSchema();
    fetchAnnotations();
    fetchSuggestions();
  }, [fetchDocument, fetchOcrTokens, fetchSchema, fetchAnnotations, fetchSuggestions]);

  useEffect(() => {
    if (!doc) return;
    const supabase = createClient();
    supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setImageUrl(data.signedUrl);
      });
  }, [doc]);

  const handleCreateAnnotation = async (payload: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => {
    const basePayload = { ...payload, document_id: documentId };
    const resp = await fetch('/api/annotations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });
    if (resp.ok) {
      const data = await resp.json();
      setAnnotations((prev) => [data.annotation, ...prev]);
    }

    if (mode === 'table') {
      const pageTokens = tokens.filter((token) => token.page_number === payload.page_number);
      const tokensInBox = pageTokens.filter((token) => {
        const midX = token.bbox.x + token.bbox.w / 2;
        const midY = token.bbox.y + token.bbox.h / 2;
        return (
          midX >= payload.bbox.x &&
          midX <= payload.bbox.x + payload.bbox.w &&
          midY >= payload.bbox.y &&
          midY <= payload.bbox.y + payload.bbox.h
        );
      });
      setTableExtraction(extractTableFromTokens(tokensInBox));
    }
  };

  const handleUpdateAnnotation = async (annotationId: string, update: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((annotation) => (annotation.id === annotationId ? { ...annotation, ...update } : annotation)));
    await fetch('/api/annotations/save', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotation_id: annotationId, ...update }),
    });
  };

  const handleCreateField = async (payload: { key: string; label: string; field_type: string; repeating: boolean; synonyms: string[] }) => {
    if (!currentOrg) return;
    const resp = await fetch('/api/field-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: currentOrg?.id, ...payload }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setSchema((prev) => [data.field, ...prev]);
    }
  };

  const handleUpdateField = async (fieldId: string, payload: Partial<FieldSchema>) => {
    setSchema((prev) => prev.map((field) => (field.id === fieldId ? { ...field, ...payload } : field)));
    await fetch('/api/field-schema', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, ...payload }),
    });
  };

  const handleMergeFields = async (sourceId: string, targetId: string) => {
    await fetch('/api/field-schema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
    });
    setSchema((prev) => prev.filter((field) => field.id !== sourceId));
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    await handleCreateAnnotation({
      document_id: documentId,
      page_number: suggestion.page_number,
      field_key: suggestion.field_key,
      value: suggestion.value,
      bbox: suggestion.bbox,
      status: 'accepted',
      created_by: null,
    });
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId, action: 'accept', suggestion_id: suggestionId }),
    });
    setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId));
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId, action: 'reject', suggestion_id: suggestionId }),
    });
    setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId));
  };

  const handleCorrectSuggestion = async (suggestionId: string, value: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    await handleCreateAnnotation({
      document_id: documentId,
      page_number: suggestion.page_number,
      field_key: suggestion.field_key,
      value,
      bbox: suggestion.bbox,
      status: 'corrected',
      created_by: null,
    });
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        action: 'correct',
        suggestion_id: suggestionId,
        corrected_value: value,
      }),
    });
    setSuggestions((prev) => prev.filter((item) => item.id !== suggestionId));
  };

  const entities = useMemo(() => {
    const text = annotations.map((annotation) => annotation.value).join(' ');
    return extractClinicalEntities(text);
  }, [annotations]);

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
          <Link href="/app/documents" className="mt-2 text-sm text-primary hover:underline">
            Back to documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/app/documents" className="rounded-md p-1.5 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{doc.filename}</h1>
            <div className="text-xs text-muted-foreground">Medical annotation workspace</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs ${mode === 'draw' ? 'border-primary bg-primary/10' : ''}`}
          >
            <PenSquare className="h-3 w-3" />
            Draw fields
          </button>
          <button
            type="button"
            onClick={() => setMode('table')}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs ${mode === 'table' ? 'border-primary bg-primary/10' : ''}`}
          >
            <Table2 className="h-3 w-3" />
            Table mode
          </button>
          <button
            type="button"
            onClick={() => setMode('redact')}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs ${mode === 'redact' ? 'border-primary bg-primary/10' : ''}`}
          >
            <Eye className="h-3 w-3" />
            Redact
          </button>
          <button
            type="button"
            onClick={() => setShowPhi((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs ${showPhi ? 'border-rose-500 bg-rose-50 text-rose-700' : ''}`}
          >
            <Zap className="h-3 w-3" />
            PHI highlight
          </button>
          <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <button type="button" onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}>
              -
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((prev) => Math.min(2, prev + 0.1))}>
              +
            </button>
          </div>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1 text-xs text-white"
          >
            <Sparkles className="h-3 w-3" />
            Refresh suggestions
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-[3] border-r">
          <AnnotationCanvas
            imageUrl={imageUrl}
            mimeType={doc.mime_type}
            tokens={tokens}
            annotations={annotations}
            suggestions={suggestions}
            mode={mode}
            zoom={zoom}
            activeAnnotationId={activeAnnotationId}
            showPhi={showPhi}
            onCreateAnnotation={handleCreateAnnotation}
            onSelectAnnotation={setActiveAnnotationId}
          />
        </div>
        <div className="flex w-full max-w-[420px] flex-col overflow-hidden bg-slate-50">
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold text-slate-500">
            <button type="button" onClick={() => setActiveTab('annotations')} className={activeTab === 'annotations' ? 'text-slate-900' : ''}>
              Annotations
            </button>
            <button type="button" onClick={() => setActiveTab('schema')} className={activeTab === 'schema' ? 'text-slate-900' : ''}>
              Schema
            </button>
            <button type="button" onClick={() => setActiveTab('suggestions')} className={activeTab === 'suggestions' ? 'text-slate-900' : ''}>
              Suggestions
            </button>
            <button type="button" onClick={() => setActiveTab('table')} className={activeTab === 'table' ? 'text-slate-900' : ''}>
              Table
            </button>
            <button type="button" onClick={() => setActiveTab('nlp')} className={activeTab === 'nlp' ? 'text-slate-900' : ''}>
              Clinical NLP
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'annotations' && (
              <AnnotationSidebar
                annotations={annotations}
                schema={schema}
                activeAnnotationId={activeAnnotationId}
                onSelectAnnotation={setActiveAnnotationId}
                onUpdateAnnotation={handleUpdateAnnotation}
              />
            )}
            {activeTab === 'schema' && (
              <FieldSchemaBuilder
                fields={schema}
                onCreateField={handleCreateField}
                onUpdateField={handleUpdateField}
                onMergeFields={handleMergeFields}
              />
            )}
            {activeTab === 'suggestions' && (
              <SuggestionPanel
                suggestions={suggestions}
                schema={schema}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
                onCorrect={handleCorrectSuggestion}
              />
            )}
            {activeTab === 'table' && (
              <TableExtractionPanel
                table={tableExtraction}
                onExport={() => {
                  if (!tableExtraction) return;
                  window.navigator.clipboard.writeText(JSON.stringify(tableExtraction.rows, null, 2));
                }}
              />
            )}
            {activeTab === 'nlp' && <ClinicalEntityPanel entities={entities} />}
          </div>
        </div>
      </div>
    </div>
  );
}
