import { hash, compare } from "bcryptjs"

const OTP_EXPIRY_MS = 15 * 60 * 1000

export function generateEmailVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function getEmailVerificationExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MS)
}

export async function hashEmailVerificationCode(code: string): Promise<string> {
  return hash(code, 10)
}

export async function verifyEmailVerificationCode(
  code: string,
  hashValue: string | null | undefined,
): Promise<boolean> {
  if (!hashValue) return false
  return compare(code, hashValue)
}

export function isEmailVerificationExpired(
  expiresAt: Date | null | undefined,
): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() < Date.now()
}
