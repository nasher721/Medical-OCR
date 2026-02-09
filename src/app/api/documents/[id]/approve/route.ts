import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchWebhooks } from '@/lib/webhook-dispatcher';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
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

  // Check role
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', doc.org_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['admin', 'reviewer'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  await supabase
    .from('documents')
    .update({ status: 'approved' })
    .eq('id', documentId);

  // Create training examples from any edited fields
  const { data: extractions } = await supabase
    .from('extractions')
    .select('id')
    .eq('document_id', documentId)
    .limit(1);

  if (extractions && extractions.length > 0) {
    const { data: editedFields } = await supabase
      .from('extraction_fields')
      .select('*')
      .eq('extraction_id', extractions[0].id)
      .not('edited_by', 'is', null);

    if (editedFields && editedFields.length > 0 && doc.model_id) {
      const trainingInserts = editedFields.map(f => ({
        org_id: doc.org_id,
        model_id: doc.model_id!,
        field_key: f.key,
        correct_value: f.value,
        bbox: f.bbox,
        page: f.page,
        document_id: documentId,
      }));
      await supabase.from('training_examples').insert(trainingInserts);
    }
  }

  await supabase.from('audit_logs').insert({
    org_id: doc.org_id,
    actor_id: user.id,
    action: 'document_approved',
    entity_type: 'document',
    entity_id: documentId,
  });

  // Dispatch webhooks
  await dispatchWebhooks(supabase, doc.org_id, 'document.approved', { document: doc });

  return NextResponse.json({ status: 'approved' });
}
