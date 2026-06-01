import { Resend } from "resend"

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

type ResendConfig = { apiKey: string; from: string }

function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM
  if (!apiKey?.trim() || !from?.trim()) {
    console.warn(
      "[realtor-email] RESEND_API_KEY or RESEND_FROM_EMAIL is missing; skipping notification"
    )
    return null
  }
  return { apiKey: apiKey.trim(), from: from.trim() }
}

/**
 * Shared Resend send for realtor-facing transactional mail.
 * Does not throw; logs and returns on skip or failure.
 */
export async function sendToRealtorInbox(options: {
  realtorEmail: string
  subject: string
  text: string
  html: string
  /** Log tag after successful send / Resend errors, e.g. viewing-request-email */
  logTag: string
}): Promise<void> {
  const config = getResendConfig()
  if (!config) return

  const to = options.realtorEmail.trim()
  if (!to) {
    console.warn(`[${options.logTag}] realtorEmail is empty; skipping notification`)
    return
  }

  const resend = new Resend(config.apiKey)
  const { data, error } = await resend.emails.send({
    from: config.from,
    to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })

  if (error) {
    console.error(`[${options.logTag}] Resend error:`, error)
    return
  }

  if (data?.id) {
    console.info(`[${options.logTag}] sent`, { resendEmailId: data.id })
  }
}

/**
 * Shared Resend send for buyer-facing transactional mail.
 * Does not throw; logs and returns on skip or failure.
 */
export async function sendToBuyerInbox(options: {
  buyerEmail: string
  subject: string
  text: string
  html: string
  logTag: string
}): Promise<void> {
  const config = getResendConfig()
  if (!config) return

  const to = options.buyerEmail.trim()
  if (!to) {
    console.warn(`[${options.logTag}] buyerEmail is empty; skipping notification`)
    return
  }

  const resend = new Resend(config.apiKey)
  const { data, error } = await resend.emails.send({
    from: config.from,
    to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })

  if (error) {
    console.error(`[${options.logTag}] Resend error:`, error)
    return
  }

  if (data?.id) {
    console.info(`[${options.logTag}] sent`, { resendEmailId: data.id })
  }
}
