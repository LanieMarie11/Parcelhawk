import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { escapeHtml, sendToBuyerInbox } from "@/lib/email/resend-realtor-inbox"

export type RealtorDeletedAccountNotificationPayload = {
  buyerId: string
  buyerEmail: string
  buyerName: string
  realtorName: string
}

/**
 * Notifies a buyer when their linked realtor deletes their account.
 * Does not throw: logs and returns so account deletion can still succeed.
 */
export async function sendRealtorDeletedAccountNotification(
  payload: RealtorDeletedAccountNotificationPayload,
): Promise<void> {
  const [buyer] = await db
    .select({ emailNotifications: users.emailNotifications })
    .from(users)
    .where(eq(users.id, payload.buyerId))
    .limit(1)

  if (!buyer?.emailNotifications) {
    return
  }

  const buyerName = payload.buyerName.trim() || "there"
  const realtor = payload.realtorName.trim() || "Your realtor"

  const textLines = [
    `Hi ${buyerName},`,
    "",
    `${realtor} deleted their ParcelHawk account.`,
    "",
    "They are no longer connected to you on the platform. Your message thread and shared activity with them have been removed.",
  ]

  const b = escapeHtml(buyerName)
  const r = escapeHtml(realtor)

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${b},</p>
    <p><strong>${r}</strong> deleted their ParcelHawk account.</p>
    <p style="margin-top: 1.25em;">They are no longer connected to you on the platform. Your message thread and shared activity with them have been removed.</p>
  </body>
</html>`.trim()

  await sendToBuyerInbox({
    buyerEmail: payload.buyerEmail,
    subject: `Your realtor removed their account — ${realtor}`,
    text: textLines.join("\n"),
    html,
    logTag: "realtor-deleted-account-email",
  })
}
