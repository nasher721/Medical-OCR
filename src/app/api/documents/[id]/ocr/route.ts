import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('ocr_tokens')
    .select('*')
    .eq('document_id', id)
    .order('page_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tokens: data || [] });
}
