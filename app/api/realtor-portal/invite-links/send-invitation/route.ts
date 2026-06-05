import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, messageThreads, notifications, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { sendBuyerConnectedToRealtorNotification } from "@/lib/email/send-buyer-connected-notification"

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
        referralUrl: investors.referralUrl,
        email: investors.email,
      })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    if (!investor?.referralUrl) {
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

    const [existingLink] = await db
      .select({
        id: buyerInvestorLinks.id,
        investorId: buyerInvestorLinks.investorId,
        investorEmail: investors.email,
      })
      .from(buyerInvestorLinks)
      .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
      .where(and(eq(buyerInvestorLinks.buyerId, buyer.id), eq(buyerInvestorLinks.status, "active")))
      .limit(1)

    if (existingLink) {
      if (existingLink.investorId === investorId) {
        return NextResponse.json({ error: "This buyer is already in your network" }, { status: 409 })
      }

      const existingEmail = existingLink.investorEmail?.trim().toLowerCase() ?? ""
      const isDefaultRealtor =
        Boolean(DEFAULT_INVESTOR_EMAIL) && existingEmail === DEFAULT_INVESTOR_EMAIL

      if (!isDefaultRealtor) {
        return NextResponse.json(
          { error: "This buyer is already linked to another realtor" },
          { status: 409 },
        )
      }
    }

    const now = new Date()
    const buyerId = buyer.id
    const realtorName =
      `${investor.firstName} ${investor.lastName}`.trim() || "A realtor"
    const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)"

    const result = await db.transaction(async (tx) => {
      if (existingLink) {
        // await tx
        //   .update(buyerInvestorLinks)
        //   .set({
        //     status: "ended",
        //     endedAt: now,
        //     endedBy: "realtor",
        //     endReason: "realtor_invitation",
        //     updatedAt: now,
        //   })
        //   .where(eq(buyerInvestorLinks.id, existingLink.id))

        await tx.insert(buyerInvestorLinks).values({
          buyerId,
          investorId,
          status: "active",
          linkedVia: "invitation",
        })
      } else {
        await tx.insert(buyerInvestorLinks).values({
          buyerId,
          investorId,
          status: "active",
          linkedVia: "invitation",
        })
      }

      await tx
        .update(users)
        .set({ referralId: investor.referralUrl, updatedAt: now })
        .where(eq(users.id, buyerId))

      await tx
        .insert(messageThreads)
        .values({
          investorId,
          buyerUserId: buyerId,
        })
        .onConflictDoNothing({
          target: [messageThreads.investorId, messageThreads.buyerUserId],
        })

      const [activeLink] = await tx
        .select({ id: buyerInvestorLinks.id })
        .from(buyerInvestorLinks)
        .where(
          and(
            eq(buyerInvestorLinks.buyerId, buyerId),
            eq(buyerInvestorLinks.investorId, investorId),
            eq(buyerInvestorLinks.status, "active"),
          ),
        )
        .limit(1)

      let notificationId: string | undefined
      if (activeLink) {
        const [notification] = await tx
          .insert(notifications)
          .values({
            type: "link_invitation",
            userId: buyerId,
            investorId,
            buyerInvestorLinkId: activeLink.id,
            title: "New realtor connection",
            body: `${realtorName} connected with you on ParcelHawk.`,
            metadata: {
              type: "link-invitation",
              sender: "realtor",
              investorName: realtorName,
              status: "active",
            },
          })
          .returning({ id: notifications.id })
        notificationId = notification?.id
      }

      if (!investor.email?.trim()) {
        return { ok: true as const, notificationId, emailPayload: undefined }
      }

      return {
        ok: true as const,
        notificationId,
        emailPayload: {
          buyerName,
          realtorName,
          investorId,
          realtorEmail: investor.email.trim(),
        },
      }
    })

    if (result.emailPayload) {
      try {
        await sendBuyerConnectedToRealtorNotification(result.emailPayload)
      } catch (emailError) {
        console.error("sendBuyerConnectedToRealtorNotification:", emailError)
      }
    }

    return NextResponse.json({ ok: true, notificationId: result.notificationId })
  } catch (error) {
    console.error("Realtor send-invitation error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}
