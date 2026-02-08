import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createInviteToken } from '@/lib/invitations/token';
import { sendInviteEmail } from '@/lib/invitations/send-invite-email';
import crypto from 'crypto';

const INVITE_EXPIRATION_DAYS = 7;

async function requireOrgMember(orgId: string, userId: string, requiredRole?: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  if (requiredRole && data.role !== requiredRole) return null;
  return data;
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await requireOrgMember(orgId, user.id);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('invitations')
    .select('id, org_id, email, role, expires_at, accepted_at, created_at')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { org_id, email, role } = body as { org_id: string; email: string; role: string };

  if (!org_id || !email || !role) {
    return NextResponse.json({ error: 'org_id, email, role required' }, { status: 400 });
  }
  const allowedRoles = new Set(['admin', 'reviewer', 'member', 'viewer']);
  if (!allowedRoles.has(role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await requireOrgMember(org_id, user.id, 'admin');
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const invitationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { token, tokenHash } = createInviteToken({
    invitationId,
    orgId: org_id,
    email,
    role,
    expiresAt,
  });

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      id: invitationId,
      org_id,
      email,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id, email, role, expires_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const { data: orgData } = await supabase.from('orgs').select('name').eq('id', org_id).single();
  const orgName = orgData?.name || 'your organization';

  await sendInviteEmail({
    to: email,
    inviteUrl: `${baseUrl}/invite/${token}`,
    orgName,
    role,
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { id, org_id } = body as { id: string; org_id: string };

  if (!id || !org_id) return NextResponse.json({ error: 'id and org_id required' }, { status: 400 });

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await requireOrgMember(org_id, user.id, 'admin');
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .select('id, email, role')
    .eq('id', id)
    .eq('org_id', org_id)
    .is('accepted_at', null)
    .maybeSingle();

  if (inviteError || !invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { token, tokenHash } = createInviteToken({
    invitationId: invite.id,
    orgId: org_id,
    email: invite.email,
    role: invite.role,
    expiresAt,
  });

  const { error } = await supabase
    .from('invitations')
    .update({ token_hash: tokenHash, expires_at: expiresAt })
    .eq('id', invite.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const { data: orgData } = await supabase.from('orgs').select('name').eq('id', org_id).single();
  const orgName = orgData?.name || 'your organization';

  await sendInviteEmail({
    to: invite.email,
    inviteUrl: `${baseUrl}/invite/${token}`,
    orgName,
    role: invite.role,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const orgId = searchParams.get('org_id');

  if (!id || !orgId) return NextResponse.json({ error: 'id and org_id required' }, { status: 400 });

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await requireOrgMember(orgId, user.id, 'admin');
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
