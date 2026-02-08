import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const actionStatusMap = {
  approve: 'approved',
  reject: 'rejected',
  reprocess: 'processing',
} as const;

type BulkAction = keyof typeof actionStatusMap | 'delete';

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, document_ids: documentIds } = body as { action?: BulkAction; document_ids?: string[] };

  if (!action || !Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json({ error: 'action and document_ids are required' }, { status: 400 });
  }

  if (!['approve', 'reject', 'reprocess', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, org_id')
    .in('id', documentIds);

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ error: 'No documents found' }, { status: 404 });
  }

  if (action === 'delete') {
    const { data: deleted, error: deleteError } = await supabase
      .from('documents')
      .delete()
      .in('id', documentIds)
      .select('id, org_id');

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (deleted && deleted.length > 0) {
      await supabase.from('audit_logs').insert(
        deleted.map(doc => ({
          org_id: doc.org_id,
          actor_id: user.id,
          action: 'document_deleted',
          entity_type: 'document',
          entity_id: doc.id,
        }))
      );
    }

    return NextResponse.json({ updated: deleted?.length || 0 });
  }

  const status = actionStatusMap[action as keyof typeof actionStatusMap];
  const { data: updated, error: updateError } = await supabase
    .from('documents')
    .update({ status })
    .in('id', documentIds)
    .select('id, org_id');

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (updated && updated.length > 0) {
    await supabase.from('audit_logs').insert(
      updated.map(doc => ({
        org_id: doc.org_id,
        actor_id: user.id,
        action: `document_${action}`,
        entity_type: 'document',
        entity_id: doc.id,
        details: { status },
      }))
    );
  }

  return NextResponse.json({ updated: updated?.length || 0 });
}
