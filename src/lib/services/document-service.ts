import { Document } from '@/lib/supabase/types';

export interface SearchDocumentsParams {
    org_id: string;
    status?: string;
    doc_type?: string[];
    model_id?: string;
    uploader_id?: string;
    confidence_min?: number;
    confidence_max?: number;
    date_from?: string; // ISO string
    date_to?: string; // ISO string
    full_text?: string;
    page?: number;
    limit?: number;
}

export interface SearchDocumentsResponse {
    data: Document[];
    total: number;
    page: number;
    limit: number;
}

export class DocumentService {
    static async get(id: string): Promise<{
        document: Document;
        extraction: Record<string, unknown>;
        fields: Record<string, unknown>[];
        comments: Record<string, unknown>[];
    }> {
        const response = await fetch(`/api/documents/${id}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch document');
        }
        return response.json();
    }

    static async search(params: SearchDocumentsParams): Promise<SearchDocumentsResponse> {
        const searchParams = new URLSearchParams();

        // Required
        searchParams.set('org_id', params.org_id);

        // Optional
        if (params.status) searchParams.set('status', params.status);
        if (params.doc_type?.length) searchParams.set('doc_type', params.doc_type.join(','));
        if (params.model_id) searchParams.set('model_id', params.model_id);
        if (params.uploader_id) searchParams.set('uploader_id', params.uploader_id);
        if (params.confidence_min !== undefined) searchParams.set('confidence_min', params.confidence_min.toString());
        if (params.confidence_max !== undefined) searchParams.set('confidence_max', params.confidence_max.toString());
        if (params.date_from) searchParams.set('date_from', params.date_from);
        if (params.date_to) searchParams.set('date_to', params.date_to);
        if (params.full_text) searchParams.set('full_text', params.full_text);
        if (params.page) searchParams.set('page', params.page.toString());
        if (params.limit) searchParams.set('limit', params.limit.toString());

        const response = await fetch(`/api/documents?${searchParams.toString()}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch documents');
        }

        return response.json();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async upload(_file: File, _metadata?: Record<string, unknown>): Promise<Document> {
        // 1. Upload to Storage is handled by UI/Component for progress tracking usually, 
        // but if we move it here we need to handle progress.
        // For now, we will stick to the API record creation which is relevant to the service.

        // This method assumes the file is already in storage, or handles the full flow.
        // Given the current architecture, the UI handles storage upload. 
        // We will Implement the `createRecord` part.
        throw new Error("Use createRecord instead");
    }

    static async create(_file: File, metadata: Record<string, unknown>): Promise<Document> {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create document record');
        }

        const result = await response.json();
        return result.data;
    }

    static async bulkAction(action: 'approve' | 'reject' | 'delete', documentIds: string[]): Promise<{ updated: number }> {
        const response = await fetch('/api/documents/bulk-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, document_ids: documentIds }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to perform bulk action');
        }

        return response.json();
    }
}
