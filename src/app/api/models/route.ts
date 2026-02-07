import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { org_id, name, type, fields } = body as {
    org_id: string;
    name: string;
    type?: string;
    fields?: Array<{ key: string; label: string; field_type: string; required: boolean; regex?: string }>;
  };

  // Create model
  const { data: model, error: modelError } = await supabase
    .from('models')
    .insert({ org_id, name, type: type || 'custom' })
    .select()
    .single();

  if (modelError || !model) return NextResponse.json({ error: modelError?.message }, { status: 500 });

  // Create version 1
  const { data: version, error: versionError } = await supabase
    .from('model_versions')
    .insert({ model_id: model.id, version: 1, schema: { fields: fields || [] } })
    .select()
    .single();

  if (versionError || !version) return NextResponse.json({ error: versionError?.message }, { status: 500 });

  // Create fields
  if (fields && fields.length > 0) {
    const fieldInserts = fields.map(f => ({
      model_version_id: version.id,
      key: f.key,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      regex: f.regex || null,
    }));
    await supabase.from('model_fields').insert(fieldInserts);
  }

  return NextResponse.json({ data: model });
}
