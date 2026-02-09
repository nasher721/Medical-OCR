import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    if (!documentId) return NextResponse.json({ error: 'document_id required' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('review_comments')
        .select(`
            *,
            user:profiles(display_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { document_id, org_id, body: commentBody } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('review_comments')
        .insert({
            org_id,
            document_id,
            user_id: user.id,
            body: commentBody,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log audit
    await supabase.from('audit_logs').insert({
        org_id,
        actor_id: user.id,
        action: 'comment_added',
        entity_type: 'document',
        entity_id: document_id,
        details: { comment_id: data.id },
    });

    return NextResponse.json({ data });
}
