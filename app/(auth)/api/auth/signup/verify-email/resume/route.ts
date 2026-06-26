import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        role: users.role,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (!user || user.role !== "buyer") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const match = await compare(password, user.password)
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified. Please sign in." },
        { status: 400 },
      )
    }

    return NextResponse.json({ userId: user.id, email: user.email })
  } catch (error) {
    console.error("Resume email verification error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
