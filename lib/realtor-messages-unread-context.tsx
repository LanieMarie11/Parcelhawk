"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type RealtorMessagesUnreadContextValue = {
  unreadCount: number;
  notificationUnreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const RealtorMessagesUnreadContext = createContext<RealtorMessagesUnreadContextValue | null>(
  null,
);

export function RealtorMessagesUnreadProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const isSignedIn = status === "authenticated";
  const isRealtorMode =
    pathname === "/realtor-portal" || pathname.startsWith("/realtor-portal/");

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/realtor-portal/messages/unread-count", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        unreadCount?: number;
        notificationUnreadCount?: number;
      };
      setUnreadCount(Number.isFinite(data.unreadCount) ? (data.unreadCount ?? 0) : 0);
      setNotificationUnreadCount(
        Number.isFinite(data.notificationUnreadCount) ? (data.notificationUnreadCount ?? 0) : 0,
      );
    } catch {
      setUnreadCount(0);
      setNotificationUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!isRealtorMode || !isSignedIn) {
      setUnreadCount(0);
      setNotificationUnreadCount(0);
      return;
    }
    void refreshUnreadCount();
  }, [isRealtorMode, isSignedIn, pathname, refreshUnreadCount]);

  return (
    <RealtorMessagesUnreadContext.Provider
      value={{ unreadCount, notificationUnreadCount, refreshUnreadCount }}
    >
      {children}
    </RealtorMessagesUnreadContext.Provider>
  );
}

export function useRealtorMessagesUnread(): RealtorMessagesUnreadContextValue {
  const ctx = useContext(RealtorMessagesUnreadContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      notificationUnreadCount: 0,
      refreshUnreadCount: async () => {},
    };
  }
  return ctx;
}
