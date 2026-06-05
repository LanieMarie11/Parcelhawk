import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, messageThreads, notifications, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { sendBuyerConnectedToRealtorNotification } from "@/lib/email/send-buyer-connected-notification"

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
      email: investors.email,
    })
    .from(investors)
    .where(eq(investors.referralUrl, referralToken))
    .limit(1)

  if (!investor?.referralUrl) {
    return NextResponse.json({ error: "Realtor not found for this referral URL" }, { status: 404 })
  }

  const [existingLinkToInvestor] = await db
    .select({ id: buyerInvestorLinks.id })
    .from(buyerInvestorLinks)
    .where(
      and(
        eq(buyerInvestorLinks.buyerId, buyerId),
        eq(buyerInvestorLinks.investorId, investor.id),
        eq(buyerInvestorLinks.status, "active"),
      ),
    )
    .limit(1)

  if (existingLinkToInvestor) {
    return NextResponse.json({ ok: true, alreadyConnected: true })
  }

  const now = new Date()

  try {
    const result = await db.transaction(async (tx) => {
      const [existingActiveLink] = await tx
        .select({
          id: buyerInvestorLinks.id,
          investorId: buyerInvestorLinks.investorId,
        })
        .from(buyerInvestorLinks)
        .where(
          and(eq(buyerInvestorLinks.buyerId, buyerId), eq(buyerInvestorLinks.status, "active")),
        )
        .limit(1)

      if (existingActiveLink && existingActiveLink.investorId !== investor.id) {
        const [existingInvestor] = await tx
          .select({ email: investors.email })
          .from(investors)
          .where(eq(investors.id, existingActiveLink.investorId))
          .limit(1)

        const existingEmail = existingInvestor?.email?.trim().toLowerCase() ?? ""
        const isDefaultRealtor =
          Boolean(DEFAULT_INVESTOR_EMAIL) && existingEmail === DEFAULT_INVESTOR_EMAIL

        if (!isDefaultRealtor) {
          return { error: "already_linked_other" as const }
        }

        // await tx
        //   .update(buyerInvestorLinks)
        //   .set({
        //     status: "ended",
        //     endedAt: now,
        //     endedBy: "buyer",
        //     endReason: "found_different_realtor",
        //     updatedAt: now,
        //   })
        //   .where(eq(buyerInvestorLinks.id, existingActiveLink.id))
  // TODO : when buyer connected with new realtor, previous messages with russell has to be deleted?

        await tx.insert(buyerInvestorLinks).values({
          buyerId,
          investorId: investor.id,
          status: "active",
          linkedVia: "referral_link",
        })
      } else if (!existingActiveLink) {
        await tx.insert(buyerInvestorLinks).values({
          buyerId,
          investorId: investor.id,
          status: "active",
          linkedVia: "referral_link",
        })
      }

      await tx
        .update(users)
        .set({ referralId: investor.referralUrl, updatedAt: now })
        .where(eq(users.id, buyerId))

      await tx
        .insert(messageThreads)
        .values({
          investorId: investor.id,
          buyerUserId: buyerId,
        })
        .onConflictDoNothing({
          target: [messageThreads.investorId, messageThreads.buyerUserId],
        })

      if (!investor.email?.trim()) {
        return { ok: true as const, emailPayload: undefined }
      }

      const [buyer] = await tx
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, buyerId))
        .limit(1)

      if (!buyer) {
        return { ok: true as const, emailPayload: undefined }
      }

      const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)"
      const realtorName =
        `${investor.firstName} ${investor.lastName}`.trim() || "their realtor"

      const [activeLink] = await tx
        .select({ id: buyerInvestorLinks.id })
        .from(buyerInvestorLinks)
        .where(
          and(
            eq(buyerInvestorLinks.buyerId, buyerId),
            eq(buyerInvestorLinks.investorId, investor.id),
            eq(buyerInvestorLinks.status, "active"),
          ),
        )
        .limit(1)

      if (activeLink) {
        await tx.insert(notifications).values({
          type: "link_invitation",
          userId: buyerId,
          investorId: investor.id,
          buyerInvestorLinkId: activeLink.id,
          title: "New buyer connected",
          body: `${buyerName} connected with ${realtorName} on ParcelHawk via ${realtorName}'s referral link.`,
          metadata: {
            type: "link-invitation",
            sender: "buyer",
            buyerName,
            status: "active",
          },
        })
      }

      return {
        ok: true as const,
        emailPayload: {
          buyerName,
          realtorName,
          investorId: investor.id,
          realtorEmail: investor.email.trim(),
        },
      }
    })

    if ("error" in result) {
      if (result.error === "already_linked_other") {
        return NextResponse.json(
          { error: "You are already connected to another realtor" },
          { status: 409 },
        )
      }
    }

    if (result.emailPayload) {
      try {
        await sendBuyerConnectedToRealtorNotification(result.emailPayload)
      } catch (emailError) {
        console.error("sendBuyerConnectedToRealtorNotification:", emailError)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Buyer realtor-referral POST error:", error)
    return NextResponse.json({ error: "Failed to connect realtor" }, { status: 500 })
  }
}
