import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const documentId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { body: commentBody } = body as { body: string };

  if (!commentBody) return NextResponse.json({ error: 'Comment body required' }, { status: 400 });

  const { data: doc } = await supabase
    .from('documents')
    .select('org_id')
    .eq('id', documentId)
    .single();

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('review_comments')
    .insert({
      org_id: doc.org_id,
      document_id: documentId,
      user_id: user.id,
      body: commentBody,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
