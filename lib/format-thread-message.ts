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

/** Timeline-only id: caption under the hero image (no listing API data). */
export function formatViewingRequestHeroListingLine(listingId: number): string {
  return `Listing #${listingId}`;
}
