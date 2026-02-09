import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const model_id = searchParams.get('model_id');

    if (!org_id) {
        return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
    }

    let query = supabase
        .from('training_examples')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })
        .limit(100);

    if (model_id) {
        query = query.eq('model_id', model_id);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}
