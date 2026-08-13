import { getOrCreateTokenReport } from "@/lib/research-cache"
import { readStoredReportPdf, withReportLock, writeStoredReportPdf } from "@/lib/report-storage"
import { NextRequest, NextResponse } from "next/server"

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 54
const MARGIN_TOP = 56
const LINE_HEIGHT = 14
const MAX_LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN_TOP * 2) / LINE_HEIGHT)
const MAX_CHARS_PER_LINE = 86

function sanitizeText(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function wrapText(text: string, maxChars = MAX_CHARS_PER_LINE): string[] {
  const words = sanitizeText(text).split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`
      continue
    }
    lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function sectionLines(title: string, body: string | string[]): string[] {
  const lines = ["", title.toUpperCase()]
  if (Array.isArray(body)) {
    for (const item of body) lines.push(...wrapText(`- ${item}`))
  } else {
    lines.push(...wrapText(body))
  }
  return lines
}

function paginate(lines: string[]): string[][] {
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + MAX_LINES_PER_PAGE))
  }
  return pages.length ? pages : [["No report content."]]
}

function pageContent(lines: string[]): string {
  const commands = [
    "BT",
    "/F1 11 Tf",
    `${MARGIN_X} ${PAGE_HEIGHT - MARGIN_TOP} Td`,
    `${LINE_HEIGHT} TL`,
  ]

  lines.forEach((line, index) => {
    if (index > 0) commands.push("T*")
    commands.push(`(${escapePdfText(line)}) Tj`)
  })

  commands.push("ET")
  return commands.join("\n")
}

function pdfObject(id: number, content: string): string {
  return `${id} 0 obj\n${content}\nendobj\n`
}

function buildPdf(lines: string[]): Buffer {
  const pages = paginate(lines)
  const objects: string[] = []
  const pageObjectIds = pages.map((_, index) => 4 + index * 2)
  const contentObjectIds = pages.map((_, index) => 5 + index * 2)

  objects.push(pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"))
  objects.push(pdfObject(2, `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`))
  objects.push(pdfObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"))

  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index]
    const contentId = contentObjectIds[index]
    const content = pageContent(pageLines)
    objects.push(
      pdfObject(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    )
    objects.push(pdfObject(contentId, `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`))
  })

  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf)
}

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("asset") ?? undefined
  const query = request.nextUrl.searchParams.get("q") ?? undefined
  const reportTypeParam = request.nextUrl.searchParams.get("type")
  const reportType = reportTypeParam === "deep" ? "deep" : "quick"
  const tokenReport = await getOrCreateTokenReport({ assetId, query, reportType })
  const { asset, report } = tokenReport
  const reportKey = tokenReport.id
  const filename = `${asset.id}-${reportType}-research-${tokenReport.generatedAt.slice(0, 10)}.pdf`

  const cachedPdf = await readStoredReportPdf(reportKey)
  if (cachedPdf) {
    return new NextResponse(cachedPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  }

  const pdf = await withReportLock(`token-report-pdf:${reportKey}`, async () => {
    const pdfAfterWait = await readStoredReportPdf(reportKey)
    if (pdfAfterWait) return pdfAfterWait

    const lines = [
      `${asset.name} Research Report`,
      `${asset.symbol} / ${asset.category} / Rank #${asset.rank}`,
      `Generated: ${new Date(tokenReport.generatedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
      `Report Type: ${reportType === "deep" ? "Advanced Research" : "Quick Analysis"}`,
      "This report is AI-generated research for informational purposes only. It is not financial advice.",
      ...sectionLines("Executive Summary", report.summary),
      ...sectionLines("Project Overview", report.overview),
      ...sectionLines("Market Position", report.marketPosition),
      ...sectionLines("Growth Drivers", report.growthDrivers),
      ...sectionLines("Risks", report.risks),
      ...sectionLines("Latest Intel", report.latestIntel.map((item) => `${item.time} - ${item.headline} (${item.impact})`)),
    ]

    const generatedPdf = buildPdf(lines)
    await writeStoredReportPdf(reportKey, generatedPdf)
    return generatedPdf
  })

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
