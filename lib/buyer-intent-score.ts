/**
 * Hot / warm / cold intent for a linked buyer.
 * Matches realtor portal sidebar rules: any viewing request → hot; else last-active windows.
 */
export function buyerIntentScore(input: {
  lastActiveAt: string;
  hasViewingRequest: boolean;
}): "hot" | "warm" | "cold" {
  const timestamp = Date.parse(input.lastActiveAt);
  if (!Number.isFinite(timestamp)) return "cold";

  const diffMs = Date.now() - timestamp;
  const day = 86_400_000;
  if (diffMs <= day) return "hot";
  if (diffMs <= 7 * day) return "warm";
  return "cold";
}
