import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Get extraction + fields
  const { data: extractions } = await supabase
    .from('extractions')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  let fields: unknown[] = [];
  if (extractions && extractions.length > 0) {
    const { data: f } = await supabase
      .from('extraction_fields')
      .select('*')
      .eq('extraction_id', extractions[0].id)
      .order('created_at', { ascending: true });
    fields = f || [];
  }

  // Get comments
  const { data: comments } = await supabase
    .from('review_comments')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    document: doc,
    extraction: extractions?.[0] || null,
    fields,
    comments: comments || [],
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
