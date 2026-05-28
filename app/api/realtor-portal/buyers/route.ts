import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import { investors, savedSearches, users, viewingRequests } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

type BuyerScore = "Hot" | "Warm" | "Cold"
const DAY_MS = 24 * 60 * 60 * 1000

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

function getHotBuyerTag(score: BuyerScore): "Hot lead" | "Warm" {
  return score === "Hot" ? "Hot lead" : "Warm"
}

function getHotBuyerAccent(score: BuyerScore): "bg-rose-500" | "bg-amber-500" {
  return score === "Hot" ? "bg-rose-500" : "bg-amber-500"
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
      return NextResponse.json({
        buyers: [],
        hotBuyers: [],
        stats: {
          totalBuyers: 0,
          hotBuyers: 0,
          viewingRequests: 0,
          parcelsPushed: 0,
        },
      })
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
        about: users.about,
      })
      .from(users)
      .where(and(eq(users.role, "buyer"), eq(users.referralId, investor.referralUrl)))
      .orderBy(desc(users.updatedAt))

    const buyerIds = buyerRows.map((row) => row.id)
    const savedSearchCountRows =
      buyerIds.length === 0
        ? []
        : await db
            .select({
              userId: savedSearches.userId,
              count: sql<number>`count(*)::int`,
            })
            .from(savedSearches)
            .where(inArray(savedSearches.userId, buyerIds))
            .groupBy(savedSearches.userId)

    const savedSearchCountByUserId = new Map(
      savedSearchCountRows.map((row) => [row.userId, Number(row.count ?? 0)]),
    )

    const buyers = buyerRows.map((buyer, index) => {
      const searchesCount = String(savedSearchCountByUserId.get(buyer.id) ?? 0)
      const score = calculateBuyerScore(buyer.lastActiveAt ?? buyer.updatedAt)
      return {
        id: buyer.id,
        name: [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
        avatarUrl: buyer.avatarUrl ?? "",
        location: buyer.location ?? "",
        joinedAt: formatJoined(buyer.createdAt),
        lastActive: formatRelativeTime(buyer.lastActiveAt ?? buyer.updatedAt),
        score,
        searches: searchesCount,
        preferenceAcreage: buyer.preferenceAcreage ?? "",
        preferenceBudget: buyer.preferenceBudget ?? "",
        preferenceTimeframe: buyer.preferenceTimeframe ?? "",
        about: buyer.about ?? "",
        action: index % 2 === 0 ? "Call Now" : "Push",
      }
    })

    const hotBuyerItems = buyers
      .filter((buyer) => buyer.score === "Hot")
      .slice(0, 3)
      .map((buyer) => ({
        id: buyer.id,
        name: buyer.name,
        avatarUrl: buyer.avatarUrl,
        activity: `Active ${buyer.lastActive}${buyer.location ? ` in ${buyer.location}` : ""}`,
        tag: getHotBuyerTag(buyer.score),
        accent: getHotBuyerAccent(buyer.score),
        cta: buyer.score === "Hot" ? "Call Now" : "Reach Out",
        ctaVariant: buyer.score === "Hot" ? "solid" : "outline",
        lastActive: buyer.lastActive,
      }))

    const now = Date.now()
    const hotBuyers = buyerRows.filter((buyer) => {
      const activityAt = buyer.lastActiveAt ?? buyer.updatedAt
      return now - activityAt.getTime() <= DAY_MS
    }).length

    const [pendingRequests] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(viewingRequests)
      .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.status, "pending")))

    const [distinctListings] = await db
      .select({ count: sql<number>`count(distinct ${viewingRequests.listingId})::int` })
      .from(viewingRequests)
      .where(eq(viewingRequests.realtorId, investorId))

    return NextResponse.json({
      buyers,
      hotBuyers: hotBuyerItems,
      stats: {
        totalBuyers: buyerRows.length,
        hotBuyers,
        viewingRequests: pendingRequests?.count ?? 0,
        parcelsPushed: distinctListings?.count ?? 0,
      },
    })
  } catch (error) {
    console.error("Realtor buyers fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 })
  }
}
