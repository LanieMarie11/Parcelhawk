import { eq } from "drizzle-orm"
import { db } from "@/db"
import { investors } from "@/db/schema"
import { escapeHtml, sendToRealtorInbox } from "@/lib/email/resend-realtor-inbox"

export type BuyerDeletedAccountNotificationPayload = {
  buyerName: string
  realtorName: string
  investorId: string
  realtorEmail: string
}

/**
 * Notifies the realtor when a linked buyer deletes their account.
 * Does not throw: logs and returns so account deletion can still succeed.
 */
export async function sendBuyerDeletedAccountNotification(
  payload: BuyerDeletedAccountNotificationPayload,
): Promise<void> {
  const [investor] = await db
    .select({ emailNotifications: investors.emailNotifications })
    .from(investors)
    .where(eq(investors.id, payload.investorId))
    .limit(1)

  if (!investor?.emailNotifications) {
    return
  }

  const buyer = payload.buyerName.trim() || "(unknown buyer)"
  const realtor = payload.realtorName.trim() || "there"

  const textLines = [
    `Hi ${realtor},`,
    "",
    `${buyer} deleted their ParcelHawk account.`,
    "",
    "They are no longer connected to you on the platform. Their message thread and shared activity with you have been removed.",
  ]

  const b = escapeHtml(buyer)
  const r = escapeHtml(realtor)

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${r},</p>
    <p><strong>${b}</strong> deleted their ParcelHawk account.</p>
    <p style="margin-top: 1.25em;">They are no longer connected to you on the platform. Their message thread and shared activity with you have been removed.</p>
  </body>
</html>`.trim()

  await sendToRealtorInbox({
    realtorEmail: payload.realtorEmail,
    subject: `Buyer removed from your network — ${buyer}`,
    text: textLines.join("\n"),
    html,
    logTag: "buyer-deleted-account-email",
  })
}
