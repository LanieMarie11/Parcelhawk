import { buildMarkdownReportDocxBlob } from "@/lib/reports/build-markdown-report-docx"

const AI_DISCLAIMER =
  "AI-generated. Please contact your realtor, utility providers, and local authorities to verify before relying on this information or making an offer."

export async function buildUtilityReportDocxBlob(options: {
  report: string
  propertySubtitle: string
  generatedAt: Date
}): Promise<Blob> {
  return buildMarkdownReportDocxBlob({
    markdown: options.report,
    propertySubtitle: options.propertySubtitle,
    generatedAt: options.generatedAt,
    reportLabel: "Infrastructure & Utility Due Diligence",
    disclaimer: AI_DISCLAIMER,
  })
}
