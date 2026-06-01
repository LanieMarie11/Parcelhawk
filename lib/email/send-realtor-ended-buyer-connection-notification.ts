import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { escapeHtml, sendToBuyerInbox } from "@/lib/email/resend-realtor-inbox"

export type RealtorEndedBuyerConnectionNotificationPayload = {
  buyerId: string
  buyerEmail: string
  buyerName: string
  realtorName: string
  endNote: string | null
}

/**
 * Notifies the buyer when their linked realtor ends the connection from portal settings.
 * Does not throw: logs and returns so the API can still respond success after DB updates.
 */
export async function sendRealtorEndedBuyerConnectionNotification(
  payload: RealtorEndedBuyerConnectionNotificationPayload,
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
  const realtor = payload.realtorName.trim() || "your realtor"
  const note = payload.endNote?.trim() ?? null

  const textLines = [
    `Hi ${buyerName},`,
    "",
    `${realtor} has ended your buyer–realtor connection on Parcel.`,
    ...(note ? ["", "Message from your realtor:", note] : []),
    "",
    "Your referral link association and shared message thread with them have been removed from the platform.",
  ]

  const b = escapeHtml(buyerName)
  const r = escapeHtml(realtor)
  const noteHtml = note ? escapeHtml(note).replace(/\r\n|\n|\r/g, "<br />") : null

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${b},</p>
    <p><strong>${r}</strong> has ended your buyer–realtor connection on Parcel.</p>
    ${
      noteHtml
        ? `<p style="margin-top: 1em;"><strong>Message from your realtor:</strong></p><p style="margin-top: 0;">${noteHtml}</p>`
        : ""
    }
    <p style="margin-top: 1.25em;">Your referral link association and shared message thread with them have been removed from the platform.</p>
  </body>
</html>`.trim()

  await sendToBuyerInbox({
    buyerEmail: payload.buyerEmail,
    subject: `Your realtor ended your connection — ${realtor}`,
    text: textLines.join("\n"),
    html,
    logTag: "realtor-ended-buyer-connection-email",
  })
}
