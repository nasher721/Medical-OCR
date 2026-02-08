import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) {
    return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('field_schema')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { org_id, key, label, field_type, repeating, synonyms } = body;

  if (!org_id || !key) {
    return NextResponse.json({ error: 'org_id and key are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('field_schema')
    .insert({
      org_id,
      key,
      label: label ?? key,
      field_type: field_type ?? 'text',
      repeating: repeating ?? false,
      synonyms: synonyms ?? [],
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { field_id, label, field_type, repeating, synonyms } = body;

  if (!field_id) {
    return NextResponse.json({ error: 'field_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('field_schema')
    .update({
      label,
      field_type,
      repeating,
      synonyms,
      updated_at: new Date().toISOString(),
    })
    .eq('id', field_id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: data });
}

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { source_id, target_id } = body;

  if (!source_id || !target_id) {
    return NextResponse.json({ error: 'source_id and target_id are required' }, { status: 400 });
  }

  const { data: source, error: sourceError } = await supabase
    .from('field_schema')
    .select('*')
    .eq('id', source_id)
    .single();

  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

  const { data: target, error: targetError } = await supabase
    .from('field_schema')
    .select('key')
    .eq('id', target_id)
    .single();

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });

  const { error: updateError } = await supabase
    .from('annotations')
    .update({ field_key: target.key })
    .eq('field_key', source.key);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from('field_schema').delete().eq('id', source_id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
