"use client";

import { useNotifications } from "@/components/notifications/notification-provider";

export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (unreadCount <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
      aria-label={`${unreadCount} unread notifications`}
    >
      {unreadCount}
    </span>
  );
}
