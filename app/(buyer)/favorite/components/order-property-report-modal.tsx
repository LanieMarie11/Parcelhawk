"use client"

import { FileText, Loader2, X } from "lucide-react"
import { useEffect, useId, useState } from "react"

const BUYER_PROPERTY_REPORTS_PATH = "/api/buyer/property-reports"

export type PropertyReportResponse = {
  ok: true
  listingId: number
  propertyData: unknown
}

async function submitPropertyReportOrder(listingId: number): Promise<PropertyReportResponse> {
  const res = await fetch(BUYER_PROPERTY_REPORTS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  })
  const data = (await res.json().catch(() => ({}))) as PropertyReportResponse & { error?: string }

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed")
  }

  if (data.ok !== true || typeof data.listingId !== "number" || !("propertyData" in data)) {
    throw new Error("Invalid response from server")
  }

  return { ok: true, listingId: data.listingId, propertyData: data.propertyData }
}

export type OrderPropertyReportModalProps = {
  open: boolean
  onClose: () => void
  listingId: number
  /** Shown under the main title (e.g. listing name). */
  propertySubtitle: string
}

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: PropertyReportResponse }
  | { status: "error"; message: string }

export function OrderPropertyReportModal({
  open,
  onClose,
  listingId,
  propertySubtitle,
}: OrderPropertyReportModalProps) {
  const titleId = useId()
  const [requestState, setRequestState] = useState<RequestState>({ status: "idle" })

  useEffect(() => {
    if (!open) {
      setRequestState({ status: "idle" })
      return
    }

    let cancelled = false
    setRequestState({ status: "loading" })

    void submitPropertyReportOrder(listingId)
      .then((data) => {
        if (!cancelled) setRequestState({ status: "success", data })
      })
      .catch((error) => {
        if (!cancelled) {
          setRequestState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to submit report request",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, listingId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="bg-brand-green px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-white/10"
              aria-hidden
            >
              <FileText className="h-5 w-5" strokeWidth={2} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/10 transition-colors hover:bg-white/30"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="mt-5 min-w-0">
            <h2 id={titleId} className="text-lg font-semibold font-ibm-plex-sans leading-tight tracking-tight text-white">
              Order Property Report
            </h2>
            <p className="mt-1.5 truncate text-sm font-regular font-ibm-plex-sans leading-snug text-white/95">{propertySubtitle}</p>
          </div>
        </div>

        <div className="p-4">
          {requestState.status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" aria-hidden />
              <p className="text-sm text-muted-foreground">Fetching property data...</p>
            </div>
          ) : null}

          {requestState.status === "success" ? (
            <div className="rounded-xl border border-emerald-200/90 bg-[#EDFCEA] px-3.5 py-3">
              <p className="text-sm font-semibold text-[#2D5A36]">Property data loaded</p>
              <p className="mt-1 text-xs font-ibm-plex-sans leading-relaxed text-[#4b5563]">
                Report for listing ID{" "}
                <span className="font-medium">{requestState.data.listingId}</span>.
              </p>
              <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-white/80 p-3 text-xs text-[#374151]">
                {JSON.stringify(requestState.data.propertyData, null, 2)}
              </pre>
            </div>
          ) : null}

          {requestState.status === "error" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-[#B3261E]">Request failed</p>
              <p className="mt-1 text-xs font-ibm-plex-sans leading-relaxed text-[#7f1d1d]">
                {requestState.message}
              </p>
            </div>
          ) : null}

          <div className="pt-6 pb-4">
            <button
              type="button"
              onClick={onClose}
              disabled={requestState.status === "loading"}
              className="w-full rounded-lg bg-brand-green py-2.5 text-sm font-ibm-plex-sans font-medium text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
