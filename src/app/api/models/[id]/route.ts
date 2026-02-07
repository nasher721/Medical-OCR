import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const modelId = params.id;

  const { data: model } = await supabase
    .from('models')
    .select('*')
    .eq('id', modelId)
    .single();

  if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

  // Get versions
  const { data: versions } = await supabase
    .from('model_versions')
    .select('*')
    .eq('model_id', modelId)
    .order('version', { ascending: false });

  // Get active version fields
  const activeVersion = versions?.find(v => v.version === model.active_version);
  let fields: unknown[] = [];
  if (activeVersion) {
    const { data: f } = await supabase
      .from('model_fields')
      .select('*')
      .eq('model_version_id', activeVersion.id);
    fields = f || [];
  }

  // Get training examples count
  const { count: trainingCount } = await supabase
    .from('training_examples')
    .select('*', { count: 'exact', head: true })
    .eq('model_id', modelId);

  // Get recent training examples
  const { data: trainingExamples } = await supabase
    .from('training_examples')
    .select('*')
    .eq('model_id', modelId)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    model,
    versions: versions || [],
    fields,
    training_count: trainingCount || 0,
    training_examples: trainingExamples || [],
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const modelId = params.id;
  const body = await request.json();

  const { name, fields } = body as {
    name?: string;
    fields?: Array<{ key: string; label: string; field_type: string; required: boolean; regex?: string }>;
  };

  if (name) {
    await supabase.from('models').update({ name }).eq('id', modelId);
  }

  if (fields) {
    // Get current model
    const { data: model } = await supabase.from('models').select('*').eq('id', modelId).single();
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const newVersion = model.active_version + 1;

    // Create new version
    const { data: version } = await supabase
      .from('model_versions')
      .insert({ model_id: modelId, version: newVersion, schema: { fields } })
      .select()
      .single();

    if (!version) return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });

    // Create fields
    const fieldInserts = fields.map(f => ({
      model_version_id: version.id,
      key: f.key,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      regex: f.regex || null,
    }));
    await supabase.from('model_fields').insert(fieldInserts);

    // Update active version
    await supabase.from('models').update({ active_version: newVersion }).eq('id', modelId);
  }

  return NextResponse.json({ success: true });
}
