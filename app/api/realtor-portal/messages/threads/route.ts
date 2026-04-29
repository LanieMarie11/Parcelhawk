import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { investors, users } from "@/db/schema"
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

    const rows = await db
      .select({
        buyerId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        location: users.location,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.role, "buyer"), eq(users.referralId, investor.referralUrl)))
      .orderBy(desc(users.updatedAt))

    const threads = rows.map((buyer) => ({
      buyerId: buyer.buyerId,
      name: [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
      avatarUrl: buyer.avatarUrl ?? "",
      location: buyer.location ?? "",
      lastActive: formatRelativeTime(buyer.updatedAt),
      lastMessagePreview: "Start a conversation with this buyer.",
      lastMessageAt: buyer.updatedAt.toISOString(),
      unreadCount: 0,
    }))

    return NextResponse.json({ threads })
  } catch (error) {
    console.error("Realtor message threads fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch message threads" }, { status: 500 })
  }
}
