import { timingSafeEqual } from "crypto";

/** Emails allowed to sign in as admin (from `ADMIN_EMAILS` or `ADMIN_EMAIL`). */
export function getAdminAllowlist(): string[] {
  const fromList =
    process.env.ADMIN_EMAILS?.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? [];

  if (fromList.length > 0) {
    return [...new Set(fromList)];
  }

  const single = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return single ? [single] : [];
}

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAdminCredentials(
  email: string,
  password: string
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!getAdminAllowlist().includes(normalizedEmail)) return false;

  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;

  return passwordsMatch(password, expectedPassword);
}
