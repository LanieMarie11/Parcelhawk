import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

function getBuyerId(sessionUser: SessionUser): string | null {
  if (!sessionUser.id) return null
  if (sessionUser.role !== "buyer") return null
  return sessionUser.id
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const buyerId = getBuyerId(sessionUser)

  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [row] = await db
      .select({ emailNotifications: users.emailNotifications })
      .from(users)
      .where(eq(users.id, buyerId))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ emailNotifications: row.emailNotifications })
  } catch (error) {
    console.error("Buyer notification settings fetch error:", error)
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const buyerId = getBuyerId(sessionUser)

  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { emailNotifications?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (typeof body.emailNotifications !== "boolean") {
    return NextResponse.json(
      { error: "emailNotifications must be a boolean" },
      { status: 400 },
    )
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        emailNotifications: body.emailNotifications,
        updatedAt: new Date(),
      })
      .where(eq(users.id, buyerId))
      .returning({ emailNotifications: users.emailNotifications })

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ emailNotifications: updated.emailNotifications })
  } catch (error) {
    console.error("Buyer notification settings update error:", error)
    return NextResponse.json({ error: "Failed to update notification settings" }, { status: 500 })
  }
}
