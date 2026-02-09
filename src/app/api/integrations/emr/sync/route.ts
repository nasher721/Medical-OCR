import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { org_id } = body;

    if (!org_id) {
        return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Simulate Sync Job
    await new Promise(resolve => setTimeout(resolve, 1000));

    await supabase.from('audit_logs').insert({
        org_id,
        actor_id: user.id,
        action: 'emr.sync_triggered',
        entity_type: 'integration',
        details: { status: 'started' }
    });

    return NextResponse.json({
        success: true,
        message: 'Patient synchronization job started'
    });
}
