import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { compare, hash } from "bcryptjs"
import { db } from "@/db"
import { favorites, savedSearches, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { authOptions } from "@/lib/auth"

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { currentPassword, newPassword, confirmPassword } = body
  if (!currentPassword?.trim()) {
    return NextResponse.json(
      { error: "Current password is required" },
      { status: 400 }
    )
  }
  if (!newPassword?.trim()) {
    return NextResponse.json(
      { error: "New password is required" },
      { status: 400 }
    )
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match" },
      { status: 400 }
    )
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    )
  }

  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const currentMatch = await compare(currentPassword.trim(), user.password)
  if (!currentMatch) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    )
  }

  const hashedPassword = await hash(newPassword.trim(), 10)

  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await db.transaction(async (tx) => {
    await tx.delete(favorites).where(eq(favorites.userId, userId))
    await tx.delete(savedSearches).where(eq(savedSearches.userId, userId))
    await tx.delete(users).where(eq(users.id, userId))
  })

  return NextResponse.json({ ok: true })
}
