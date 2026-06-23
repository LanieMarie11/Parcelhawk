import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx"

const AI_DISCLAIMER =
  "AI-generated. Please contact your realtor, utility providers, and local authorities to verify before relying on this information or making an offer."

function parseInlineText(text: string): TextRun[] {
  const runs: TextRun[] = []
  const pattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }))
    }
    runs.push(new TextRun({ text: match[1], bold: true }))
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }))
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }))
  }

  return runs
}

function markdownToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const lines = markdown.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) continue

    if (/^---+$/.test(trimmed)) {
      paragraphs.push(new Paragraph({ spacing: { before: 200, after: 200 } }))
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3

      paragraphs.push(
        new Paragraph({
          heading,
          spacing: { before: level === 1 ? 240 : 180, after: 100 },
          children: parseInlineText(headingMatch[2]),
        }),
      )
      continue
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: parseInlineText(bulletMatch[1]),
        }),
      )
      continue
    }

    paragraphs.push(
      new Paragraph({
        spacing: { after: 120 },
        children: parseInlineText(trimmed),
      }),
    )
  }

  return paragraphs
}

export async function buildUtilityReportDocxBlob(options: {
  report: string
  propertySubtitle: string
  generatedAt: Date
}): Promise<Blob> {
  const { report, propertySubtitle, generatedAt } = options
  const formattedDate = generatedAt.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  })

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: AI_DISCLAIMER,
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "Infrastructure & Utility Due Diligence",
                bold: true,
                color: "2D6A4F",
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 80 },
            children: [new TextRun({ text: propertySubtitle })],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Generated ${formattedDate}`,
                color: "666666",
                size: 18,
              }),
            ],
          }),
          ...markdownToParagraphs(report),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}
