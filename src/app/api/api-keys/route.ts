import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, org_id, name, prefix, created_at, last_used_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { org_id, name } = body as { org_id: string; name: string };

  // Generate API key
  const rawKey = `idp_${uuidv4().replace(/-/g, '')}`;
  const prefix = rawKey.slice(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ org_id, name, key_hash: keyHash, prefix })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the raw key only once
  return NextResponse.json({ data: { ...data, raw_key: rawKey } });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
