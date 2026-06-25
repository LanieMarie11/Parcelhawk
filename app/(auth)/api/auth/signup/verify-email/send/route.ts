import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { sendEmailVerificationOtp } from "@/lib/email/send-email-verification-otp"
import {
  generateEmailVerificationCode,
  getEmailVerificationExpiry,
  hashEmailVerificationCode,
} from "@/lib/email-verification"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId?.trim()) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        emailVerified: users.emailVerified,
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

    const code = generateEmailVerificationCode()
    const codeHash = await hashEmailVerificationCode(code)
    const expiresAt = getEmailVerificationExpiry()

    await db
      .update(users)
      .set({
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    await sendEmailVerificationOtp({
      buyerEmail: user.email,
      buyerName: `${user.firstName} ${user.lastName}`.trim(),
      code,
    })

    return NextResponse.json({ message: "Verification code sent" })
  } catch (error) {
    console.error("Send verification code error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
