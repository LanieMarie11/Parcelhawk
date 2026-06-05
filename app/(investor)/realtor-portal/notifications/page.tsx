"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronDown } from "lucide-react"
import { PageLoadingIndicator } from "@/components/page-loading-indicator"
import {
  NotificationCard,
  type NotificationItem,
} from "../../../../components/notification-card"

const SORT_OPTIONS = ["Unread", "Newest", "Oldest", "All"] as const

type NotificationsResponse = {
  notifications?: NotificationItem[]
}

async function postNotificationAction(id: string, action: "connect" | "ignore" | "read" | "delete") {
  await fetch("/api/realtor-portal/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  })
}

export default function RealtorNotificationsPage() {
  const { status } = useSession()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("All")

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch("/api/realtor-portal/notifications", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as NotificationsResponse
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data?.notifications)) {
          setNotifications(data.notifications)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status])

  const visibleNotifications = useMemo(() => {
    let items = [...notifications]

    if (sortBy === "Unread") {
      items = items.filter((item) => item.unread)
    }

    if (sortBy === "Oldest") {
      items = [...items].reverse()
    }

    return items
  }, [notifications, sortBy])

  const findNotification = (id: string) => notifications.find((item) => item.id === id)

  const markRead = (id: string) => {
    const target = findNotification(id)
    if (target?.actions.type === "single") {
      void postNotificationAction(id, "read")
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    )
  }

  const connectNotificationAction = (id: string) => {
    const target = findNotification(id)
    if (target?.actions.type === "dual" && target.actions.primary.label === "Connect") {
      void postNotificationAction(id, "connect")
    }
    markRead(id)
  }

  const removeNotification = (id: string) => {
    const target = findNotification(id)
    if (target?.actions.type === "dual") {
      void postNotificationAction(id, "ignore")
    }
    markRead(id)
  }

  const deleteNotification = (id: string) => {
    void postNotificationAction(id, "delete")
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <PageLoadingIndicator />
  }

  return (
    <div className="min-h-[calc(100vh-73px)] w-full font-ibm-plex-sans">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-phudu font-medium tracking-tight text-foreground">
              Notifications
            </h1>
            <p className="mt-1 max-w-2xl text-base font-ibm-plex-sans text-[#6B7280]">
              Stay updated on buyer connections, viewing requests, messages, and account activity.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#373940]">
            <span className="text-[#6B7280]">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as (typeof SORT_OPTIONS)[number])
                }
                className="appearance-none bg-transparent pr-6 text-sm font-medium text-[#111827] outline-none"
                aria-label="Sort notifications"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#111827]">No notifications</p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {sortBy === "Unread"
                  ? "You're all caught up — no unread notifications."
                  : "New alerts will appear here when there's activity on your account."}
              </p>
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={markRead}
                onConnect={connectNotificationAction}
                onIgnore={removeNotification}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
