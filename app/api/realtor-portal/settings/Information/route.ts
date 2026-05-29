import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { del, put } from "@vercel/blob"
import { db } from "@/db"
import { investors } from "@/db/schema"
import { eq } from "drizzle-orm"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

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

function isMissingBlobTokenError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "")
  return message.includes("Vercel Blob: No token found")
}

function isVercelBlobUrl(url: string): boolean {
  return url.includes(".public.blob.vercel-storage.com")
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const userId = getUserId(session)

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: {
    fullName?: string
    email?: string
    phone?: string
    location?: string
    bio?: string
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
        bio: String(formData.get("bio") ?? ""),
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
    address?: string | null
    bio?: string | null
    avatarUrl?: string
  } = {}
  if (fullName !== "") {
    updates.firstName = firstName || " "
    updates.lastName = lastName || " "
  }
  if (body.phone !== undefined) updates.phone = body.phone === "" ? null : body.phone
  if (body.location !== undefined) updates.address = body.location === "" ? null : body.location
  if (body.bio !== undefined) updates.bio = body.bio === "" ? null : body.bio

  try {
    let previousAvatarUrl: string | null = null

    if (body.avatar) {
      const currentUser = await db
        .select({ avatarUrl: investors.avatarUrl })
        .from(investors)
        .where(eq(investors.id, userId))
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
      .update(investors)
      .set(updates)
      .where(eq(investors.id, userId))
      .returning({ id: investors.id, avatarUrl: investors.avatarUrl })

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
    console.error("Realtor portal personal information update error:", err)
    if (isMissingBlobTokenError(err)) {
      return NextResponse.json(
        {
          error:
            "Avatar upload is not configured. Set BLOB_READ_WRITE_TOKEN in your environment and try again.",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const userId = getUserId(session)

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await db
      .select({
        firstName: investors.firstName,
        lastName: investors.lastName,
        email: investors.email,
        phone: investors.phone,
        address: investors.address,
        bio: investors.bio,
        avatarUrl: investors.avatarUrl,
      })
      .from(investors)
      .where(eq(investors.id, userId))
      .limit(1)

    const investor = result[0]
    if (!investor) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const fullName = [investor.firstName, investor.lastName].filter(Boolean).join(" ").trim()

    return NextResponse.json({
      fullName,
      email: investor.email,
      phone: investor.phone ?? "",
      location: investor.address ?? "",
      bio: investor.bio ?? "",
      avatarUrl: investor.avatarUrl ?? null,
    })
  } catch (err) {
    console.error("Realtor portal personal information fetch error:", err)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
