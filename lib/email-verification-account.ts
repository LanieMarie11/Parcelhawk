import { eq } from "drizzle-orm"
import { db } from "@/db"
import { investors, users } from "@/db/schema"

export type VerificationAccountRole = "buyer" | "investor"

export type VerificationAccount = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: VerificationAccountRole
  emailVerified: boolean
  emailVerificationCodeHash: string | null
  emailVerificationExpiresAt: Date | null
}

export async function getVerificationAccount(
  userId: string,
  role: VerificationAccountRole,
): Promise<VerificationAccount | null> {
  if (role === "buyer") {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        emailVerified: users.emailVerified,
        emailVerificationCodeHash: users.emailVerificationCodeHash,
        emailVerificationExpiresAt: users.emailVerificationExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || user.role !== "buyer") return null

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: "buyer",
      emailVerified: user.emailVerified,
      emailVerificationCodeHash: user.emailVerificationCodeHash,
      emailVerificationExpiresAt: user.emailVerificationExpiresAt,
    }
  }

  const [investor] = await db
    .select({
      id: investors.id,
      email: investors.email,
      firstName: investors.firstName,
      lastName: investors.lastName,
      emailVerified: investors.emailVerified,
      emailVerificationCodeHash: investors.emailVerificationCodeHash,
      emailVerificationExpiresAt: investors.emailVerificationExpiresAt,
    })
    .from(investors)
    .where(eq(investors.id, userId))
    .limit(1)

  if (!investor) return null

  return {
    id: investor.id,
    email: investor.email,
    firstName: investor.firstName,
    lastName: investor.lastName,
    role: "investor",
    emailVerified: investor.emailVerified,
    emailVerificationCodeHash: investor.emailVerificationCodeHash,
    emailVerificationExpiresAt: investor.emailVerificationExpiresAt,
  }
}

export async function setVerificationCode(
  account: VerificationAccount,
  codeHash: string,
  expiresAt: Date,
): Promise<void> {
  if (account.role === "buyer") {
    await db
      .update(users)
      .set({
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, account.id))
    return
  }

  await db
    .update(investors)
    .set({
      emailVerificationCodeHash: codeHash,
      emailVerificationExpiresAt: expiresAt,
    })
    .where(eq(investors.id, account.id))
}

export async function markEmailVerified(account: VerificationAccount): Promise<void> {
  if (account.role === "buyer") {
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, account.id))
    return
  }

  await db
    .update(investors)
    .set({
      emailVerified: true,
      emailVerificationCodeHash: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(investors.id, account.id))
}
