// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDocuments, POST as postDocuments } from './route';
import { GET as getDocument, DELETE as deleteDocument } from './[id]/route';
import { PATCH as patchFields } from './[id]/fields/route';

const createServerSupabaseClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => createServerSupabaseClient(),
}));

const makeAuth = (user: { id: string } | null) => ({
  getUser: vi.fn().mockResolvedValue({ data: { user } }),
});

describe('documents API routes', () => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
  });

  it('returns 400 when org_id is missing', async () => {
    createServerSupabaseClient.mockReturnValue({ rpc: vi.fn() });
    const request = new NextRequest('http://localhost/api/documents');
    const response = await getDocuments(request);
    expect(response.status).toBe(400);
  });

  it('returns paginated document results', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { id: 'doc-1', filename: 'a.pdf', total_count: 2 },
        { id: 'doc-2', filename: 'b.pdf', total_count: 2 },
      ],
      error: null,
    });
    createServerSupabaseClient.mockReturnValue({ rpc });
    const request = new NextRequest('http://localhost/api/documents?org_id=org-1&page=2&limit=10');
    const response = await getDocuments(request);
    const body = await response.json();

    expect(rpc).toHaveBeenCalled();
    expect(body.total).toBe(2);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.data).toHaveLength(2);
  });

  it('enforces auth on document creation', async () => {
    createServerSupabaseClient.mockReturnValue({ auth: makeAuth(null) });
    const request = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ org_id: 'org-1', filename: 'a.pdf', storage_path: 'path' }),
    });
    const response = await postDocuments(request);
    expect(response.status).toBe(401);
  });

  it('creates a document and logs audit events', async () => {
    const insert = vi.fn().mockReturnThis();
    const select = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({ data: { id: 'doc-1' }, error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'documents') {
        return { insert, select, single };
      }
      if (table === 'audit_logs') {
        return { insert: auditInsert };
      }
      return {};
    });

    createServerSupabaseClient.mockReturnValue({
      auth: makeAuth({ id: 'user-1' }),
      from,
    });

    const request = new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ org_id: 'org-1', filename: 'a.pdf', storage_path: 'path' }),
    });
    const response = await postDocuments(request);
    const body = await response.json();

    expect(body.data.id).toBe('doc-1');
    expect(auditInsert).toHaveBeenCalled();
  });

  it('returns document details with extraction data', async () => {
    const documents = {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'doc-1', filename: 'a.pdf' }, error: null }),
        }),
      }),
    };
    const extractions = {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [{ id: 'ext-1' }] }),
          }),
        }),
      }),
    };
    const extractionFields = {
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: 'field-1', key: 'total' }] }),
        }),
      }),
    };
    const reviewComments = {
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: 'comment-1' }] }),
        }),
      }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'documents') return documents;
      if (table === 'extractions') return extractions;
      if (table === 'extraction_fields') return extractionFields;
      if (table === 'review_comments') return reviewComments;
      return {};
    });

    createServerSupabaseClient.mockReturnValue({ from });

    const request = new NextRequest('http://localhost/api/documents/doc-1');
    const response = await getDocument(request, { params: { id: 'doc-1' } });
    const body = await response.json();

    expect(body.document.id).toBe('doc-1');
    expect(body.fields).toHaveLength(1);
    expect(body.comments).toHaveLength(1);
  });

  it('deletes documents', async () => {
    const deleteRequest = {
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    };
    createServerSupabaseClient.mockReturnValue({
      from: () => deleteRequest,
    });

    const request = new NextRequest('http://localhost/api/documents/doc-1', { method: 'DELETE' });
    const response = await deleteDocument(request, { params: { id: 'doc-1' } });
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('enforces auth on field updates', async () => {
    createServerSupabaseClient.mockReturnValue({ auth: makeAuth(null) });
    const request = new NextRequest('http://localhost/api/documents/doc-1/fields', {
      method: 'PATCH',
      body: JSON.stringify({ field_id: 'field-1', value: '123' }),
    });
    const response = await patchFields(request, { params: { id: 'doc-1' } });
    expect(response.status).toBe(401);
  });

  it('updates fields and logs edits', async () => {
    const updateChain = {
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'field-1', key: 'total' }, error: null }),
          }),
        }),
      }),
    };
    const documents = {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { org_id: 'org-1' } }),
        }),
      }),
    };
    const auditLogs = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'extraction_fields') return updateChain;
      if (table === 'documents') return documents;
      if (table === 'audit_logs') return auditLogs;
      return {};
    });

    createServerSupabaseClient.mockReturnValue({
      auth: makeAuth({ id: 'user-1' }),
      from,
    });

    const request = new NextRequest('http://localhost/api/documents/doc-1/fields', {
      method: 'PATCH',
      body: JSON.stringify({ field_id: 'field-1', value: '123' }),
    });
    const response = await patchFields(request, { params: { id: 'doc-1' } });
    const body = await response.json();

    expect(body.data.id).toBe('field-1');
    expect(auditLogs.insert).toHaveBeenCalled();
  });
});
