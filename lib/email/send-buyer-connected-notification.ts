import { escapeHtml, sendToRealtorInbox } from "@/lib/email/resend-realtor-inbox"

export type BuyerConnectedNotificationPayload = {
  buyerName: string
  realtorName: string
  realtorEmail: string
}

/**
 * Notifies the realtor when a new buyer signs up and links via their referral.
 * Does not throw: logs and returns so signup can still succeed.
 *
 * Kept in a separate module from viewing-request mail so route bundles do not
 * share a stale Turbopack chunk that omits this export.
 */
export async function sendBuyerConnectedToRealtorNotification(
  payload: BuyerConnectedNotificationPayload
): Promise<void> {
  const buyer = payload.buyerName.trim() || "(unknown buyer)"
  const realtor = payload.realtorName.trim() || "there"

  const textLines = [
    `Hi ${realtor},`,
    "",
    "A new buyer has connected to your account through your referral link.",
    "",
    `Buyer: ${buyer}`,
    "",
    "They can now collaborate with you on the platform (e.g. favorites, viewing requests, messages).",
  ]

  const b = escapeHtml(buyer)
  const r = escapeHtml(realtor)

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${r},</p>
    <p>A new buyer has connected to your account through your referral link.</p>
    <p><strong>Buyer:</strong> ${b}</p>
    <p style="margin-top: 1.25em;">They can now collaborate with you on the platform (for example favorites, viewing requests, and messages).</p>
  </body>
</html>`.trim()

  await sendToRealtorInbox({
    realtorEmail: payload.realtorEmail,
    subject: `New buyer connected — ${buyer}`,
    text: textLines.join("\n"),
    html,
    logTag: "buyer-connected-email",
  })
}
