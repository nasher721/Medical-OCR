import { render } from '@react-email/render';

interface InviteEmailProps {
  inviteUrl: string;
  orgName: string;
  role: string;
}

function renderInviteEmail({ inviteUrl, orgName, role }: InviteEmailProps) {
  const html = render(
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif', color: '#111827' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td style={{ padding: '24px' }}>
                <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>You&apos;re invited to {orgName}</h1>
                <p style={{ marginBottom: '12px' }}>
                  You have been invited to join {orgName} as a {role}.
                </p>
                <p style={{ marginBottom: '20px' }}>
                  Click the button below to accept the invitation. This link expires in 7 days.
                </p>
                <a
                  href={inviteUrl}
                  style={{
                    display: 'inline-block',
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  Accept invitation
                </a>
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
                  If the button doesn&apos;t work, copy and paste this link into your browser:
                  <br />
                  {inviteUrl}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );

  const text = `You have been invited to join ${orgName} as a ${role}.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 7 days.`;

  return { html, text };
}

export async function sendInviteEmail({ to, inviteUrl, orgName, role }: { to: string; inviteUrl: string; orgName: string; role: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Medical OCR <notifications@resend.dev>';
  const { html, text } = renderInviteEmail({ inviteUrl, orgName, role });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: `Invitation to join ${orgName}`,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${body}`.trim());
  }

  return response.json();
}
