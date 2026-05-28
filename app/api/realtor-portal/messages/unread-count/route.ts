import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq, gt, isNull, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { messages, messageThreads, notifications, type NotificationMetadata, viewingRequests } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
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
    const [messageResult] = await db
      .select({
        unreadCount: sql<number>`count(*)`,
      })
      .from(messages)
      .innerJoin(messageThreads, eq(messages.threadId, messageThreads.id))
      .where(
        and(
          eq(messageThreads.investorId, investorId),
          eq(messages.senderRole, "buyer"),
          or(
            isNull(messageThreads.investorLastReadAt),
            gt(messages.createdAt, messageThreads.investorLastReadAt),
          ),
        ),
      )

    const [viewingRequestResult] = await db
      .select({
        unreadCount: sql<number>`count(*)`,
      })
      .from(viewingRequests)
      .innerJoin(
        messageThreads,
        and(
          eq(messageThreads.investorId, investorId),
          eq(viewingRequests.buyerId, messageThreads.buyerUserId),
        ),
      )
      .where(
        and(
          eq(viewingRequests.realtorId, investorId),
          or(
            isNull(messageThreads.investorLastReadAt),
            gt(viewingRequests.createdAt, messageThreads.investorLastReadAt),
          ),
        ),
      )

    const notificationRows = await db
      .select({ metadata: notifications.metadata })
      .from(notifications)
      .where(and(eq(notifications.investorId, investorId), isNull(notifications.dismissedAt)))

    const notificationUnreadCount = notificationRows.reduce((count, row) => {
      const metadata = row.metadata as NotificationMetadata | null
      if (metadata?.sender === "realtor") return count
      return metadata?.realtorReadAt == null ? count + 1 : count
    }, 0)

    const unreadCount =
      Number(messageResult?.unreadCount ?? 0) + Number(viewingRequestResult?.unreadCount ?? 0)

    return NextResponse.json({ unreadCount, notificationUnreadCount })
  } catch (error) {
    console.error("Unread message count fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch unread message count" }, { status: 500 })
  }
}
