import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import {
  buyerInvestorLinks,
  investors,
  messageThreads,
  messages,
  notifications,
  users,
  viewingRequests,
} from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { sendRealtorEndedBuyerConnectionNotification } from "@/lib/email/send-realtor-ended-buyer-connection-notification"

type SessionUser = {
  id?: string
  role?: string
}

const END_NOTE_MAX = 2000
const END_REASON = "realtor_removed"
const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

function normalizeEndNote(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function afterRealtorEndsBuyerConnection(ctx: {
  buyerId: string
  investorId: string
  endNote: string | null
}) {
  const [buyerRow] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, ctx.buyerId))
    .limit(1)

  const [investorRow] = await db
    .select({
      firstName: investors.firstName,
      lastName: investors.lastName,
    })
    .from(investors)
    .where(eq(investors.id, ctx.investorId))
    .limit(1)

  if (!buyerRow?.email?.trim()) {
    return
  }

  const buyerName =
    `${buyerRow.firstName} ${buyerRow.lastName}`.trim() || "there"
  const realtorName =
    `${investorRow?.firstName ?? ""} ${investorRow?.lastName ?? ""}`.trim() || "Your realtor"

  await sendRealtorEndedBuyerConnectionNotification({
    buyerId: ctx.buyerId,
    buyerEmail: buyerRow.email,
    buyerName,
    realtorName,
    endNote: ctx.endNote,
  })
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

  if (DEFAULT_INVESTOR_EMAIL) {
    const [investorRow] = await db
      .select({ email: investors.email })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    const investorEmail = investorRow?.email?.trim().toLowerCase() ?? ""
    if (investorEmail === DEFAULT_INVESTOR_EMAIL) {
      return NextResponse.json(
        { error: "Cannot manage buyer connections as the default realtor" },
        { status: 403 },
      )
    }
  }

  let body: { buyerId?: unknown; reasonNote?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const buyerId = typeof body.buyerId === "string" ? body.buyerId.trim() : ""
  if (!buyerId) {
    return NextResponse.json({ error: "Buyer is required" }, { status: 400 })
  }

  const endNote = normalizeEndNote(body.reasonNote)
  if (endNote && endNote.length > END_NOTE_MAX) {
    return NextResponse.json(
      { error: `Reason must be at most ${END_NOTE_MAX} characters` },
      { status: 400 },
    )
  }

  try {
    const now = new Date()

    const [link] = await db
      .select({
        id: buyerInvestorLinks.id,
        buyerId: buyerInvestorLinks.buyerId,
      })
      .from(buyerInvestorLinks)
      .where(
        and(
          eq(buyerInvestorLinks.investorId, investorId),
          eq(buyerInvestorLinks.buyerId, buyerId),
          eq(buyerInvestorLinks.status, "active"),
        ),
      )
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: "No active connection found for this buyer" }, { status: 409 })
    }

    const [investor] = await db
      .select({
        referralUrl: investors.referralUrl,
        firstName: investors.firstName,
        lastName: investors.lastName,
      })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    const realtorName =
      `${investor?.firstName ?? ""} ${investor?.lastName ?? ""}`.trim() || "(unknown realtor)"

    const [buyerRow] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1)

    const buyerName =
      `${buyerRow?.firstName ?? ""} ${buyerRow?.lastName ?? ""}`.trim() || "(unknown buyer)"

    let defaultReferralId: string | null = null
    if (DEFAULT_INVESTOR_EMAIL) {
      const [defaultInvestor] = await db
        .select({ referralUrl: investors.referralUrl })
        .from(investors)
        .where(eq(investors.email, DEFAULT_INVESTOR_EMAIL))
        .limit(1)

      const referralUrl = defaultInvestor?.referralUrl?.trim()
      if (referralUrl) {
        defaultReferralId = referralUrl
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(buyerInvestorLinks)
        .set({
          status: "ended",
          endedAt: now,
          endedBy: "realtor",
          endReason: END_REASON,
          endNote,
          updatedAt: now,
        })
        .where(
          and(
            eq(buyerInvestorLinks.id, link.id),
            eq(buyerInvestorLinks.investorId, investorId),
            eq(buyerInvestorLinks.buyerId, buyerId),
          ),
        )

      if (investor?.referralUrl) {
        await tx
          .update(users)
          .set({ referralId: defaultReferralId, updatedAt: now })
          .where(and(eq(users.id, buyerId), eq(users.referralId, investor.referralUrl)))
      }

      await tx.insert(notifications).values({
        type: "link_invitation",
        userId: buyerId,
        investorId,
        buyerInvestorLinkId: link.id,
        title: "Realtor connection ended",
        body: endNote
          ? `${realtorName} ended connection with ${buyerName}. Reason: ${endNote}`
          : `${realtorName} ended connection with ${buyerName}.`,
        metadata: {
          type: "link-invitation",
          sender: "realtor",
          status: "ended",
          endedAt: now.toISOString(),
          endedBy: "realtor",
          endReason: END_REASON,
          endNote: endNote ?? undefined,
        },
      })

      await tx
        .delete(viewingRequests)
        .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))

      const pairThreadRows = await tx
        .select({ id: messageThreads.id })
        .from(messageThreads)
        .where(
          and(eq(messageThreads.investorId, investorId), eq(messageThreads.buyerUserId, buyerId)),
        )
      const pairThreadIds = pairThreadRows.map((row) => row.id)
      if (pairThreadIds.length > 0) {
        await tx.delete(messages).where(inArray(messages.threadId, pairThreadIds))
      }
      await tx
        .delete(messageThreads)
        .where(
          and(eq(messageThreads.investorId, investorId), eq(messageThreads.buyerUserId, buyerId)),
        )
    })

    try {
      await afterRealtorEndsBuyerConnection({
        buyerId,
        investorId,
        endNote,
      })
    } catch (hookError) {
      console.error("afterRealtorEndsBuyerConnection:", hookError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Realtor buyer-connection POST error:", error)
    return NextResponse.json({ error: "Failed to remove buyer from network" }, { status: 500 })
  }
}
