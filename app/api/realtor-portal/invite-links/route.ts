import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq, gte, lt, ne, sql } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"
type SessionUser = {
  id?: string
  role?: string
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const REFERRAL_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_REFERRAL_ID_LENGTH = 128

function normalizeReferralId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_REFERRAL_ID_LENGTH) return null
  if (!REFERRAL_ID_PATTERN.test(trimmed)) return null
  return trimmed
}

function formatMonthOverMonthTrend(current: number, previous: number): string | null {
  if (previous === 0) {
    if (current === 0) return null
    return "New activity this month"
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct}% vs last month`
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

    const referralFilter = and(
      eq(buyerInvestorLinks.investorId, investorId),
      eq(buyerInvestorLinks.linkedVia, "referral_link"),
      eq(buyerInvestorLinks.status, "active")
    )

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buyerInvestorLinks)
      .where(referralFilter)

    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const nextMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1))
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    const [thisMonthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buyerInvestorLinks)
      .where(
        and(
          referralFilter,
          gte(buyerInvestorLinks.linkedAt, thisMonthStart),
          lt(buyerInvestorLinks.linkedAt, nextMonthStart)
        )
      )

    const [lastMonthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buyerInvestorLinks)
      .where(
        and(
          referralFilter,
          gte(buyerInvestorLinks.linkedAt, lastMonthStart),
          lt(buyerInvestorLinks.linkedAt, thisMonthStart)
        )
      )

    const [activeJoinedRow] =
      investor?.referralUrl != null
        ? await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
              and(
                eq(users.role, "buyer"),
                eq(users.referralId, investor.referralUrl),
                eq(users.emailVerified, true),
              ),
            )
        : [{ count: 0 }]

    const joinedThisMonth = thisMonthRow?.count ?? 0
    const joinedLastMonth = lastMonthRow?.count ?? 0

    return NextResponse.json({
      stats: {
        totalJoined: totalRow?.count ?? 0,
        joinedThisMonth,
        joinedLastMonth,
        monthOverMonthTrend: formatMonthOverMonthTrend(joinedThisMonth, joinedLastMonth),
        activeJoined: activeJoinedRow?.count ?? 0,
      },
    })
  } catch (error) {
    console.error("Realtor invite-links stats error:", error)
    return NextResponse.json({ error: "Failed to fetch invite link stats" }, { status: 500 })
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

  let body: { referralUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const referralUrl = normalizeReferralId(body.referralUrl)
  if (!referralUrl) {
    return NextResponse.json(
      {
        error:
          "Referral ID is required and may only contain letters, numbers, hyphens, and underscores (max 128 characters).",
      },
      { status: 400 }
    )
  }

  try {
    const [existing] = await db
      .select({ id: investors.id })
      .from(investors)
      .where(and(eq(investors.referralUrl, referralUrl), ne(investors.id, investorId)))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: "This referral ID is already in use" }, { status: 409 })
    }

    const updated = await db.transaction(async (tx) => {
      const [investor] = await tx
        .select({ referralUrl: investors.referralUrl })
        .from(investors)
        .where(eq(investors.id, investorId))
        .limit(1)

      const previousReferralUrl = investor?.referralUrl ?? null

      const [row] = await tx
        .update(investors)
        .set({ referralUrl })
        .where(eq(investors.id, investorId))
        .returning({ referralUrl: investors.referralUrl })

      if (!row?.referralUrl) {
        return null
      }

      if (previousReferralUrl && previousReferralUrl !== referralUrl) {
        await tx
          .update(users)
          .set({ referralId: referralUrl, updatedAt: new Date() })
          .where(
            and(eq(users.role, "buyer"), eq(users.referralId, previousReferralUrl))
          )
      }

      return row
    })

    if (!updated?.referralUrl) {
      return NextResponse.json({ error: "Failed to update referral link" }, { status: 500 })
    }

    return NextResponse.json({ referralUrl: updated.referralUrl })
  } catch (error) {
    console.error("Realtor invite-links update error:", error)
    return NextResponse.json({ error: "Failed to update referral link" }, { status: 500 })
  }
}
