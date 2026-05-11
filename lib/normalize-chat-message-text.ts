/** Validates chat body and normalizes newlines without collapsing intentional whitespace. */
export function normalizeChatMessageText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.trim() === "") return null;
  return normalized;
}
