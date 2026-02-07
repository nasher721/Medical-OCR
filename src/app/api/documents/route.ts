import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const orgId = searchParams.get('org_id');
  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const docType = searchParams.get('doc_type');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (docType) query = query.eq('doc_type', docType);
  if (search) query = query.ilike('filename', `%${search}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { org_id, filename, storage_path, mime_type, doc_type, model_id } = body;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      org_id,
      uploader_id: user.id,
      filename,
      storage_path,
      mime_type: mime_type || 'application/pdf',
      doc_type: doc_type || 'invoice',
      model_id,
      status: 'uploaded',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabase.from('audit_logs').insert({
    org_id,
    actor_id: user.id,
    action: 'document_uploaded',
    entity_type: 'document',
    entity_id: data.id,
    details: { filename },
  });

  return NextResponse.json({ data });
}
