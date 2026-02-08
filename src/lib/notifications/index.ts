import type { NotificationProvider } from './types';
import { ResendNotificationProvider } from './resend-provider';

export type { NotificationProvider, NotificationPayload, NotificationEventType, NotificationEmailData, NotificationPreference } from './types';
export { renderNotificationEmail } from './render';

// ============================================================
// PROVIDER SWAP POINT
// ============================================================
// To use SendGrid, Nodemailer, etc:
// 1. Implement NotificationProvider in a new file.
// 2. Swap the provider below.
// ============================================================

export function getNotificationProvider(): NotificationProvider {
  return new ResendNotificationProvider();
}
