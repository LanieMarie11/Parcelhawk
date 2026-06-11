import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, messageThreads, messages, users } from "@/db/schema"
import { sendBuyerConnectedToRealtorNotification } from "@/lib/email/send-buyer-connected-notification"

const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

export type FinalizeRealtorInvitationConnectionResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Completes a realtor-initiated buyer invitation after the buyer accepts the notification.
 */
export async function finalizeRealtorInvitationConnection(ctx: {
  buyerId: string
  investorId: string
}): Promise<FinalizeRealtorInvitationConnectionResult> {
  const now = new Date()

  const [investor] = await db
    .select({
      id: investors.id,
      referralUrl: investors.referralUrl,
      firstName: investors.firstName,
      lastName: investors.lastName,
      email: investors.email,
    })
    .from(investors)
    .where(eq(investors.id, ctx.investorId))
    .limit(1)

  if (!investor?.referralUrl) {
    throw new Error("Investor not found or missing referral URL")
  }

  const activeLinks = await db
    .select({
      id: buyerInvestorLinks.id,
      investorId: buyerInvestorLinks.investorId,
      investorEmail: investors.email,
    })
    .from(buyerInvestorLinks)
    .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
    .where(
      and(eq(buyerInvestorLinks.buyerId, ctx.buyerId), eq(buyerInvestorLinks.status, "active")),
    )

  if (activeLinks.some((link) => link.investorId === ctx.investorId)) {
    return { ok: false, error: "You are already connected to this realtor" }
  }

  const connectedToOtherRealtor = activeLinks.some((link) => {
    const existingEmail = link.investorEmail?.trim().toLowerCase() ?? ""
    const isDefaultRealtor =
      Boolean(DEFAULT_INVESTOR_EMAIL) && existingEmail === DEFAULT_INVESTOR_EMAIL
    return !isDefaultRealtor
  })

  if (connectedToOtherRealtor) {
    return { ok: false, error: "You are already connected to another realtor" }
  }

  await db.transaction(async (tx) => {
    const existingThreadRows = await tx
      .select({ id: messageThreads.id })
      .from(messageThreads)
      .where(eq(messageThreads.buyerUserId, ctx.buyerId))

    const existingThreadIds = existingThreadRows.map((row) => row.id)
    if (existingThreadIds.length > 0) {
      await tx.delete(messages).where(inArray(messages.threadId, existingThreadIds))
    }

    await tx.delete(messageThreads).where(eq(messageThreads.buyerUserId, ctx.buyerId))

    await tx.insert(buyerInvestorLinks).values({
      buyerId: ctx.buyerId,
      investorId: investor.id,
      status: "active",
      linkedVia: "invitation",
    })

    await tx
      .update(users)
      .set({ referralId: investor.referralUrl, updatedAt: now })
      .where(eq(users.id, ctx.buyerId))

    await tx
      .insert(messageThreads)
      .values({
        investorId: investor.id,
        buyerUserId: ctx.buyerId,
      })
      .onConflictDoNothing({
        target: [messageThreads.investorId, messageThreads.buyerUserId],
      })
  })

  if (!investor.email?.trim()) {
    return { ok: true }
  }

  const [buyer] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, ctx.buyerId))
    .limit(1)

  if (!buyer) {
    return { ok: true }
  }

  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)"
  const realtorName = `${investor.firstName} ${investor.lastName}`.trim() || "their realtor"

  try {
    await sendBuyerConnectedToRealtorNotification({
      buyerName,
      realtorName,
      investorId: investor.id,
      realtorEmail: investor.email.trim(),
    })
  } catch (emailError) {
    console.error("sendBuyerConnectedToRealtorNotification:", emailError)
  }

  return { ok: true }
}
