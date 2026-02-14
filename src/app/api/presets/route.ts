import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');

    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('filter_presets')
            .select('*')
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            // Table may not exist — return empty array gracefully
            console.warn('[Presets] Query error (table may not exist):', error.message);
            return NextResponse.json({ data: [] });
        }
        return NextResponse.json({ data });
    } catch {
        return NextResponse.json({ data: [] });
    }
}

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { org_id, name, filters, tags } = body;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('filter_presets')
            .insert({
                org_id,
                user_id: user.id,
                name,
                filters,
                tags: tags || [],
            })
            .select()
            .single();

        if (error) {
            console.warn('[Presets] Insert error:', error.message);
            return NextResponse.json({ error: 'Filter presets not available. Database migration may be needed.' }, { status: 503 });
        }
        return NextResponse.json({ data });
    } catch {
        return NextResponse.json({ error: 'Filter presets not available' }, { status: 503 });
    }
}

export async function DELETE(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    try {
        const { error } = await supabase
            .from('filter_presets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.warn('[Presets] Delete error:', error.message);
            return NextResponse.json({ error: 'Filter presets not available' }, { status: 503 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Filter presets not available' }, { status: 503 });
    }
}
