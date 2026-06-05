import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { compare, hash } from "bcryptjs"
import { db } from "@/db"
import {
  buyerInvestorLinks,
  favorites,
  investors,
  messageThreads,
  messages,
  notifications,
  savedSearches,
  users,
  viewingRequests,
} from "@/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { authOptions } from "@/lib/auth"
import { sendBuyerAccountDeletedConfirmation } from "@/lib/email/send-buyer-account-deleted-confirmation"
import { sendBuyerDeletedAccountNotification } from "@/lib/email/send-buyer-deleted-account-notification"

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
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      emailNotifications: users.emailNotifications,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const buyerName = `${user.firstName} ${user.lastName}`.trim() || "(unknown buyer)"

  const activeLinks = await db
    .select({
      linkId: buyerInvestorLinks.id,
      investorId: buyerInvestorLinks.investorId,
      investorFirstName: investors.firstName,
      investorLastName: investors.lastName,
      investorEmail: investors.email,
    })
    .from(buyerInvestorLinks)
    .innerJoin(investors, eq(buyerInvestorLinks.investorId, investors.id))
    .where(and(eq(buyerInvestorLinks.buyerId, userId), eq(buyerInvestorLinks.status, "active")))

  const realtorEmailPayloads = activeLinks
    .filter((link) => link.investorEmail?.trim())
    .map((link) => ({
      buyerName,
      realtorName:
        `${link.investorFirstName} ${link.investorLastName}`.trim() || "there",
      investorId: link.investorId,
      realtorEmail: link.investorEmail.trim(),
    }))

  await db.transaction(async (tx) => {
    const removedNotification = {
      type: "link_invitation" as const,
      userId,
      title: "Buyer removed from your network",
      body: `${buyerName} deleted their ParcelHawk account and is no longer connected to you.`,
      metadata: {
        type: "link-invitation" as const,
        sender: "buyer" as const,
        status: "removed",
        buyerName,
        endedBy: "buyer" as const,
        endReason: "account_deleted",
      },
      updatedAt: new Date(),
    }

    for (const link of activeLinks) {
      await tx.insert(notifications).values({
        ...removedNotification,
        investorId: link.investorId,
        buyerInvestorLinkId: link.linkId,
      })
    }

    const buyerThreadRows = await tx
      .select({ id: messageThreads.id })
      .from(messageThreads)
      .where(eq(messageThreads.buyerUserId, userId))
    const buyerThreadIds = buyerThreadRows.map((row) => row.id)
    if (buyerThreadIds.length > 0) {
      await tx.delete(messages).where(inArray(messages.threadId, buyerThreadIds))
    }
    await tx.delete(messageThreads).where(eq(messageThreads.buyerUserId, userId))

    await tx.delete(viewingRequests).where(eq(viewingRequests.buyerId, userId))
    await tx.delete(buyerInvestorLinks).where(eq(buyerInvestorLinks.buyerId, userId))

    await tx.delete(favorites).where(eq(favorites.userId, userId))
    await tx.delete(savedSearches).where(eq(savedSearches.userId, userId))
    await tx.delete(users).where(eq(users.id, userId))
    await tx.delete(notifications).where(eq(notifications.userId, userId))
  })

  const buyerEmail = user.email?.trim() ?? ""
  if (buyerEmail) {
    try {
      await sendBuyerAccountDeletedConfirmation({
        buyerEmail,
        buyerName,
        emailNotifications: user.emailNotifications,
      })
    } catch (emailError) {
      console.error("sendBuyerAccountDeletedConfirmation:", emailError)
    }
  }

  for (const payload of realtorEmailPayloads) {
    try {
      await sendBuyerDeletedAccountNotification(payload)
    } catch (emailError) {
      console.error("sendBuyerDeletedAccountNotification:", emailError)
    }
  }

  return NextResponse.json({ ok: true })
}
