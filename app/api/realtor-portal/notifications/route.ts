import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/db"
import {
  landListings,
  notifications,
  users,
  viewingRequests,
  type NotificationMetadata,
} from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

export type RealtorNotificationAction =
  | { type: "single"; label: string; href?: string }
  | {
      type: "dual"
      primary: { label: string; href?: string }
      secondary: { label: string }
    }

export type RealtorNotificationItem = {
  id: string
  title: string
  timestamp: string
  readAt?: string
  category: string
  description: string
  unread: boolean
  avatar?: {
    initials: string
    bgColor: string
  }
  actions: RealtorNotificationAction
}

const AVATAR_COLORS = ["#FDE68A", "#BFDBFE", "#FECACA", "#BBF7D0", "#E9D5FF"]

function formatRelativeTime(value: Date): string {
  const diffMs = Date.now() - value.getTime()
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs))
    return `${minutes} min ago`
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs))
    return `${hours}h ago`
  }
  if (diffMs < 2 * dayMs) {
    return "Yesterday"
  }
  const days = Math.floor(diffMs / dayMs)
  return `${days}d ago`
}

function avatarColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]
}

function buyerInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim()?.[0] ?? ""
  const last = lastName?.trim()?.[0] ?? ""
  const initials = `${first}${last}`.toUpperCase()
  return initials || "?"
}

function formatBuyerName(
  firstName: string | null,
  lastName: string | null,
  metadata: NotificationMetadata | null,
): string {
  const fromMetadata = metadata?.buyerName?.trim()
  if (fromMetadata) return fromMetadata
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim()
  return name.length > 0 ? name : "A buyer"
}

function isRealtorUnread(realtorReadAt: Date | null): boolean {
  return realtorReadAt == null
}

function viewingRequestDetailsHref(
  listingUrl: string | null,
  listingId: number | null,
): string {
  const url = listingUrl?.trim()
  if (url) return url
  if (listingId != null) return `/property?id=${listingId}`
  return "/realtor-portal/my-buyers"
}

function mapNotificationRow(row: {
  id: string
  type: "viewing_request" | "link_invitation"
  title: string | null
  body: string | null
  realtorReadAt: Date | null
  createdAt: Date
  metadata: NotificationMetadata | null
  buyerUserId: string
  buyerFirstName: string | null
  buyerLastName: string | null
  listingId: number | null
  listingUrl: string | null
  listingTitle: string | null
  viewingStatus: string | null
}): RealtorNotificationItem | null {
  const buyerName = formatBuyerName(row.buyerFirstName, row.buyerLastName, row.metadata)
  const avatar = {
    initials: buyerInitials(row.buyerFirstName, row.buyerLastName),
    bgColor: avatarColor(row.buyerUserId),
  }
  const readAtIso = row.realtorReadAt ? row.realtorReadAt.toISOString() : undefined

  if (row.type === "link_invitation") {
    const isPending = row.metadata?.status === "pending" || row.metadata?.status == null

    if (isPending) {
      return {
        id: row.id,
        title: row.title ?? "Connection invite sent",
        timestamp: formatRelativeTime(row.createdAt),
        readAt: readAtIso,
        category: "Invitation",
        description:
          row.body ??
          `You invited ${buyerName} to connect on ParcelHawk. Waiting for their response.`,
        unread: isRealtorUnread(row.realtorReadAt),
        avatar,
        actions: {
          type: "single",
          label: "View buyers",
        },
      }
    }

    return {
      id: row.id,
      title: row.title ?? "Buyer connection update",
      timestamp: formatRelativeTime(row.createdAt),
      readAt: readAtIso,
      category: "Invitation",
      description: row.body ?? `${buyerName} updated their connection status.`,
      unread: isRealtorUnread(row.realtorReadAt),
      avatar,
      actions: {
        type: "single",
        label: "View buyers",
      },
    }
  }

  const listingLabel = row.metadata?.listingTitle ?? row.listingTitle ?? "a parcel"
  const status = row.viewingStatus ?? row.metadata?.status

  return {
    id: row.id,
    title: row.title === "Viewing request submitted" ? "New viewing request" : (row.title ?? "Viewing request"),
    timestamp: formatRelativeTime(row.createdAt),
    readAt: readAtIso,
    category: "Viewing request",
    description:
      status && status !== "pending"
        ? `${buyerName}'s viewing request for ${listingLabel} is now ${status}.`
        : `${buyerName} requested a viewing for ${listingLabel}.`,
    unread: isRealtorUnread(row.realtorReadAt),
    avatar,
    actions: {
      type: "single",
      label: "View Details",
      href: viewingRequestDetailsHref(row.listingUrl, row.listingId),
    },
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const investorId = sessionUser.id

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        realtorReadAt: notifications.realtorReadAt,
        createdAt: notifications.createdAt,
        metadata: notifications.metadata,
        buyerUserId: notifications.userId,
        buyerFirstName: users.firstName,
        buyerLastName: users.lastName,
        listingId: notifications.listingId,
        listingTitle: landListings.title,
        listingUrl: landListings.url,
        viewingStatus: viewingRequests.status,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.userId, users.id))
      .leftJoin(viewingRequests, eq(notifications.viewingRequestId, viewingRequests.id))
      .leftJoin(landListings, eq(notifications.listingId, landListings.id))
      .where(and(eq(notifications.investorId, investorId), isNull(notifications.realtorDeleteAt)))
      .orderBy(desc(notifications.createdAt))

    const notificationsList = rows
      .map(mapNotificationRow)
      .filter((item): item is RealtorNotificationItem => item != null)

    return NextResponse.json({ notifications: notificationsList })
  } catch (error) {
    console.error("Realtor notifications fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const investorId = sessionUser.id

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { id?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id.trim() : ""
  const action = typeof body.action === "string" ? body.action.trim() : ""

  if (!id) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 })
  }

  if (action !== "read" && action !== "delete") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  try {
    const now = new Date()
    const [existing] = await db
      .select({
        id: notifications.id,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.investorId, investorId)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    if (action === "delete") {
      const [deleted] = await db
        .update(notifications)
        .set({ realtorReadAt: now, realtorDeleteAt: now, updatedAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.investorId, investorId)))
        .returning({ id: notifications.id })

      if (!deleted) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 })
      }

      return NextResponse.json({ ok: true })
    }

    const [updated] = await db
      .update(notifications)
      .set({ realtorReadAt: now, updatedAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.investorId, investorId)))
      .returning({ id: notifications.id })

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Realtor notification action error:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}
