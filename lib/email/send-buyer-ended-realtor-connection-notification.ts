import { escapeHtml, sendToRealtorInbox } from "@/lib/email/resend-realtor-inbox"

const END_REASON_LABELS: Record<string, string> = {
  not_responsive_enough: "Not responsive enough",
  search_area_changed: "Search area changed",
  found_different_realtor: "Found a different realtor",
  not_good_fit: "Not a good fit",
  other: "Other",
}

export type BuyerEndedRealtorConnectionNotificationPayload = {
  buyerName: string
  realtorName: string
  realtorEmail: string
  /** Stored `end_reason` key from `buyer_investor_links`. */
  reason: string
  /** Populated when reason is `other`; optional context for the realtor. */
  endNote: string | null
}

function reasonLabelForEmail(reason: string): string {
  return END_REASON_LABELS[reason] ?? reason
}

/**
 * Notifies the realtor when a linked buyer ends the relationship from profile settings.
 * Does not throw: logs and returns so the API can still respond success after DB updates.
 */
export async function sendBuyerEndedRealtorConnectionNotification(
  payload: BuyerEndedRealtorConnectionNotificationPayload
): Promise<void> {
  const buyer = payload.buyerName.trim() || "(unknown buyer)"
  const realtor = payload.realtorName.trim() || "there"
  const reasonLabel = reasonLabelForEmail(payload.reason.trim())
  const note = payload.endNote?.trim() ?? null

  const textLines = [
    `Hi ${realtor},`,
    "",
    `${buyer} has ended the buyer–realtor connection with you on Parcel.`,
    "",
    `Reason selected: ${reasonLabel}`,
    ...(note ? ["", "Additional detail from the buyer:", note] : []),
    "",
    "Their referral link association and shared message thread with you have been removed from the platform.",
  ]

  const b = escapeHtml(buyer)
  const r = escapeHtml(realtor)
  const rl = escapeHtml(reasonLabel)
  const noteHtml = note ? escapeHtml(note).replace(/\r\n|\n|\r/g, "<br />") : null

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${r},</p>
    <p><strong>${b}</strong> has ended the buyer–realtor connection with you on Parcel.</p>
    <p><strong>Reason selected:</strong> ${rl}</p>
    ${
      noteHtml
        ? `<p style="margin-top: 1em;"><strong>Additional detail from the buyer:</strong></p><p style="margin-top: 0;">${noteHtml}</p>`
        : ""
    }
    <p style="margin-top: 1.25em;">Their referral link association and shared message thread with you have been removed from the platform.</p>
  </body>
</html>`.trim()

  await sendToRealtorInbox({
    realtorEmail: payload.realtorEmail,
    subject: `Buyer ended your connection — ${buyer}`,
    text: textLines.join("\n"),
    html,
    logTag: "buyer-ended-realtor-connection-email",
  })
}
