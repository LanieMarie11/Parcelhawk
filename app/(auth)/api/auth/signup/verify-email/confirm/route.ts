import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import {
  isEmailVerificationExpired,
  verifyEmailVerificationCode,
} from "@/lib/email-verification"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, code } = body as { userId?: string; code?: string }

    if (!userId?.trim() || !code?.trim()) {
      return NextResponse.json(
        { error: "User ID and verification code are required" },
        { status: 400 },
      )
    }

    const normalizedCode = code.trim()
    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: "Enter a valid 6-digit code" },
        { status: 400 },
      )
    }

    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        emailVerified: users.emailVerified,
        emailVerificationCodeHash: users.emailVerificationCodeHash,
        emailVerificationExpiresAt: users.emailVerificationExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId.trim()))
      .limit(1)

    if (!user || user.role !== "buyer") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" })
    }

    if (isEmailVerificationExpired(user.emailVerificationExpiresAt)) {
      return NextResponse.json(
        { error: "Verification code expired. Request a new one." },
        { status: 400 },
      )
    }

    const valid = await verifyEmailVerificationCode(
      normalizedCode,
      user.emailVerificationCodeHash,
    )

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      )
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Confirm verification code error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
