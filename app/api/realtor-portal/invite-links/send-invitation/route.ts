import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, notifications, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null
  return trimmed
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

  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = normalizeEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: "A valid buyer email is required" }, { status: 400 })
  }

  try {
    const [investor] = await db
      .select({
        firstName: investors.firstName,
        lastName: investors.lastName,
      })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    if (!investor) {
      return NextResponse.json({ error: "Investor profile not found" }, { status: 404 })
    }

    const [buyer] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, "buyer")))
      .limit(1)

    if (!buyer) {
      return NextResponse.json(
        { error: "No buyer account found with this email. Share your invite link instead." },
        { status: 404 },
      )
    }

    const [existingLink] = await db
      .select({
        id: buyerInvestorLinks.id,
        investorId: buyerInvestorLinks.investorId,
      })
      .from(buyerInvestorLinks)
      .where(and(eq(buyerInvestorLinks.buyerId, buyer.id), eq(buyerInvestorLinks.status, "active")))
      .limit(1)

    if (existingLink) {
      if (existingLink.investorId === investorId) {
        return NextResponse.json({ error: "This buyer is already in your network" }, { status: 409 })
      }
      return NextResponse.json(
        { error: "This buyer is already linked to another realtor" },
        { status: 409 },
      )
    }

    const realtorName =
      `${investor.firstName} ${investor.lastName}`.trim() || "A realtor"

    const [notification] = await db
      .insert(notifications)
      .values({
        type: "link_invitation",
        userId: buyer.id,
        investorId,
        title: "Realtor invitation",
        body: `${realtorName} invited you to link your account on ParcelHawk.`,
        metadata: { investorName: realtorName, status: "pending" },
      })
      .returning({ id: notifications.id })

    return NextResponse.json({ ok: true, notificationId: notification.id })
  } catch (error) {
    console.error("Realtor send-invitation error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}
