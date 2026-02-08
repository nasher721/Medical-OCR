import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { document_id, annotation_id, action, previous_value, corrected_value, suggestion_id } = body;

  if (!document_id || !action) {
    return NextResponse.json({ error: 'document_id and action are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('model_feedback')
    .insert({
      document_id,
      annotation_id: annotation_id ?? suggestion_id ?? null,
      action,
      previous_value: previous_value ?? null,
      corrected_value: corrected_value ?? null,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data });
}
