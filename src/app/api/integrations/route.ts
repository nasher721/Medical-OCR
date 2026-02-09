import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');

    if (!org_id) {
        return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('integrations')
        .insert(body)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
