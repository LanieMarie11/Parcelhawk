import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { savedSearches } from "@/db/schema"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt))

    return NextResponse.json(rows)
  } catch (error) {
    console.error("Saved searches fetch error:", error)
    return NextResponse.json(
      { error: "Failed to load saved searches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "daily"
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const minPrice = body.minPrice != null ? String(body.minPrice) : null
    const maxPrice = body.maxPrice != null ? String(body.maxPrice) : null
    const minAcres = body.minAcres != null ? String(body.minAcres) : null
    const maxAcres = body.maxAcres != null ? String(body.maxAcres) : null
    const location = typeof body.location === "string" ? body.location.trim() || null : null
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() || null : null
    const propertyType = typeof body.propertyType === "string" ? body.propertyType.trim() || null : null
    const landType = typeof body.landType === "string" ? body.landType.trim() || null : null
    const activities: string[] | null = Array.isArray(body.activities)
      ? body.activities.filter((a: unknown): a is string => typeof a === "string").map((a: string) => a.trim()).filter(Boolean)
      : null

    const [row] = await db
      .insert(savedSearches)
      .values({
        userId,
        name,
        frequency,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        minAcres: minAcres || undefined,
        maxAcres: maxAcres || undefined,
        location: location ?? undefined,
        prompt: prompt ?? undefined,
        propertyType: propertyType ?? undefined,
        landType: landType ?? undefined,
        activities: activities ?? undefined,
      })
      .returning({ id: savedSearches.id })

    return NextResponse.json({ id: row?.id })
  } catch (error) {
    console.error("Saved search create error:", error)
    return NextResponse.json(
      { error: "Failed to save search" },
      { status: 500 }
    )
  }
}
