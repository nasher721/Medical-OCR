import { ReviewComment } from '@/lib/supabase/types';

export class CommentService {
    static async list(documentId: string): Promise<ReviewComment[]> {
        const response = await fetch(`/api/comments?document_id=${documentId}`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        return (await response.json()).data;
    }

    static async create(documentId: string, orgId: string, body: string): Promise<ReviewComment> {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: documentId, org_id: orgId, body }),
        });
        if (!response.ok) throw new Error('Failed to create comment');
        return (await response.json()).data;
    }
}
