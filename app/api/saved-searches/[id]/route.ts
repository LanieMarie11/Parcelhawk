import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { savedSearches } from "@/db/schema"
import { authOptions } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing search id" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const frequency =
      typeof body.frequency === "string" ? body.frequency.trim() : ""
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!frequency) {
      return NextResponse.json({ error: "Frequency is required" }, { status: 400 })
    }

    const updated = await db
      .update(savedSearches)
      .set({ name, frequency, updatedAt: new Date() })
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)))
      .returning({
        id: savedSearches.id,
        name: savedSearches.name,
        frequency: savedSearches.frequency,
      })

    if (updated.length === 0) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 })
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Saved search update error:", error)
    return NextResponse.json(
      { error: "Failed to update saved search" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing search id" }, { status: 400 })
  }

  try {
    const deleted = await db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)))
      .returning({ id: savedSearches.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Saved search not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Saved search delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete saved search" },
      { status: 500 }
    )
  }
}
