import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const org_id = searchParams.get('org_id');
  const range = searchParams.get('range') || '30d'; // 30 days default

  if (!org_id) {
    return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
  }

  if (type === 'throughput') {
    // Group documents by created_at date (simple daily count)
    const { data, error } = await supabase
      .from('documents')
      .select('created_at')
      .eq('org_id', org_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aggregate in memory for now (Supabase/PostgREST grouping is limited without RPC)
    const counts: Record<string, number> = {};
    data?.forEach(doc => {
      const date = new Date(doc.created_at).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    // Fill in gaps
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: counts[dateStr] || 0
      });
    }

    return NextResponse.json({ data: result });
  }

  if (type === 'performance') {
    // Get document status distribution
    const { data, error } = await supabase
      .from('documents')
      .select('status')
      .eq('org_id', org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const statusCounts: Record<string, number> = {};
    data?.forEach(doc => {
      statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;
    });

    const result = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count
    }));

    return NextResponse.json({ data: result });
  }

  if (type === 'activity') {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('actor_id, action, profiles(display_name)')
      .eq('org_id', org_id)
      .in('action', ['document.approved', 'document.rejected', 'document.uploaded']);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const activity: Record<string, number> = {};
    data?.forEach(log => {
      // @ts-ignore
      const name = log.profiles?.display_name || 'Unknown';
      activity[name] = (activity[name] || 0) + 1;
    });

    const result = Object.entries(activity)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    return NextResponse.json({ data: result });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
