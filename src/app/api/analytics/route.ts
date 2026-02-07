import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  // Total documents
  const { count: totalDocs } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  // Status breakdown
  const { data: allDocsRaw } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId);

  const allDocs = (allDocsRaw || []) as Array<{ status: string; created_at: string; updated_at: string }>;

  const statusCounts: Record<string, number> = {};
  const docsPerDay: Record<string, number> = {};
  let reviewedCount = 0;
  let totalReviewTimeMs = 0;
  let autoApprovedCount = 0;

  allDocs.forEach(doc => {
    statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;

    const day = doc.created_at.split('T')[0];
    docsPerDay[day] = (docsPerDay[day] || 0) + 1;

    if (doc.status === 'approved' && doc.updated_at && doc.created_at) {
      const reviewTime = new Date(doc.updated_at).getTime() - new Date(doc.created_at).getTime();
      if (reviewTime < 5000) {
        autoApprovedCount++;
      } else {
        reviewedCount++;
        totalReviewTimeMs += reviewTime;
      }
    }
  });

  const totalProcessed = (totalDocs || 0);
  const stpRate = totalProcessed > 0
    ? ((autoApprovedCount / totalProcessed) * 100).toFixed(1)
    : '0';
  const avgReviewTime = reviewedCount > 0
    ? Math.round(totalReviewTimeMs / reviewedCount / 1000)
    : 0;

  // Edit rate per field
  const { data: editedFieldsRaw } = await supabase
    .from('extraction_fields')
    .select('*')
    .not('edited_by', 'is', null);

  const editedFields = (editedFieldsRaw || []) as Array<{ key: string }>;

  const { count: totalFields } = await supabase
    .from('extraction_fields')
    .select('*', { count: 'exact', head: true });

  const editRate = (totalFields && totalFields > 0)
    ? ((editedFields.length / totalFields) * 100).toFixed(1)
    : '0';

  // Field-level edit rates
  const fieldEditCounts: Record<string, number> = {};
  editedFields.forEach(f => {
    fieldEditCounts[f.key] = (fieldEditCounts[f.key] || 0) + 1;
  });

  // Documents per day (last 30 days)
  const last30Days = Object.entries(docsPerDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    total_documents: totalDocs || 0,
    status_breakdown: statusCounts,
    stp_rate: parseFloat(stpRate),
    avg_review_time_seconds: avgReviewTime,
    edit_rate: parseFloat(editRate),
    field_edit_counts: fieldEditCounts,
    documents_per_day: last30Days,
    pending_review: statusCounts['needs_review'] || 0,
    active_workflows: 0,
  });
}
