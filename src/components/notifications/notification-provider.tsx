"use client";

import { createContext, useContext, useMemo } from "react";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { Toaster } from "@/components/ui/toaster";

type NotificationContextValue = {
  unreadCount: number;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { unreadCount, markAllRead } = useRealtime();

  const value = useMemo(
    () => ({ unreadCount, markAllRead }),
    [markAllRead, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
