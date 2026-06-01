import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { investors } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

function getInvestorId(sessionUser: SessionUser): string | null {
  if (!sessionUser.id) return null
  if (sessionUser.role !== "investor") return null
  return sessionUser.id
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const investorId = getInvestorId(sessionUser)

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [row] = await db
      .select({ emailNotifications: investors.emailNotifications })
      .from(investors)
      .where(eq(investors.id, investorId))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    return NextResponse.json({ emailNotifications: row.emailNotifications })
  } catch (error) {
    console.error("Realtor notification settings fetch error:", error)
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const investorId = getInvestorId(sessionUser)

  if (!investorId) {
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
      .update(investors)
      .set({ emailNotifications: body.emailNotifications })
      .where(eq(investors.id, investorId))
      .returning({ emailNotifications: investors.emailNotifications })

    if (!updated) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    return NextResponse.json({ emailNotifications: updated.emailNotifications })
  } catch (error) {
    console.error("Realtor notification settings update error:", error)
    return NextResponse.json({ error: "Failed to update notification settings" }, { status: 500 })
  }
}
