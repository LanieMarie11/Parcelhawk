import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq, inArray, or } from "drizzle-orm"
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
import { sendBuyerEndedRealtorConnectionNotification } from "@/lib/email/send-buyer-ended-realtor-connection-notification"

type SessionUser = {
  id?: string
  role?: string
}

const ALLOWED_REASONS = new Set([
  "not_responsive_enough",
  "search_area_changed",
  "found_different_realtor",
  "not_good_fit",
  "other",
])

const OTHER_NOTE_MAX = 2000
const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

function normalizeOtherNote(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Post-commit side effects (e.g. realtor email). Errors are logged and do not fail the HTTP response.
 */
async function afterBuyerEndsRealtorConnection(ctx: {
  buyerId: string
  investorId: string
  reason: string
  endNote: string | null
}) {
  const [buyerRow] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, ctx.buyerId))
    .limit(1)

  const [investorRow] = await db
    .select({
      firstName: investors.firstName,
      lastName: investors.lastName,
      email: investors.email,
    })
    .from(investors)
    .where(eq(investors.id, ctx.investorId))
    .limit(1)

  if (!buyerRow || !investorRow?.email?.trim()) {
    return
  }

  const buyerName =
    `${buyerRow.firstName} ${buyerRow.lastName}`.trim() || "(unknown buyer)"
  const realtorName =
    `${investorRow.firstName} ${investorRow.lastName}`.trim() || "there"

  await sendBuyerEndedRealtorConnectionNotification({
    buyerName,
    realtorName,
    investorId: ctx.investorId,
    realtorEmail: investorRow.email,
    reason: ctx.reason,
    endNote: ctx.endNote,
  })
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

  let body: { reason?: unknown; otherNote?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const reasonRaw = body.reason
  if (typeof reasonRaw !== "string" || !ALLOWED_REASONS.has(reasonRaw)) {
    return NextResponse.json({ error: "Invalid or missing reason" }, { status: 400 })
  }

  const otherNote = normalizeOtherNote(body.otherNote)
  if (reasonRaw === "other" && !otherNote) {
    return NextResponse.json(
      { error: "otherNote is required when reason is other" },
      { status: 400 },
    )
  }

  if (otherNote && otherNote.length > OTHER_NOTE_MAX) {
    return NextResponse.json(
      { error: `otherNote must be at most ${OTHER_NOTE_MAX} characters` },
      { status: 400 },
    )
  }

  const endNote = reasonRaw === "other" ? otherNote : null

  try {
    const now = new Date()
    const [link] = await db
      .select({
        id: buyerInvestorLinks.id,
        investorId: buyerInvestorLinks.investorId,
        investorEmail: investors.email,
      })
      .from(buyerInvestorLinks)
      .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
      .where(and(eq(buyerInvestorLinks.buyerId, buyerId), eq(buyerInvestorLinks.status, "active")))
      .orderBy(desc(buyerInvestorLinks.linkedAt))
      .limit(1)

    if (!link) {
      return NextResponse.json({ error: "No active realtor connection found" }, { status: 409 })
    }

    const investorEmail = link.investorEmail?.trim().toLowerCase() ?? ""
    if (DEFAULT_INVESTOR_EMAIL && investorEmail === DEFAULT_INVESTOR_EMAIL) {
      return NextResponse.json(
        { error: "Cannot end connection with your default realtor" },
        { status: 403 },
      )
    }

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

    await db.transaction(async (tx) => {
      await tx
        .update(buyerInvestorLinks)
        .set({
          status: "ended",
          endedAt: now,
          endedBy: "buyer",
          endReason: reasonRaw,
          endNote,
          updatedAt: now,
        })
        .where(and(eq(buyerInvestorLinks.id, link.id), eq(buyerInvestorLinks.buyerId, buyerId)))

      await tx
        .update(users)
        .set({ referralId: null, updatedAt: now })
        .where(eq(users.id, buyerId))

      // await tx
      //   .delete(notifications)
      //   .where(
      //     and(eq(notifications.userId, buyerId), eq(notifications.investorId, link.investorId)),
      //   )

      const [inserted] = await tx
        .insert(notifications)
        .values({
          type: "link_invitation",
          userId: buyerId,
          investorId: link.investorId,
          buyerInvestorLinkId: link.id,
          title: "Realtor connection ended",
          body: endNote
            ? `${buyerName} ended connection with realtor. Reason: ${endNote}`
            : `${buyerName} ended connection with realtor.`,
          metadata: {
            type: "link-invitation",
            sender: "buyer",
            status: "ended",
            endedAt: now.toISOString(),
            endedBy: "buyer",
            endReason: reasonRaw,
            endNote: endNote ?? undefined,
          },
        })
        .returning({ id: notifications.id })

      await tx
        .delete(viewingRequests)
        .where(
          and(eq(viewingRequests.realtorId, link.investorId), eq(viewingRequests.buyerId, buyerId)),
        )

      const pairThreadRows = await tx
        .select({ id: messageThreads.id })
        .from(messageThreads)
        .where(
          and(
            eq(messageThreads.investorId, link.investorId),
            eq(messageThreads.buyerUserId, buyerId),
          ),
        )
      const pairThreadIds = pairThreadRows.map((row) => row.id)
      if (pairThreadIds.length > 0) {
        await tx.delete(messages).where(inArray(messages.threadId, pairThreadIds))
      }
      await tx
        .delete(messageThreads)
        .where(
          and(
            eq(messageThreads.investorId, link.investorId),
            eq(messageThreads.buyerUserId, buyerId),
          ),
        )
    })
    try {
      await afterBuyerEndsRealtorConnection({
        buyerId,
        investorId: link.investorId,
        reason: reasonRaw,
        endNote,
      })
    } catch (hookError) {
      console.error("afterBuyerEndsRealtorConnection:", hookError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Buyer realtor-connection POST error:", error)
    return NextResponse.json({ error: "Failed to end realtor connection" }, { status: 500 })
  }
}
