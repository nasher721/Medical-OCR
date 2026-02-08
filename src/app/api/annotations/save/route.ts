import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { document_id, page_number, field_key, value, bbox, status } = body;

  if (!document_id || !field_key || !bbox) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('annotations')
    .insert({
      document_id,
      page_number,
      field_key,
      value: value ?? '',
      bbox,
      status: status ?? 'accepted',
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('model_feedback').insert({
    document_id,
    annotation_id: data.id,
    action: status === 'rejected' ? 'reject' : status === 'corrected' ? 'correct' : 'accept',
    previous_value: null,
    corrected_value: value ?? null,
  });

  return NextResponse.json({ annotation: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { annotation_id, field_key, value, status } = body;

  if (!annotation_id) {
    return NextResponse.json({ error: 'annotation_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('annotations')
    .update({
      field_key,
      value,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', annotation_id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotation: data });
}
