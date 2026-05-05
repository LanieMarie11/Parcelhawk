import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { investors, messages, messageThreads, users, viewingRequests } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

function formatRelativeTime(value: Date): string {
  const now = Date.now()
  const diffMs = now - value.getTime()
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
    const [investor] = await db
      .select({ referralUrl: investors.referralUrl })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    if (!investor || !investor.referralUrl) {
      return NextResponse.json({ threads: [] })
    }

    const buyers = await db
      .select({
        buyerId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        email: users.email,
        phone: users.phone,
        location: users.location,
        preferenceBudget: users.preferenceBudget,
        preferenceAcreage: users.preferenceAcreage,
        preferencePurpose: users.preferencePurpose,
        preferenceTimeframe: users.preferenceTimeframe,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.role, "buyer"), eq(users.referralId, investor.referralUrl)))
      .orderBy(desc(users.updatedAt))

    if (buyers.length === 0) {
      return NextResponse.json({ threads: [] })
    }

    const buyerIds = buyers.map((b) => b.buyerId)
    const existingThreads = await db
      .select({
        id: messageThreads.id,
        buyerUserId: messageThreads.buyerUserId,
        investorLastReadAt: messageThreads.investorLastReadAt,
      })
      .from(messageThreads)
      .where(
        and(
          eq(messageThreads.investorId, investorId),
          inArray(messageThreads.buyerUserId, buyerIds),
        ),
      )

    const threadByBuyerId = new Map(existingThreads.map((t) => [t.buyerUserId, t.id]))
    const missingBuyerIds = buyerIds.filter((id) => !threadByBuyerId.has(id))
    if (missingBuyerIds.length > 0) {
      const created = await db
        .insert(messageThreads)
        .values(missingBuyerIds.map((buyerUserId) => ({ investorId, buyerUserId })))
        .returning({ id: messageThreads.id, buyerUserId: messageThreads.buyerUserId })
      for (const row of created) {
        threadByBuyerId.set(row.buyerUserId, row.id)
      }
    }

    const threadIds = [...threadByBuyerId.values()]
    const latestMessages = threadIds.length
      ? await db
          .select({
            threadId: messages.threadId,
            body: messages.body,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(inArray(messages.threadId, threadIds))
          .orderBy(desc(messages.createdAt))
      : []
    const latestByThread = new Map<string, { body: string; createdAt: Date }>()
    const unreadCountByThread = new Map<string, number>()
    for (const item of latestMessages) {
      if (!latestByThread.has(item.threadId)) {
        latestByThread.set(item.threadId, { body: item.body, createdAt: item.createdAt })
      }
    }
    const threadMetaById = new Map(
      existingThreads.map((thread) => [thread.id, { investorLastReadAt: thread.investorLastReadAt }]),
    )
    const messagesWithSender = threadIds.length
      ? await db
          .select({
            threadId: messages.threadId,
            senderRole: messages.senderRole,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(inArray(messages.threadId, threadIds))
      : []
    for (const item of messagesWithSender) {
      if (item.senderRole !== "buyer") continue
      const meta = threadMetaById.get(item.threadId)
      if (!meta) continue
      if (meta.investorLastReadAt && item.createdAt <= meta.investorLastReadAt) continue
      unreadCountByThread.set(item.threadId, (unreadCountByThread.get(item.threadId) ?? 0) + 1)
    }
    const viewingRows = buyerIds.length
      ? await db
          .select({
            buyerId: viewingRequests.buyerId,
            createdAt: viewingRequests.createdAt,
          })
          .from(viewingRequests)
          .where(
            and(
              eq(viewingRequests.realtorId, investorId),
              inArray(viewingRequests.buyerId, buyerIds),
            ),
          )
      : []
    for (const request of viewingRows) {
      const threadId = threadByBuyerId.get(request.buyerId)
      if (!threadId) continue
      const meta = threadMetaById.get(threadId)
      if (!meta) continue
      if (meta.investorLastReadAt && request.createdAt <= meta.investorLastReadAt) continue
      unreadCountByThread.set(threadId, (unreadCountByThread.get(threadId) ?? 0) + 1)
    }

    const threads = buyers.map((buyer) => {
      const threadId = threadByBuyerId.get(buyer.buyerId) ?? ""
      const latest = threadId ? latestByThread.get(threadId) : undefined
      return {
        threadId,
        buyerId: buyer.buyerId,
        name: [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
        avatarUrl: buyer.avatarUrl ?? "",
        email: buyer.email ?? "",
        phone: buyer.phone ?? "",
        location: buyer.location ?? "",
        preferenceBudget: buyer.preferenceBudget ?? "",
        preferenceAcreage: buyer.preferenceAcreage ?? "",
        preferencePurpose: buyer.preferencePurpose ?? "",
        preferenceTimeframe: buyer.preferenceTimeframe ?? "",
        lastActive: formatRelativeTime(buyer.updatedAt),
        lastMessagePreview: latest?.body || "Start a conversation with this buyer.",
        lastMessageAt: (latest?.createdAt ?? buyer.updatedAt).toISOString(),
        unreadCount: unreadCountByThread.get(threadId) ?? 0,
      }
    })

    return NextResponse.json({ threads })
  } catch (error) {
    console.error("Realtor message threads fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch message threads" }, { status: 500 })
  }
}
