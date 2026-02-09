import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { model_id } = body;

    if (!model_id) {
        return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
    }

    // Determine current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // In a real scenario, this would trigger a job in the ML backend (e.g. Celery, temporal, endpoint)
    // For now, we'll confirm the intent and log it.

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    await supabase.from('audit_logs').insert({
        org_id: (await supabase.from('models').select('org_id').eq('id', model_id).single()).data?.org_id,
        actor_id: user.id,
        action: 'model_retrain_triggered',
        entity_type: 'model',
        entity_id: model_id,
        details: { status: 'queued' }
    });

    return NextResponse.json({
        success: true,
        message: 'Retraining job queued successfully. You will be notified when complete.'
    });
}
