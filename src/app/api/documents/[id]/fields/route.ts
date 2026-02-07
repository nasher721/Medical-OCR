import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { field_id, value } = body as { field_id: string; value: string };

  if (!field_id || value === undefined) {
    return NextResponse.json({ error: 'field_id and value required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('extraction_fields')
    .update({
      value,
      edited_by: user.id,
      edited_at: new Date().toISOString(),
    })
    .eq('id', field_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get document for audit log
  const { data: doc } = await supabase
    .from('documents')
    .select('org_id')
    .eq('id', documentId)
    .single();

  if (doc) {
    await supabase.from('audit_logs').insert({
      org_id: doc.org_id,
      actor_id: user.id,
      action: 'field_edited',
      entity_type: 'extraction_field',
      entity_id: field_id,
      details: { document_id: documentId, key: data.key, new_value: value },
    });
  }

  return NextResponse.json({ data });
}
