import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  const body = await request.json().catch(() => ({}));
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  // Get org_id from the payload or header
  const orgId = (body as Record<string, string>).org_id ||
                request.headers.get('x-org-id') ||
                // Try to extract from the document data
                (body as Record<string, Record<string, string>>)?.document?.org_id;

  if (!orgId) {
    return NextResponse.json({ error: 'org_id required in payload or x-org-id header' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('webhook_receipts')
    .insert({
      org_id: orgId,
      payload: body as Record<string, unknown>,
      headers,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ received: true, id: data.id });
}
