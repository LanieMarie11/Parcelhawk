import { NextResponse } from "next/server"
import { activatePendingBuyerRealtorConnections } from "@/lib/activate-pending-buyer-realtor-connections"
import {
  isEmailVerificationExpired,
  verifyEmailVerificationCode,
} from "@/lib/email-verification"
import {
  getVerificationAccount,
  markEmailVerified,
  type VerificationAccountRole,
} from "@/lib/email-verification-account"

function parseRole(value: unknown): VerificationAccountRole | null {
  return value === "buyer" || value === "investor" ? value : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, code, role: roleRaw } = body as {
      userId?: string
      code?: string
      role?: string
    }

    if (!userId?.trim() || !code?.trim()) {
      return NextResponse.json(
        { error: "User ID and verification code are required" },
        { status: 400 },
      )
    }

    const role = parseRole(roleRaw)
    if (!role) {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 })
    }

    const normalizedCode = code.trim()
    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: "Enter a valid 6-digit code" },
        { status: 400 },
      )
    }

    const account = await getVerificationAccount(userId.trim(), role)
    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (account.emailVerified) {
      return NextResponse.json({ message: "Email already verified" })
    }

    if (isEmailVerificationExpired(account.emailVerificationExpiresAt)) {
      return NextResponse.json(
        { error: "Verification code expired. Request a new one." },
        { status: 400 },
      )
    }

    const valid = await verifyEmailVerificationCode(
      normalizedCode,
      account.emailVerificationCodeHash,
    )

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      )
    }

    await markEmailVerified(account)

    if (account.role === "buyer") {
      await activatePendingBuyerRealtorConnections(account.id)
    }

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Confirm verification code error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
