import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { triggerDocumentProcessing } from '@/lib/workflow-engine';

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
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  console.log('[GET Documents] Params:', {
    orgId, status, docTypes, modelId, dateFrom, dateTo, limit, page, uploaderId, fullText
  });

  try {
    // Build the query dynamically instead of using the missing RPC
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (docTypes.length > 0) query = query.in('doc_type', docTypes);
    if (modelId) query = query.eq('model_id', modelId);
    if (uploaderId) query = query.eq('uploader_id', uploaderId);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);
    if (fullText) query = query.ilike('filename', `%${fullText}%`);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET Documents] Query Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    const documents = data || [];

    console.log('[GET Documents] Result:', { documentCount: documents.length, total, page });

    return NextResponse.json({ data: documents, total, page, limit });
  } catch (err) {
    console.error('[GET Documents] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

  console.log(`[Upload] User ${user.id} uploading to org ${org_id}`);

  if (error) {
    console.error('[Upload] Error inserting document:', error);
    // Debug membership
    const { data: member, error: memberError } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', org_id);
    console.log('[Upload] Membership check:', member, memberError);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }



  // Log audit
  await supabase.from('audit_logs').insert({
    org_id,
    actor_id: user.id,
    action: 'document_uploaded',
    entity_type: 'document',
    entity_id: data.id,
    details: { filename },
  });

  // Trigger processing workflow
  try {
    await triggerDocumentProcessing(supabase, data.id, org_id, doc_type || 'invoice');
  } catch (error) {
    console.error('[Upload] Failed to trigger workflow:', error);
    // Non-blocking error for the upload itself, but good to log
  }

  return NextResponse.json({ data });
}
