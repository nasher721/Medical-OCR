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
        .eq('type', 'emr')
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { org_id, config, name } = body;

    if (!org_id || !config) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if exists
    const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('org_id', org_id)
        .eq('type', 'emr')
        .maybeSingle();

    let result;
    if (existing) {
        result = await supabase
            .from('integrations')
            .update({ config, name })
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from('integrations')
            .insert({
                org_id,
                type: 'emr',
                name: name || 'EMR Integration',
                config
            })
            .select()
            .single();
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ data: result.data });
}
