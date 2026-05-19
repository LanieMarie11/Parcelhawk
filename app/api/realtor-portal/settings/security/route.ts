import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { compare, hash } from "bcryptjs"
import { db } from "@/db"
import {
  buyerInvestorLinks,
  investors,
  messageThreads,
  messages,
  viewingRequests,
} from "@/db/schema"
import { eq, inArray } from "drizzle-orm"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

const MIN_PASSWORD_LENGTH = 8

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

  const [investor] = await db
    .select({ password: investors.password })
    .from(investors)
    .where(eq(investors.id, userId))
    .limit(1)

  if (!investor) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const currentMatch = await compare(currentPassword.trim(), investor.password)
  if (!currentMatch) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    )
  }

  const hashedPassword = await hash(newPassword.trim(), 10)

  await db
    .update(investors)
    .set({
      password: hashedPassword,
    })
    .where(eq(investors.id, userId))

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const userId = getUserId(session)

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [investor] = await db
    .select({ id: investors.id })
    .from(investors)
    .where(eq(investors.id, userId))
    .limit(1)

  if (!investor) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await db.transaction(async (tx) => {
    const investorThreadRows = await tx
      .select({ id: messageThreads.id })
      .from(messageThreads)
      .where(eq(messageThreads.investorId, userId))
    const investorThreadIds = investorThreadRows.map((row) => row.id)
    if (investorThreadIds.length > 0) {
      await tx.delete(messages).where(inArray(messages.threadId, investorThreadIds))
    }
    await tx.delete(messageThreads).where(eq(messageThreads.investorId, userId))

    await tx.delete(viewingRequests).where(eq(viewingRequests.realtorId, userId))
    await tx.delete(buyerInvestorLinks).where(eq(buyerInvestorLinks.investorId, userId))

    await tx.delete(investors).where(eq(investors.id, userId))
  })

  return NextResponse.json({ ok: true })
}
