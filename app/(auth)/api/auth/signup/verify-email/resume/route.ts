import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { investors, users } from "@/db/schema"
import type { VerificationAccountRole } from "@/lib/email-verification-account"

function parseRole(value: unknown): VerificationAccountRole | null {
  return value === "buyer" || value === "investor" ? value : null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role: roleRaw } = body as {
      email?: string
      password?: string
      role?: string
    }

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    const role = parseRole(roleRaw)
    if (!role) {
      return NextResponse.json({ error: "Valid role is required" }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (role === "buyer") {
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

      return NextResponse.json({ userId: user.id, email: user.email, role: "buyer" })
    }

    const [investor] = await db
      .select({
        id: investors.id,
        email: investors.email,
        password: investors.password,
        emailVerified: investors.emailVerified,
      })
      .from(investors)
      .where(eq(investors.email, normalizedEmail))
      .limit(1)

    if (!investor) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const match = await compare(password, investor.password)
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (investor.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified. Please sign in." },
        { status: 400 },
      )
    }

    return NextResponse.json({
      userId: investor.id,
      email: investor.email,
      role: "investor",
    })
  } catch (error) {
    console.error("Resume email verification error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
