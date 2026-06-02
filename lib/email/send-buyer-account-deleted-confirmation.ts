import { escapeHtml, sendToBuyerInbox } from "@/lib/email/resend-realtor-inbox"

export type BuyerAccountDeletedConfirmationPayload = {
  buyerEmail: string
  buyerName: string
  emailNotifications?: boolean | null
}

/**
 * Sends account deletion confirmation to the buyer.
 * Does not throw so account deletion flow can complete.
 */
export async function sendBuyerAccountDeletedConfirmation(
  payload: BuyerAccountDeletedConfirmationPayload,
): Promise<void> {
  if (!payload.emailNotifications) {
    return
  }

  const buyer = payload.buyerName.trim() || "there"

  const textLines = [
    `Hi ${buyer},`,
    "",
    "Your ParcelHawk account has been deleted successfully.",
    "",
    "Your personal profile, saved searches, favorites, and active buyer-realtor links have been removed from the platform.",
  ]

  const b = escapeHtml(buyer)
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${b},</p>
    <p>Your ParcelHawk account has been deleted successfully.</p>
    <p style="margin-top: 1.25em;">Your personal profile, saved searches, favorites, and active buyer-realtor links have been removed from the platform.</p>
  </body>
</html>`.trim()

  await sendToBuyerInbox({
    buyerEmail: payload.buyerEmail,
    subject: "Your ParcelHawk account has been deleted",
    text: textLines.join("\n"),
    html,
    logTag: "buyer-account-deleted-confirmation-email",
  })
}
