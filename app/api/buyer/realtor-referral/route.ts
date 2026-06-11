import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, notifications, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"

const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

type SessionUser = {
  id?: string
  role?: string
}

function normalizeReferralUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 512) return null

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
    const ref = url.searchParams.get("ref")?.trim()
    if (ref) return ref
  } catch {
    // treat as a plain referral code
  }

  return trimmed.length <= 128 ? trimmed : null
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const buyerId = sessionUser.id

  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { referralUrl?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const referralToken = normalizeReferralUrl(body.referralUrl)
  if (!referralToken) {
    return NextResponse.json({ error: "Invalid or missing referral URL" }, { status: 400 })
  }

  const [investor] = await db
    .select({
      id: investors.id,
      referralUrl: investors.referralUrl,
      firstName: investors.firstName,
      lastName: investors.lastName,
    })
    .from(investors)
    .where(eq(investors.referralUrl, referralToken))
    .limit(1)

  if (!investor?.referralUrl) {
    return NextResponse.json({ error: "Realtor not found for this referral URL" }, { status: 404 })
  }

  const activeLinks = await db
    .select({
      id: buyerInvestorLinks.id,
      investorId: buyerInvestorLinks.investorId,
      investorEmail: investors.email,
    })
    .from(buyerInvestorLinks)
    .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
    .where(and(eq(buyerInvestorLinks.buyerId, buyerId), eq(buyerInvestorLinks.status, "active")))

  const existingLinkToInvestor = activeLinks.find((link) => link.investorId === investor.id)

  if (existingLinkToInvestor) {
    return NextResponse.json({ error: "You are already connected to this realtor" }, { status: 409 })
  }

  const existingOtherLink = activeLinks.find((link) => {
    const existingEmail = link.investorEmail?.trim().toLowerCase() ?? ""
    const isDefaultRealtor =
      Boolean(DEFAULT_INVESTOR_EMAIL) && existingEmail === DEFAULT_INVESTOR_EMAIL
    return !isDefaultRealtor
  })

  if (existingOtherLink) {
    return NextResponse.json(
      { error: "You are already connected to another realtor" },
      { status: 409 },
    )
  }

  try {
    const [buyer] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1)

    const buyerName = `${buyer?.firstName ?? ""} ${buyer?.lastName ?? ""}`.trim() || "(unknown buyer)"
    const realtorName =
      `${investor.firstName} ${investor.lastName}`.trim() || "their realtor"

    await db.insert(notifications).values({
      type: "link_invitation",
      userId: buyerId,
      investorId: investor.id,
      title: "New buyer connected",
      body: `${buyerName} connected with ${realtorName} on ParcelHawk via ${realtorName}'s referral link.`,
      metadata: {
        type: "link-invitation",
        sender: "buyer",
        buyerId,
        investorId: investor.id,
        buyerName,
        referralToken,
        linkedVia: "referral_link",
        status: "pending",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Buyer realtor-referral POST error:", error)
    return NextResponse.json({ error: "Failed to connect realtor" }, { status: 500 })
  }
}
