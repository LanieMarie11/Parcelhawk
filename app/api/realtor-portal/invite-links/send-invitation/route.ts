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
const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

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
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, "buyer")))
      .limit(1)

    if (!buyer) {
      return NextResponse.json(
        { error: "No buyer account found with this email. Share your invite link instead." },
        { status: 404 },
      )
    }

    const activeLinks = await db
      .select({
        id: buyerInvestorLinks.id,
        investorId: buyerInvestorLinks.investorId,
        investorEmail: investors.email,
      })
      .from(buyerInvestorLinks)
      .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
      .where(and(eq(buyerInvestorLinks.buyerId, buyer.id), eq(buyerInvestorLinks.status, "active")))

    const existingLinkToInvestor = activeLinks.find((link) => link.investorId === investorId)

    if (existingLinkToInvestor) {
      return NextResponse.json({ error: "This buyer is already in your network" }, { status: 409 })
    }

    const existingOtherLink = activeLinks.find((link) => {
      const existingEmail = link.investorEmail?.trim().toLowerCase() ?? ""
      const isDefaultRealtor =
        Boolean(DEFAULT_INVESTOR_EMAIL) && existingEmail === DEFAULT_INVESTOR_EMAIL
      return !isDefaultRealtor
    })

    if (existingOtherLink) {
      return NextResponse.json(
        { error: "This buyer is already linked to another realtor" },
        { status: 409 },
      )
    }

    const buyerId = buyer.id
    const realtorName =
      `${investor.firstName} ${investor.lastName}`.trim() || "A realtor"
    const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)"

    const [notification] = await db
      .insert(notifications)
      .values({
        type: "link_invitation",
        userId: buyerId,
        investorId,
        title: "Realtor invitation",
        body: `${realtorName} invited ${buyerName} to link their account on ParcelHawk.`,
        metadata: {
          type: "link-invitation",
          sender: "realtor",
          buyerId,
          investorId,
          investorName: realtorName,
          buyerName,
          linkedVia: "invitation",
          status: "pending",
        },
      })
      .returning({ id: notifications.id })

    return NextResponse.json({ ok: true, notificationId: notification?.id })
  } catch (error) {
    console.error("Realtor send-invitation error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}
