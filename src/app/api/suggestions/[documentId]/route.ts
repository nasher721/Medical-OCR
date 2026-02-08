import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateFieldSuggestions } from '@/lib/annotation/suggestion-service';

export async function GET(_request: NextRequest, { params }: { params: { documentId: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.documentId;

  const { data: tokens, error: tokenError } = await supabase
    .from('ocr_tokens')
    .select('*')
    .eq('document_id', documentId);

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('org_id')
    .eq('id', documentId)
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  const { data: schema, error: schemaError } = await supabase
    .from('field_schema')
    .select('*')
    .eq('org_id', document.org_id);

  if (schemaError) {
    return NextResponse.json({ error: schemaError.message }, { status: 500 });
  }

  const { count } = await supabase
    .from('annotations')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId);

  if (!count || count < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = generateFieldSuggestions(tokens || [], schema || []);
  return NextResponse.json({ suggestions });
}
