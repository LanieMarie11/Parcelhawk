import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, investors, messageThreads, users } from "@/db/schema"

const DEFAULT_INVESTOR_EMAIL = process.env.DEFAULT_EMAIL?.trim().toLowerCase() ?? ""

/** Active link with status `active` and realtor_flag `active`. */
export async function getActiveRealtorInvestorId(buyerId: string): Promise<string | null> {
  const [linkRow] = await db
    .select({ investorId: buyerInvestorLinks.investorId })
    .from(buyerInvestorLinks)
    .where(
      and(
        eq(buyerInvestorLinks.buyerId, buyerId),
        eq(buyerInvestorLinks.status, "active"),
        eq(buyerInvestorLinks.realtorFlag, "active")
      )
    )
    .orderBy(desc(buyerInvestorLinks.linkedAt))
    .limit(1)

  return linkRow?.investorId ?? null
}

/**
 * Links buyer to DEFAULT_EMAIL investor: buyer_investor_links, message_threads,
 * and users.referral_id. Returns investor id or null.
 */
export async function connectBuyerToDefaultInvestor(buyerId: string): Promise<string | null> {
  if (!DEFAULT_INVESTOR_EMAIL) return null

  const [defaultInvestor] = await db
    .select({ id: investors.id, referralUrl: investors.referralUrl })
    .from(investors)
    .where(eq(investors.email, DEFAULT_INVESTOR_EMAIL))
    .limit(1)

  const referralUrl = defaultInvestor?.referralUrl?.trim() ?? ""
  if (!defaultInvestor || !referralUrl) return null

  await db.insert(buyerInvestorLinks).values({
    buyerId,
    investorId: defaultInvestor.id,
    status: "active",
    linkedVia: "default",
  })

  await db
    .insert(messageThreads)
    .values({
      investorId: defaultInvestor.id,
      buyerUserId: buyerId,
    })
    .onConflictDoNothing({
      target: [messageThreads.investorId, messageThreads.buyerUserId],
    })

  await db
    .update(users)
    .set({ referralId: referralUrl, updatedAt: new Date() })
    .where(eq(users.id, buyerId))

  return defaultInvestor.id
}

/** Existing active realtor link, or connect via DEFAULT_EMAIL when missing. */
export async function ensureActiveRealtorInvestorId(buyerId: string): Promise<string | null> {
  const existing = await getActiveRealtorInvestorId(buyerId)
  if (existing) return existing
  return connectBuyerToDefaultInvestor(buyerId)
}

/** Ensures an active realtor link and a message thread exist for the buyer. */
export async function ensureBuyerMessageThread(buyerId: string): Promise<string | null> {
  const realtorId = await ensureActiveRealtorInvestorId(buyerId)
  if (!realtorId) return null

  await db
    .insert(messageThreads)
    .values({
      investorId: realtorId,
      buyerUserId: buyerId,
    })
    .onConflictDoNothing({
      target: [messageThreads.investorId, messageThreads.buyerUserId],
    })

  return realtorId
}
