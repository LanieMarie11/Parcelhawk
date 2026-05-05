"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const BUYER_VIEWING_REQUESTS_PATH = "/api/buyer/viewing-requests"

export type SubmitBuyerViewingRequestResult = {
  id: string
}

async function submitBuyerViewingRequest(args: {
  listingId: number
  buyerNote: string
}): Promise<SubmitBuyerViewingRequestResult> {
  const res = await fetch(BUYER_VIEWING_REQUESTS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: args.listingId, buyerNote: args.buyerNote }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    id?: unknown
    error?: string
  }

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed")
  }

  const id = data.id
  if (typeof id !== "string") {
    throw new Error("Invalid response from server")
  }

  return { id }
}

export type ViewRequestModalProps = {
  open: boolean
  /** Land listing id for the favorites card this modal was opened from. */
  listingId: number
  onClose: () => void
  /** Optional hook after the server persists the request (e.g. invalidate cache). */
  onSuccess?: (result: SubmitBuyerViewingRequestResult) => void
}

export function ViewRequestModal({
  open,
  listingId,
  onClose,
  onSuccess,
}: ViewRequestModalProps) {
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setNote("")
  }, [open, listingId])

  if (!open) return null

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await submitBuyerViewingRequest({
        listingId,
        buyerNote: note.trim(),
      })
      toast.success("Viewing request sent. Your realtor will be notified.")
      onSuccess?.(result)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/60 p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">View Request</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a note for this viewing request.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter request details..."
          rows={4}
          disabled={submitting}
          className="mt-4 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none ring-[#04C0AF] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="rounded-lg bg-[#2D4A31] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#253e2a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}
