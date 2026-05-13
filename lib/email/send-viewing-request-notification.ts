import { Resend } from "resend"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export type ViewingRequestNotificationPayload = {
  viewingRequestId: string
  listingId: number
  listingTitle: string | null
  listingLocation: string | null
  buyerName: string
  realtorName: string
  /** Linked investor (realtor) inbox — must be deliverable in Resend. */
  realtorEmail: string
  buyerNote: string | null
}

/**
 * Sends a transactional email when a buyer creates a viewing request.
 * Does not throw: logs and returns so the HTTP handler can still succeed.
 */
export async function sendViewingRequestCreatedNotification(
  payload: ViewingRequestNotificationPayload
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM
  if (!apiKey?.trim() || !from?.trim()) {
    console.warn(
      "[viewing-request-email] RESEND_API_KEY or RESEND_FROM_EMAIL is missing; skipping notification"
    )
    return
  }

  const to = payload.realtorEmail.trim()
  if (!to) {
    console.warn("[viewing-request-email] realtorEmail is empty; skipping notification")
    return
  }

  const location =
    payload.listingLocation?.trim() ||
    (payload.listingTitle?.trim() ? null : `Listing #${payload.listingId}`)
  const titleLine = payload.listingTitle?.trim() || "(no title)"
  const locationLine = location ?? "(no address on file)"

  const textLines = [
    "A new land viewing request was created.",
    "",
    `Title: ${titleLine}`,
    `Location: ${locationLine}`,
    `Buyer: ${payload.buyerName}`,
    `Realtor: ${payload.realtorName}`,
    "",
    payload.buyerNote
      ? `Buyer note:\n${payload.buyerNote}`
      : "Buyer note: (none)",
  ]

  const e = {
    id: escapeHtml(payload.viewingRequestId),
    listingId: String(payload.listingId),
    title: escapeHtml(titleLine),
    location: escapeHtml(locationLine),
    buyer: escapeHtml(payload.buyerName),
    realtor: escapeHtml(payload.realtorName),
    note: payload.buyerNote
      ? escapeHtml(payload.buyerNote).replace(/\r\n|\n|\r/g, "<br />")
      : null,
  }

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>A new land viewing request was created.</p>
    <p><strong>Request ID:</strong> ${e.id}</p>
    <p><strong>Listing ID:</strong> ${e.listingId}</p>
    <p><strong>Title:</strong> ${e.title}</p>
    <p><strong>Location:</strong> ${e.location}</p>
    <p><strong>Buyer:</strong> ${e.buyer}</p>
    <p><strong>Realtor:</strong> ${e.realtor}</p>
    <p><strong>Buyer note:</strong></p>
    <p style="margin-top: 0;">${e.note ?? "(none)"}</p>
  </body>
</html>`.trim()

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: from.trim(),
    to,
    subject: `New viewing request from ${payload.buyerName} — listing #${payload.listingId}`,
    text: textLines.join("\n"),
    html,
  })

  if (error) {
    console.error("[viewing-request-email] Resend error:", error)
    return
  }

  if (data?.id) {
    console.info("[viewing-request-email] sent", { resendEmailId: data.id })
  }
}
