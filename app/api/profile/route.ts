import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { del, put } from "@vercel/blob"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { authOptions } from "@/lib/auth"

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = String(fullName ?? "").trim()
  if (!trimmed) return { firstName: "", lastName: "" }
  const spaceIndex = trimmed.indexOf(" ")
  if (spaceIndex <= 0) return { firstName: trimmed, lastName: "" }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  }
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/gif"]
const MAX_AVATAR_SIZE_BYTES = 1024 * 1024

function isVercelBlobUrl(url: string): boolean {
  return url.includes(".public.blob.vercel-storage.com")
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    fullName?: string
    email?: string
    phone?: string
    location?: string
    preferenceBudget?: string
    preferenceAcreage?: string
    preferencePurpose?: string
    preferenceTimeframe?: string
    avatar?: File | null
  }
  try {
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const avatar = formData.get("avatar")
      body = {
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        location: String(formData.get("location") ?? ""),
        preferenceBudget: String(formData.get("preferenceBudget") ?? ""),
        preferenceAcreage: String(formData.get("preferenceAcreage") ?? ""),
        preferencePurpose: String(formData.get("preferencePurpose") ?? ""),
        preferenceTimeframe: String(formData.get("preferenceTimeframe") ?? ""),
        avatar: avatar instanceof File ? avatar : null,
      }
    } else {
      body = await request.json()
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const fullName = (body.fullName ?? "").trim()
  const { firstName, lastName } = splitFullName(body.fullName ?? "")

  const updates: {
    firstName?: string
    lastName?: string
    phone?: string | null
    location?: string | null
    preferenceBudget?: string | null
    preferenceAcreage?: string | null
    preferencePurpose?: string | null
    preferenceTimeframe?: string | null
    avatarUrl?: string
    updatedAt: Date
  } = { updatedAt: new Date() }
  if (fullName !== "") {
    updates.firstName = firstName || " "
    updates.lastName = lastName || " "
  }
  if (body.phone !== undefined) updates.phone = body.phone === "" ? null : body.phone
  if (body.location !== undefined) updates.location = body.location === "" ? null : body.location
  if (body.preferenceBudget !== undefined) {
    updates.preferenceBudget = body.preferenceBudget === "" ? null : body.preferenceBudget
  }
  if (body.preferenceAcreage !== undefined) {
    updates.preferenceAcreage = body.preferenceAcreage === "" ? null : body.preferenceAcreage
  }
  if (body.preferencePurpose !== undefined) {
    updates.preferencePurpose = body.preferencePurpose === "" ? null : body.preferencePurpose
  }
  if (body.preferenceTimeframe !== undefined) {
    updates.preferenceTimeframe = body.preferenceTimeframe === "" ? null : body.preferenceTimeframe
  }

  try {
    let previousAvatarUrl: string | null = null

    if (body.avatar) {
      const currentUser = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (currentUser.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      previousAvatarUrl = currentUser[0].avatarUrl ?? null

      if (!ALLOWED_CONTENT_TYPES.includes(body.avatar.type)) {
        return NextResponse.json({ error: "Only JPG, GIF or PNG files are allowed" }, { status: 400 })
      }
      if (body.avatar.size > MAX_AVATAR_SIZE_BYTES) {
        return NextResponse.json({ error: "Image size must be 1MB or less" }, { status: 400 })
      }

      const fileExtension = body.avatar.name.includes(".")
        ? body.avatar.name.split(".").pop()?.toLowerCase()
        : "jpg"
      const safeExtension = fileExtension && /^[a-z0-9]+$/.test(fileExtension) ? fileExtension : "jpg"
      const blob = await put(`avatar/${userId}-${Date.now()}.${safeExtension}`, body.avatar, {
        access: "public",
        addRandomSuffix: true,
      })
      updates.avatarUrl = blob.url
    }

    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({ id: users.id, avatarUrl: users.avatarUrl })

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const newAvatarUrl = result[0].avatarUrl ?? null
    if (
      previousAvatarUrl &&
      newAvatarUrl &&
      previousAvatarUrl !== newAvatarUrl &&
      isVercelBlobUrl(previousAvatarUrl)
    ) {
      try {
        await del(previousAvatarUrl)
      } catch (deleteError) {
        console.error("Old avatar cleanup failed:", deleteError)
      }
    }

    return NextResponse.json({ ok: true, avatarUrl: newAvatarUrl })
  } catch (err) {
    console.error("Profile update error:", err)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        location: users.location,
        preferenceBudget: users.preferenceBudget,
        preferenceAcreage: users.preferenceAcreage,
        preferencePurpose: users.preferencePurpose,
        preferenceTimeframe: users.preferenceTimeframe,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    const user = result[0]
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const fullName = [user.firstName, user.lastName]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(" ")

    return NextResponse.json({
      fullName,
      email: user.email,
      phone: user.phone ?? "",
      location: user.location ?? "",
      preferenceBudget: user.preferenceBudget ?? "",
      preferenceAcreage: user.preferenceAcreage ?? "",
      preferencePurpose: user.preferencePurpose ?? "",
      preferenceTimeframe: user.preferenceTimeframe ?? "",
    })
  } catch (err) {
    console.error("Profile fetch error:", err)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
