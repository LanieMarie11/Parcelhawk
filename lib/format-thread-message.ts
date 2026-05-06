export function formatChatMessageTime(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  let timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  timePart = timePart.replace(/\u202f/g, " ").replace(/ AM$/i, " am").replace(/ PM$/i, " pm");
  return `${datePart}, ${timePart}`;
}

export function formatViewingStatus(status: string): string {
  if (!status) return status;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** e.g. "Sat, Nov 8 3:00 PM" for viewing-request request-time pill */
export function formatViewingRequestScheduledTime(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  let timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  timePart = timePart.replace(/\u202f/g, " ");
  return `${weekday}, ${monthDay} ${timePart}`;
}

/** Timeline fallback when no structured address is available */
export function formatViewingRequestHeroListingLine(listingId: number): string {
  return `Listing #${listingId}`;
}

/** Single-line address from land_listings-style fields (server-safe). */
export function buildLandListingFullAddress(p: {
  address1?: string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
  stateName?: string | null;
  zip?: string | null;
}): string {
  const a1 = p.address1?.trim() ?? "";
  const city = p.city?.trim() ?? "";
  const abbr = (p.stateAbbreviation?.trim() ?? "").toUpperCase();
  const stateNamePart = p.stateName?.trim() ?? "";
  const st = abbr || stateNamePart;
  const zip = p.zip?.trim() ?? "";
  const stateZip = [st, zip].filter(Boolean).join(" ").trim();
  const cityPart = [city, stateZip].filter(Boolean).join(", ").trim();
  const parts = [a1, cityPart].filter(Boolean);
  return parts.join(", ");
}
