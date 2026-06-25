import { escapeHtml, sendToBuyerInbox } from "@/lib/email/resend-realtor-inbox"

export type EmailVerificationOtpPayload = {
  buyerEmail: string
  buyerName: string
  code: string
}

export async function sendEmailVerificationOtp(
  payload: EmailVerificationOtpPayload,
): Promise<boolean> {
  const buyer = payload.buyerName.trim() || "there"
  const code = payload.code.trim()

  const textLines = [
    `Hi ${buyer},`,
    "",
    "Use this code to verify your email and finish setting up your ParcelHawk account:",
    "",
    code,
    "",
    "This code expires in 15 minutes. If you did not create an account, you can ignore this email.",
  ]

  const b = escapeHtml(buyer)
  const c = escapeHtml(code)
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #18181b;">
    <p>Hi ${b},</p>
    <p>Use this code to verify your email and finish setting up your ParcelHawk account:</p>
    <p style="margin: 1.25em 0; font-size: 28px; font-weight: 600; letter-spacing: 0.2em;">${c}</p>
    <p style="color: #71717a;">This code expires in 15 minutes. If you did not create an account, you can ignore this email.</p>
  </body>
</html>`.trim()

  await sendToBuyerInbox({
    buyerEmail: payload.buyerEmail,
    subject: "Your ParcelHawk verification code",
    text: textLines.join("\n"),
    html,
    logTag: "email-verification-otp",
  })

  return true
}
