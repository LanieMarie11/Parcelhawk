import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { savedSearches } from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { resolveSavedSearchPersistFields } from "@/lib/saved-search-persist"

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

    const activities: string[] | null = Array.isArray(body.activities)
      ? body.activities.filter((a: unknown): a is string => typeof a === "string").map((a: string) => a.trim()).filter(Boolean)
      : null

    const fields = resolveSavedSearchPersistFields({
      minPrice: body.minPrice != null ? String(body.minPrice) : null,
      maxPrice: body.maxPrice != null ? String(body.maxPrice) : null,
      minAcres: body.minAcres != null ? String(body.minAcres) : null,
      maxAcres: body.maxAcres != null ? String(body.maxAcres) : null,
      state: typeof body.state === "string" ? body.state : null,
      county: typeof body.county === "string" ? body.county : null,
      prompt: typeof body.prompt === "string" ? body.prompt : null,
      propertyType: typeof body.propertyType === "string" ? body.propertyType : null,
      landType: typeof body.landType === "string" ? body.landType : null,
      activities,
    })

    const [row] = await db
      .insert(savedSearches)
      .values({
        userId,
        name,
        frequency,
        prompt: fields.prompt ?? undefined,
        minPrice: fields.minPrice ?? undefined,
        maxPrice: fields.maxPrice ?? undefined,
        minAcres: fields.minAcres ?? undefined,
        maxAcres: fields.maxAcres ?? undefined,
        state: fields.state ?? undefined,
        county: fields.county ?? undefined,
        propertyType: fields.propertyType ?? undefined,
        landType: fields.landType ?? undefined,
        activities: fields.activities ?? undefined,
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
