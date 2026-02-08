import type { NotificationPayload, NotificationProvider } from './types';

export class ResendNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<{ id?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Medical OCR <notifications@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        tags: [{ name: 'event', value: payload.event }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend request failed: ${response.status} ${body}`.trim());
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { id: data.id };
  }
}
