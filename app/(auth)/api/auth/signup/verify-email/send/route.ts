import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { investors, users } from "@/db/schema"
import { sendEmailVerificationOtp } from "@/lib/email/send-email-verification-otp"
import {
  generateEmailVerificationCode,
  getEmailVerificationExpiry,
  hashEmailVerificationCode,
} from "@/lib/email-verification"
import {
  getVerificationAccount,
  setVerificationCode,
  type VerificationAccountRole,
} from "@/lib/email-verification-account"

function parseRole(value: unknown): VerificationAccountRole | null {
  return value === "buyer" || value === "investor" ? value : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, role: roleRaw } = body as { userId?: string; role?: string }

    if (!userId?.trim()) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const role = parseRole(roleRaw)
    if (!role) {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 })
    }

    const account = await getVerificationAccount(userId.trim(), role)
    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (account.emailVerified) {
      return NextResponse.json({ message: "Email already verified" })
    }

    const code = generateEmailVerificationCode()
    const codeHash = await hashEmailVerificationCode(code)
    const expiresAt = getEmailVerificationExpiry()

    await setVerificationCode(account, codeHash, expiresAt)

    await sendEmailVerificationOtp({
      buyerEmail: account.email,
      buyerName: `${account.firstName} ${account.lastName}`.trim(),
      code,
    })

    return NextResponse.json({ message: "Verification code sent" })
  } catch (error) {
    console.error("Send verification code error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
