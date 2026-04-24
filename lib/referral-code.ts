import { randomBytes } from "node:crypto";

const BYTES = 12;

/**
 * URL-safe random token (base64url, no padding) for `?ref=`; unique in DB.
 */
export function generateReferralCode(): string {
  return randomBytes(BYTES).toString("base64url");
}
