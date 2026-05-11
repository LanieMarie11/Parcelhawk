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
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/60 p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-[550px] rounded-xl bg-[#f6f7f8] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-medium text-[#030303] font-phudu">
          Schedule Viewing Request
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Send a viewing request to realtor
        </p>
        <label className="mt-6 block text-sm font-medium text-foreground">
          Short Note <span className="text-zinc-500">(Optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hi XYZ, I'd like to schedule a viewing."
          rows={6}
          disabled={submitting}
          className="mt-3 w-full resize-none rounded-lg border border-zinc-200 bg-[#F3F3F5] px-4 py-3 text-sm text-[#000000] outline-none placeholder:text-[#98A2B3] focus:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 bg-[#f7f7f8] px-4 py-[10px] text-sm font-medium text-[#000000] transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-[#3f6f39] px-4 py-[10px] text-sm font-medium text-white transition-colors hover:bg-[#345f30] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}
