import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, users } from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const investorId = sessionUser.id

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        location: users.location,
        avatarUrl: users.avatarUrl,
        preferenceBudget: users.preferenceBudget,
        preferenceAcreage: users.preferenceAcreage,
        preferencePurpose: users.preferencePurpose,
        preferenceTimeframe: users.preferenceTimeframe,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastActiveAt: users.lastActiveAt,
      })
      .from(buyerInvestorLinks)
      .innerJoin(users, eq(users.id, buyerInvestorLinks.buyerId))
      .where(and(eq(buyerInvestorLinks.investorId, investorId), eq(buyerInvestorLinks.status, "active")))
      .orderBy(desc(users.updatedAt))

    const buyers = rows.map((user) => {
      return {
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
        email: user.email,
        phone: user.phone ?? "",
        location: user.location ?? "",
        avatarUrl: user.avatarUrl ?? "",
        preferenceBudget: user.preferenceBudget ?? "",
        preferenceAcreage: user.preferenceAcreage ?? "",
        preferencePurpose: user.preferencePurpose ?? "",
        preferenceTimeframe: user.preferenceTimeframe ?? "",
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : "",
        savedProperties: null,
        activity: null,
      }
    })

    return NextResponse.json({ buyers })
  } catch (error) {
    console.error("Realtor my-buyers fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch connected buyers" }, { status: 500 })
  }
}

