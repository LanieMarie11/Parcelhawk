"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  NotificationCard,
  type NotificationItem,
} from "./components/notification-card"

const SORT_OPTIONS = ["Unread", "Newest", "Oldest", "All"] as const

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "New Match in Colorado",
    timestamp: "2h ago",
    category: "Parcel match",
    description:
      "A 40-acre parcel matches your \"Mountain View\" saved search criteria in Montrose County.",
    unread: true,
    actions: { type: "single", label: "View Parcel", href: "/land-property" },
  },
  {
    id: "2",
    title: "New Listing: 24B Pinecrest",
    timestamp: "5 min ago",
    category: "New listing",
    description:
      "Just listed: 24B Pinecrest, TX with an asking price of $120K and road frontage.",
    unread: true,
    actions: { type: "single", label: "View Details", href: "/land-property" },
  },
  {
    id: "3",
    title: "New Realtor Connection Request",
    timestamp: "30m ago",
    category: "Invitation",
    description: "Jamie Alvarez wants to connect with you as your dedicated land specialist.",
    unread: true,
    avatar: { initials: "JA", bgColor: "#FDE68A" },
    actions: {
      type: "dual",
      primary: { label: "Connect" },
      secondary: { label: "Ignore" },
    },
  },
  {
    id: "4",
    title: "Message from Realtor",
    timestamp: "12 min ago",
    category: "New message",
    description:
      "Sarah Jenkins: \"Hi Felix, I just got word on a new unlisted parcel that fits your criteria.\"",
    unread: true,
    actions: { type: "single", label: "Reply", href: "/message" },
  },
  {
    id: "5",
    title: "Price Drop: 38AC Montrose",
    timestamp: "12 min ago",
    category: "Price drop",
    description:
      "The listing price for 38AC Montrose, CO just dropped by $5,000 to $185,000.",
    unread: true,
    actions: { type: "single", label: "Review Deal", href: "/land-property" },
  },
]

export default function BuyerNotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Unread")

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

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    )
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="min-h-[calc(100vh-73px)] w-full bg-[#F9FAFB] font-ibm-plex-sans">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-phudu font-medium tracking-tight text-[#111827]">
              Notifications
            </h1>
            <p className="mt-1 max-w-2xl text-base text-[#6B7280]">
              Stay updated on matching parcels, saved searches, messages, and account
              activity.
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
                onConnect={markRead}
                onIgnore={removeNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
