import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const orgId = searchParams.get('org_id');
  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const fullText = searchParams.get('full_text') || search;
  const docTypeParam = searchParams.get('doc_type');
  const docTypes = docTypeParam ? docTypeParam.split(',').filter(Boolean) : [];
  const modelId = searchParams.get('model_id');
  const uploaderId = searchParams.get('uploader_id');
  const confidenceMin = searchParams.get('confidence_min');
  const confidenceMax = searchParams.get('confidence_max');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const { data, error } = await supabase.rpc('search_documents', {
    p_org_id: orgId,
    p_status: status || null,
    p_doc_types: docTypes.length > 0 ? docTypes : null,
    p_model_id: modelId || null,
    p_uploader_id: uploaderId || null,
    p_confidence_min: confidenceMin ? Number(confidenceMin) : null,
    p_confidence_max: confidenceMax ? Number(confidenceMax) : null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_full_text: fullText || null,
    p_page: page,
    p_page_size: limit,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = data?.[0]?.total_count ?? 0;
  const documents = (data || []).map(({ total_count, ...doc }) => doc);

  return NextResponse.json({ data: documents, total, page, limit });
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
