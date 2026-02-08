import crypto from 'crypto';

export interface InviteTokenPayload {
  invitationId: string;
  orgId: string;
  email: string;
  role: string;
  expiresAt: string;
}

const TOKEN_SEPARATOR = '.';

function getInviteSecret() {
  const secret = process.env.INVITE_TOKEN_SECRET;
  if (!secret) {
    throw new Error('INVITE_TOKEN_SECRET is not configured');
  }
  return secret;
}

export function createInviteToken(payload: InviteTokenPayload) {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getInviteSecret())
    .update(encoded)
    .digest('base64url');
  const token = `${encoded}${TOKEN_SEPARATOR}${signature}`;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function verifyInviteToken(token: string) {
  const [encoded, signature] = token.split(TOKEN_SEPARATOR);
  if (!encoded || !signature) return null;
  const expected = crypto
    .createHmac('sha256', getInviteSecret())
    .update(encoded)
    .digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as InviteTokenPayload;
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
