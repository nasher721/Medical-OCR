import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchWebhooks } from '@/lib/webhook-dispatcher';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', doc.org_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['admin', 'reviewer'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = (body as Record<string, string>).reason || '';

  await supabase
    .from('documents')
    .update({ status: 'rejected' })
    .eq('id', documentId);

  await supabase.from('audit_logs').insert({
    org_id: doc.org_id,
    actor_id: user.id,
    action: 'document_rejected',
    entity_type: 'document',
    entity_id: documentId,
    details: { reason },
  });

  // Dispatch webhooks
  await dispatchWebhooks(supabase, doc.org_id, 'document.rejected', { document: doc, reason });

  return NextResponse.json({ status: 'rejected' });
}
