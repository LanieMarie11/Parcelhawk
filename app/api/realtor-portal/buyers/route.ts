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

type BuyerScore = "Hot" | "Warm" | "Cold"

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

function calculateBuyerScore(updatedAt: Date): BuyerScore {
  const diffMs = Date.now() - updatedAt.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  // Suggested baseline thresholds:
  // - Hot: active within the last 24h
  // - Warm: active within the last 7d
  // - Cold: inactive for over 7d
  // TODO: upgrade Hot logic to also include "viewing request sent"
  // when activity/event logging is available on backend.
  if (diffMs <= dayMs) return "Hot"
  if (diffMs <= 7 * dayMs) return "Warm"
  return "Cold"
}

function formatJoined(value: Date): string {
  return `Joined ${value.toLocaleString("en-US", { month: "short", year: "numeric" })}`
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
      return NextResponse.json({ buyers: [] })
    }

    const buyerRows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        location: users.location,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActiveAt: users.lastActiveAt,
        preferenceAcreage: users.preferenceAcreage,
        preferenceBudget: users.preferenceBudget,
        preferenceTimeframe: users.preferenceTimeframe,
      })
      .from(users)
      .where(and(eq(users.role, "buyer"), eq(users.referralId, investor.referralUrl)))
      .orderBy(desc(users.updatedAt))

    const buyers = buyerRows.map((buyer, index) => {
      const searchesCount = Math.max(8, 40 - index * 4).toString()
      return {
        id: buyer.id,
        name: [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
        avatarUrl: buyer.avatarUrl ?? "",
        location: buyer.location ?? "",
        joinedAt: formatJoined(buyer.createdAt),
        lastActive: formatRelativeTime(buyer.lastActiveAt ?? buyer.updatedAt),
        score: calculateBuyerScore(buyer.lastActiveAt ?? buyer.updatedAt),
        searches: searchesCount,
        preferenceAcreage: buyer.preferenceAcreage ?? "",
        preferenceBudget: buyer.preferenceBudget ?? "",
        preferenceTimeframe: buyer.preferenceTimeframe ?? "",
        action: index % 2 === 0 ? "Call Now" : "Push",
      }
    })

    return NextResponse.json({ buyers })
  } catch (error) {
    console.error("Realtor buyers fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 })
  }
}
