"use client"

import { AlertTriangle } from "lucide-react"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"

const reportMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 border-b border-zinc-200 pb-2 text-xl font-semibold text-zinc-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-lg font-semibold text-zinc-900">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-zinc-800">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-zinc-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-disc space-y-1.5 text-sm text-zinc-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-sm text-zinc-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-6 border-zinc-200" />,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
}

function slugifyFilename(value: string): string {
  return value
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .toLowerCase()
}

export function buildUtilityReportFilename(
  propertySubtitle: string,
  listingId: number,
  extension: "md" | "pdf"
): string {
  const slug = slugifyFilename(propertySubtitle) || `listing-${listingId}`
  return `utility-due-diligence-${slug}.${extension}`
}

export function downloadUtilityReportMarkdown(
  report: string,
  propertySubtitle: string,
  listingId: number
): void {
  const blob = new Blob([report], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = buildUtilityReportFilename(propertySubtitle, listingId, "md")
  anchor.click()
  URL.revokeObjectURL(url)
}

export function printUtilityReport(): void {
  window.print()
}

type UtilityReportDocumentProps = {
  report: string
  propertySubtitle: string
  generatedAt?: Date
}

export function UtilityReportDocument({
  report,
  propertySubtitle,
  generatedAt = new Date(),
}: UtilityReportDocumentProps) {
  const formattedDate = generatedAt.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  })

  return (
    <article
      id="utility-report-document"
      className="utility-report-document rounded-xl border border-zinc-200 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-8"
    >
      <div
        role="note"
        className="mb-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <p className="text-sm font-ibm-plex-sans leading-relaxed">
          <span className="font-semibold">AI-generated.</span> Please contact your realtor, utility
          providers, and local authorities to verify before relying on this information or making
          an offer.
        </p>
      </div>

      <header className="mb-6 border-b border-zinc-200 pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-green">
          Infrastructure &amp; Utility Due Diligence
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl">
          {propertySubtitle}
        </h1>
        <p className="mt-2 text-xs text-zinc-500">Generated {formattedDate}</p>
      </header>

      <div className="utility-report-markdown font-ibm-plex-sans">
        <ReactMarkdown components={reportMarkdownComponents}>{report}</ReactMarkdown>
      </div>
    </article>
  )
}
