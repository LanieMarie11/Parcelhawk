"use client"

import { Download, Loader2, Printer, Search, X } from "lucide-react"
import { useEffect, useId, useState } from "react"
import {
  downloadUtilityReportMarkdown,
  printUtilityReport,
  UtilityReportDocument,
} from "./utility-report-document"

const BUYER_UTILITY_SEARCHES_PATH = "/api/buyer/utility-searches"

export type UtilitySearchResponse = {
  ok: true
  listingId: number
  report: string
  generatedAt: string
  cached: boolean
}

function parseUtilitySearchResponse(data: unknown): UtilitySearchResponse {
  const payload = data as UtilitySearchResponse & { error?: string }

  if (
    payload.ok !== true ||
    typeof payload.listingId !== "number" ||
    typeof payload.report !== "string" ||
    typeof payload.generatedAt !== "string" ||
    typeof payload.cached !== "boolean"
  ) {
    throw new Error("Invalid response from server")
  }

  return {
    ok: true,
    listingId: payload.listingId,
    report: payload.report,
    generatedAt: payload.generatedAt,
    cached: payload.cached,
  }
}

async function loadUtilitySearch(listingId: number): Promise<{
  data: UtilitySearchResponse
  generatedAt: Date
}> {
  const res = await fetch(BUYER_UTILITY_SEARCHES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  })
  const data = (await res.json().catch(() => ({}))) as UtilitySearchResponse & { error?: string }

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed")
  }

  const parsed = parseUtilitySearchResponse(data)
  return {
    data: parsed,
    generatedAt: new Date(parsed.generatedAt),
  }
}

export type UtilitySearchModalProps = {
  open: boolean
  onClose: () => void
  listingId: number
  /** Shown under the main title (e.g. listing name). */
  propertySubtitle: string
}

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: UtilitySearchResponse; generatedAt: Date }
  | { status: "error"; message: string }

export function UtilitySearchModal({
  open,
  onClose,
  listingId,
  propertySubtitle,
}: UtilitySearchModalProps) {
  const titleId = useId()
  const [requestState, setRequestState] = useState<RequestState>({ status: "idle" })

  useEffect(() => {
    if (!open) {
      setRequestState({ status: "idle" })
      return
    }

    let cancelled = false
    setRequestState({ status: "loading" })

    void loadUtilitySearch(listingId)
      .then((result) => {
        if (!cancelled) {
          setRequestState({
            status: "success",
            data: result.data,
            generatedAt: result.generatedAt,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRequestState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load utility search report",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, listingId])

  if (!open) return null

  const reportData = requestState.status === "success" ? requestState.data : null

  return (
    <div
      className="utility-report-print-root fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4 sm:p-6"
    >
      <div
        className="utility-report-print-dialog flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#f4f6f8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="utility-report-no-print shrink-0 bg-brand-green px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-white/10"
              aria-hidden
            >
              <Search className="h-5 w-5" strokeWidth={2} />
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
            <h2
              id={titleId}
              className="text-lg font-semibold font-ibm-plex-sans leading-tight tracking-tight text-white"
            >
              Utility Due Diligence Report
            </h2>
            <p className="mt-1.5 truncate text-sm font-regular font-ibm-plex-sans leading-snug text-white/95">
              {propertySubtitle}
            </p>
          </div>
        </div>

        {reportData ? (
          <div className="utility-report-no-print flex shrink-0 flex-wrap gap-2 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={printUtilityReport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-medium font-ibm-plex-sans text-white transition-colors hover:bg-brand-green-hover"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() =>
                downloadUtilityReportMarkdown(
                  reportData.report,
                  propertySubtitle,
                  reportData.listingId
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium font-ibm-plex-sans text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download report (.md)
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {requestState.status === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" aria-hidden />
              <p className="text-sm font-ibm-plex-sans text-muted-foreground">
                Loading utility due diligence report...
              </p>
              <p className="max-w-sm px-4 text-center text-xs text-zinc-500">
                This may take a minute if we need to generate a new report for this parcel.
              </p>
            </div>
          ) : null}

          {requestState.status === "success" ? (
            <UtilityReportDocument
              report={requestState.data.report}
              propertySubtitle={propertySubtitle}
              generatedAt={requestState.generatedAt}
            />
          ) : null}

          {requestState.status === "error" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-sm font-semibold text-[#B3261E]">Report failed</p>
              <p className="mt-1 text-sm font-ibm-plex-sans leading-relaxed text-[#7f1d1d]">
                {requestState.message}
              </p>
            </div>
          ) : null}
        </div>

        <div className="utility-report-no-print shrink-0 border-t border-zinc-200 bg-white px-4 py-4 sm:px-5">
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
  )
}
