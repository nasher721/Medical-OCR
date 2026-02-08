import crypto from 'crypto';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyInviteToken } from '@/lib/invitations/token';

interface InvitePageProps {
  params: { token: string };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const supabase = createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  const payload = verifyInviteToken(params.token);
  if (!payload) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Invitation link is invalid or expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please ask your administrator to send a new invitation.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Sign in to accept your invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need to sign in before joining the organization.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Go to login
        </Link>
      </div>
    );
  }

  const tokenHash = crypto.createHash('sha256').update(params.token).digest('hex');
  const { data: invite, error } = await supabase
    .from('invitations')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .is('accepted_at', null)
    .maybeSingle();

  if (
    error ||
    !invite ||
    invite.id !== payload.invitationId ||
    invite.org_id !== payload.orgId ||
    invite.email !== payload.email ||
    invite.role !== payload.role
  ) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Invitation not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please ask your administrator to send a new invitation.</p>
      </div>
    );
  }

  const expiresAt = new Date(invite.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Invitation expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please ask your administrator to send a new invitation.</p>
      </div>
    );
  }

  if (user.email && user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Invitation email mismatch</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation was sent to {invite.email}. Please sign in with that address or request a new invite.
        </p>
      </div>
    );
  }

  await supabase
    .from('memberships')
    .upsert(
      { org_id: invite.org_id, user_id: user.id, role: invite.role },
      { onConflict: 'org_id,user_id' }
    );

  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re in!</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your membership has been added. You can now access the organization.</p>
      <Link href="/app/settings" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Go to settings
      </Link>
    </div>
  );
}
