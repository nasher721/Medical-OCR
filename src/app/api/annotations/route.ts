import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('document_id');

  if (!documentId) {
    return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotations: data || [] });
}
