import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  buyerInvestorLinks,
  investors,
  messageThreads,
  notifications,
  users,
} from "@/db/schema"
import { sendBuyerConnectedToRealtorNotification } from "@/lib/email/send-buyer-connected-notification"

/**
 * After a buyer verifies their email, activates any pending realtor links from signup,
 * creates the message thread, buyer in-app notification, and realtor email.
 * Idempotent: only processes links still in `pending` status.
 */
export async function activatePendingBuyerRealtorConnections(
  buyerId: string,
): Promise<void> {
  const [buyer] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, buyerId))
    .limit(1)

  if (!buyer) return

  const pendingLinks = await db
    .select({
      linkId: buyerInvestorLinks.id,
      linkedVia: buyerInvestorLinks.linkedVia,
      investorId: investors.id,
      investorFirstName: investors.firstName,
      investorLastName: investors.lastName,
      investorEmail: investors.email,
    })
    .from(buyerInvestorLinks)
    .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
    .where(
      and(
        eq(buyerInvestorLinks.buyerId, buyerId),
        eq(buyerInvestorLinks.status, "pending"),
      ),
    )

  if (pendingLinks.length === 0) return

  const buyerDisplayName =
    `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)"
  const now = new Date()

  for (const row of pendingLinks) {
    const realtorDisplayName =
      `${row.investorFirstName} ${row.investorLastName}`.trim() || "A realtor"

    await db.transaction(async (tx) => {
      await tx
        .update(buyerInvestorLinks)
        .set({
          status: "active",
          linkedAt: now,
          updatedAt: now,
        })
        .where(eq(buyerInvestorLinks.id, row.linkId))

      await tx
        .insert(messageThreads)
        .values({
          investorId: row.investorId,
          buyerUserId: buyerId,
        })
        .onConflictDoNothing({
          target: [messageThreads.investorId, messageThreads.buyerUserId],
        })

      if (row.linkedVia === "default") {
        await tx.insert(notifications).values({
          type: "link_invitation",
          userId: buyerId,
          investorId: row.investorId,
          buyerInvestorLinkId: row.linkId,
          title: "New buyer connected",
          body: `${buyerDisplayName} signed up and was connected to your account on ParcelHawk.`,
          metadata: {
            type: "link-invitation",
            sender: "buyer",
            buyerName: buyerDisplayName,
            status: "active",
          },
        })
      } else {
        await tx.insert(notifications).values({
          type: "link_invitation",
          userId: buyerId,
          investorId: row.investorId,
          buyerInvestorLinkId: row.linkId,
          title: "Realtor invitation",
          body: `${realtorDisplayName} invited ${buyerDisplayName} to link their account on ParcelHawk.`,
          metadata: {
            type: "link-invitation",
            sender: "realtor",
            investorName: realtorDisplayName,
            status: "active",
          },
        })
      }
    })

    const realtorEmail = row.investorEmail?.trim()
    if (!realtorEmail) continue

    try {
      await sendBuyerConnectedToRealtorNotification({
        buyerName: buyerDisplayName,
        realtorName: realtorDisplayName,
        investorId: row.investorId,
        realtorEmail,
      })
    } catch (emailError) {
      console.error("sendBuyerConnectedToRealtorNotification:", emailError)
    }
  }
}
