export type ThreadTimelineMessage = {
  kind: "message"
  id: string
  sender: "investor" | "buyer"
  text: string
  createdAt: string
}

export type ThreadTimelineViewingRequest = {
  kind: "viewing_request"
  id: string
  listingId: number
  status: "pending" | "scheduled" | "completed" | "cancelled"
  buyerNote: string | null
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ThreadTimelineItem = ThreadTimelineMessage | ThreadTimelineViewingRequest

function timestampToIso(value: Date | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

export function mergeThreadTimeline(
  messageRows: Array<{
    id: string
    senderRole: "investor" | "buyer"
    body: string
    createdAt: Date
  }>,
  viewingRows: Array<{
    id: string
    listingId: number
    status: "pending" | "scheduled" | "completed" | "cancelled"
    buyerNote: string | null
    scheduledAt: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>,
): ThreadTimelineItem[] {
  const messages: ThreadTimelineMessage[] = messageRows.map((row) => ({
    kind: "message",
    id: row.id,
    sender: row.senderRole,
    text: row.body,
    createdAt: row.createdAt.toISOString(),
  }))

  const viewing: ThreadTimelineViewingRequest[] = viewingRows.map((row) => ({
    kind: "viewing_request",
    id: row.id,
    listingId: row.listingId,
    status: row.status,
    buyerNote: row.buyerNote,
    scheduledAt: timestampToIso(row.scheduledAt),
    completedAt: timestampToIso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return [...messages, ...viewing].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}
