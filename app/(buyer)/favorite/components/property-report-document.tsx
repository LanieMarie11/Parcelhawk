"use client"

import type { ParcelResearchReport } from "@/lib/property-reports/build-parcel-research-report"
import { parcelResearchReportToMarkdown } from "@/lib/property-reports/parcel-research-report-to-markdown"

const PROPERTY_REPORT_DISCLAIMER =
  "Data sourced from public records and third-party parcel data. Verify with the county assessor, recorder, and local authorities before making an offer."

function slugifyFilename(value: string): string {
  return value
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .toLowerCase()
}

export function buildPropertyReportFilename(
  propertySubtitle: string,
  listingId: number,
  extension: "md" | "docx"
): string {
  const slug = slugifyFilename(propertySubtitle) || `listing-${listingId}`
  return `parcel-research-${slug}.${extension}`
}

export function downloadPropertyReportMarkdown(
  report: ParcelResearchReport,
  propertySubtitle: string,
  listingId: number
): void {
  const markdown = parcelResearchReportToMarkdown(report)
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = buildPropertyReportFilename(propertySubtitle, listingId, "md")
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadPropertyReportDocx(
  report: ParcelResearchReport,
  propertySubtitle: string,
  listingId: number,
  generatedAt: Date
): Promise<void> {
  const markdown = parcelResearchReportToMarkdown(report)
  const { buildMarkdownReportDocxBlob } = await import("@/lib/reports/build-markdown-report-docx")
  const blob = await buildMarkdownReportDocxBlob({
    markdown,
    propertySubtitle,
    generatedAt,
    reportLabel: "Parcel Research Report",
    disclaimer: PROPERTY_REPORT_DISCLAIMER,
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = buildPropertyReportFilename(propertySubtitle, listingId, "docx")
  anchor.click()
  URL.revokeObjectURL(url)
}
