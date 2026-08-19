import { getOrCreateTokenReport, getStoredTokenReport, normalizeReportType } from "@/lib/research-cache"
import { normalizeReportChainId } from "@/lib/report-network"
import { readStoredReportPdf, readStoredTokenReport, withReportLock, writeStoredReportPdf } from "@/lib/report-storage"
import { NextRequest, NextResponse } from "next/server"

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN_X = 54
const MARGIN_TOP = 48
const MARGIN_BOTTOM = 44
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const PDF_STYLE_VERSION = "styled-v1"

type PdfPage = {
  commands: string[]
}

type PdfDocument = {
  pages: PdfPage[]
  y: number
}

type TextStyle = {
  size?: number
  font?: "F1" | "F2"
  color?: string
  leading?: number
}

function sanitizeText(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function wrapText(text: string, maxChars: number): string[] {
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

function color(hex: string): string {
  const clean = hex.replace("#", "")
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`
}

function currentPage(doc: PdfDocument): PdfPage {
  return doc.pages[doc.pages.length - 1]
}

function addCommand(doc: PdfDocument, command: string) {
  currentPage(doc).commands.push(command)
}

function addPage(doc: PdfDocument) {
  doc.pages.push({ commands: [] })
  doc.y = PAGE_HEIGHT - MARGIN_TOP
  addCommand(doc, `${color("#f8fafc")} rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`)
  addCommand(doc, `${color("#e2e8f0")} RG 0.5 w ${MARGIN_X} ${MARGIN_BOTTOM - 12} ${CONTENT_WIDTH} 0 re S`)
  drawText(doc, "CoinNavigator AI Research", MARGIN_X, MARGIN_BOTTOM - 27, { size: 8, color: "#64748b" })
}

function createDocument(): PdfDocument {
  const doc: PdfDocument = { pages: [], y: PAGE_HEIGHT - MARGIN_TOP }
  addPage(doc)
  return doc
}

function ensureSpace(doc: PdfDocument, height: number) {
  if (doc.y - height < MARGIN_BOTTOM) addPage(doc)
}

function drawRect(doc: PdfDocument, x: number, y: number, width: number, height: number, fill = "#ffffff", stroke?: string) {
  addCommand(doc, `${color(fill)} rg ${x} ${y} ${width} ${height} re f`)
  if (stroke) addCommand(doc, `${color(stroke)} RG 0.8 w ${x} ${y} ${width} ${height} re S`)
}

function drawText(doc: PdfDocument, text: string, x: number, y: number, style: TextStyle = {}) {
  const font = style.font ?? "F1"
  const size = style.size ?? 10
  const fill = style.color ?? "#0f172a"
  addCommand(doc, `BT /${font} ${size} Tf ${color(fill)} rg ${x} ${y} Td (${escapePdfText(sanitizeText(text))}) Tj ET`)
}

function textLines(text: string, width: number, size: number): string[] {
  return wrapText(text, Math.max(18, Math.floor(width / (size * 0.48))))
}

function paragraphHeight(text: string, width: number, style: TextStyle = {}): number {
  const size = style.size ?? 10
  const leading = style.leading ?? size + 5
  return textLines(text, width, size).length * leading
}

function drawParagraph(doc: PdfDocument, text: string, x: number, width: number, style: TextStyle = {}) {
  const size = style.size ?? 10
  const leading = style.leading ?? size + 5
  const lines = textLines(text, width, size)
  ensureSpace(doc, lines.length * leading + 4)
  for (const line of lines) {
    drawText(doc, line, x, doc.y, style)
    doc.y -= leading
  }
}

function drawSectionTitle(doc: PdfDocument, title: string, iconLabel?: string) {
  ensureSpace(doc, 34)
  doc.y -= 10
  drawText(doc, iconLabel ? `${iconLabel}  ${title}` : title, MARGIN_X, doc.y, { size: 13, font: "F2", color: "#0f172a" })
  doc.y -= 11
  addCommand(doc, `${color("#22c55e")} RG 2 w ${MARGIN_X} ${doc.y} 80 0 re S`)
  doc.y -= 18
}

function drawCard(doc: PdfDocument, title: string, body: string, x: number, width: number) {
  const bodyHeight = paragraphHeight(body, width - 28, { size: 9, leading: 13 })
  const height = Math.max(96, bodyHeight + 50)
  ensureSpace(doc, height + 8)
  const bottom = doc.y - height
  drawRect(doc, x, bottom, width, height, "#ffffff", "#e2e8f0")
  drawText(doc, title, x + 14, doc.y - 24, { size: 10, font: "F2", color: "#0f172a" })
  const savedY = doc.y
  doc.y -= 44
  drawParagraph(doc, body, x + 14, width - 28, { size: 9, color: "#475569", leading: 13 })
  doc.y = savedY
}

function drawTwoCards(doc: PdfDocument, left: { title: string; body: string }, right: { title: string; body: string }) {
  const gap = 14
  const width = (CONTENT_WIDTH - gap) / 2
  const leftHeight = Math.max(96, paragraphHeight(left.body, width - 28, { size: 9, leading: 13 }) + 50)
  const rightHeight = Math.max(96, paragraphHeight(right.body, width - 28, { size: 9, leading: 13 }) + 50)
  const height = Math.max(leftHeight, rightHeight)
  ensureSpace(doc, height + 12)
  const top = doc.y
  drawCard(doc, left.title, left.body, MARGIN_X, width)
  doc.y = top
  drawCard(doc, right.title, right.body, MARGIN_X + width + gap, width)
  doc.y = top - height - 14
}

function drawMetricGrid(doc: PdfDocument, metrics: Array<{ label: string; value: string }>) {
  const gap = 10
  const columns = 3
  const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns
  const height = 54
  ensureSpace(doc, height + 10)
  for (const [index, metric] of metrics.entries()) {
    const x = MARGIN_X + (index % columns) * (width + gap)
    const row = Math.floor(index / columns)
    const top = doc.y - row * (height + gap)
    drawRect(doc, x, top - height, width, height, "#ffffff", "#e2e8f0")
    drawText(doc, metric.label, x + 12, top - 20, { size: 8, color: "#64748b" })
    drawText(doc, metric.value, x + 12, top - 39, { size: 11, font: "F2", color: "#0f172a" })
  }
  doc.y -= Math.ceil(metrics.length / columns) * (height + gap)
}

function drawListCard(doc: PdfDocument, title: string, items: string[], tone: "green" | "red") {
  const x = MARGIN_X
  const width = CONTENT_WIDTH
  const lines = items.flatMap((item) => textLines(item, width - 44, 9))
  const height = Math.max(86, lines.length * 13 + 44)
  ensureSpace(doc, height + 10)
  const bottom = doc.y - height
  drawRect(doc, x, bottom, width, height, "#ffffff", "#e2e8f0")
  drawText(doc, title, x + 14, doc.y - 23, { size: 10, font: "F2", color: tone === "green" ? "#15803d" : "#b91c1c" })
  let y = doc.y - 45
  for (const item of items) {
    const itemLines = textLines(item, width - 44, 9)
    drawText(doc, "-", x + 16, y, { size: 9, font: "F2", color: tone === "green" ? "#22c55e" : "#ef4444" })
    for (const [index, line] of itemLines.entries()) {
      drawText(doc, line, x + 30, y - index * 13, { size: 9, color: "#475569" })
    }
    y -= itemLines.length * 13 + 4
  }
  doc.y = bottom - 12
}

function drawSignalTable(doc: PdfDocument, title: string, rows: Array<{ label: string; value: string; note?: string }>) {
  drawSectionTitle(doc, title)
  const rowHeight = 42
  for (const row of rows) {
    ensureSpace(doc, rowHeight + 4)
    const bottom = doc.y - rowHeight
    drawRect(doc, MARGIN_X, bottom, CONTENT_WIDTH, rowHeight, "#ffffff", "#e2e8f0")
    drawText(doc, row.label, MARGIN_X + 14, doc.y - 18, { size: 9, font: "F2", color: "#0f172a" })
    drawText(doc, row.value, MARGIN_X + 210, doc.y - 18, { size: 9, color: "#334155" })
    if (row.note) drawText(doc, row.note, MARGIN_X + 210, doc.y - 32, { size: 8, color: "#64748b" })
    doc.y = bottom - 4
  }
}

function pdfObject(id: number, content: string): string {
  return `${id} 0 obj\n${content}\nendobj\n`
}

function pageContent(page: PdfPage): string {
  return page.commands.join("\n")
}

function buildPdf(doc: PdfDocument): Buffer {
  const pages = doc.pages
  const objects: string[] = []
  const pageObjectIds = pages.map((_, index) => 5 + index * 2)
  const contentObjectIds = pages.map((_, index) => 6 + index * 2)

  objects.push(pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"))
  objects.push(pdfObject(2, `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`))
  objects.push(pdfObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"))
  objects.push(pdfObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"))

  pages.forEach((page, index) => {
    const pageId = pageObjectIds[index]
    const contentId = contentObjectIds[index]
    const content = pageContent(page)
    objects.push(
      pdfObject(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
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
  const reportId = request.nextUrl.searchParams.get("id") ?? undefined
  const assetId = request.nextUrl.searchParams.get("asset") ?? undefined
  const query = request.nextUrl.searchParams.get("q") ?? undefined
  const reportTypeParam = request.nextUrl.searchParams.get("type")
  const reportType = normalizeReportType(reportTypeParam)
  const chainId = normalizeReportChainId(request.nextUrl.searchParams.get("chainId"))
  const generatedAt = request.nextUrl.searchParams.get("date") ?? undefined
  const cachedReportById = reportId ? await readStoredTokenReport(reportId) : null
  const cachedReport = cachedReportById ?? (assetId && generatedAt ? await getStoredTokenReport({ assetId, chainId, reportType, generatedAt }) : null)
  const tokenReport = cachedReport ?? await getOrCreateTokenReport({ assetId, query, chainId, reportType })
  const { asset, report } = tokenReport
  const reportKey = tokenReport.id
  const effectiveReportType = tokenReport.reportType
  const pdfCacheKey = `${reportKey}:${PDF_STYLE_VERSION}`
  const filename = `${asset.id}-${effectiveReportType}-research-${tokenReport.generatedAt.slice(0, 10)}.pdf`

  const cachedPdf = await readStoredReportPdf(pdfCacheKey)
  if (cachedPdf) {
    return new NextResponse(cachedPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  }

  const pdf = await withReportLock(`token-report-pdf:${pdfCacheKey}`, async () => {
    const pdfAfterWait = await readStoredReportPdf(pdfCacheKey)
    if (pdfAfterWait) return pdfAfterWait

    const doc = createDocument()
    drawRect(doc, 0, PAGE_HEIGHT - 132, PAGE_WIDTH, 132, "#0f172a")
    drawText(doc, "CoinNavigator", MARGIN_X, PAGE_HEIGHT - 48, { size: 10, font: "F2", color: "#86efac" })
    drawText(doc, `${asset.name} ${effectiveReportType === "deep" ? "Advanced Research" : "Quick Analysis"}`, MARGIN_X, PAGE_HEIGHT - 76, {
      size: 22,
      font: "F2",
      color: "#ffffff",
    })
    drawText(doc, `${asset.symbol} / ${asset.category} / Rank #${asset.rank}`, MARGIN_X, PAGE_HEIGHT - 99, { size: 10, color: "#cbd5e1" })
    drawText(doc, new Date(tokenReport.generatedAt).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC", MARGIN_X, PAGE_HEIGHT - 116, {
      size: 8,
      color: "#94a3b8",
    })
    doc.y = PAGE_HEIGHT - 160

    drawMetricGrid(doc, [
      { label: "Report Type", value: effectiveReportType === "deep" ? "Full Analysis" : "Quick" },
      { label: "Composite Rating", value: `${report.compositeScore}/10` },
      { label: "Market Cap", value: asset.marketCap },
      { label: "24h Volume", value: asset.volume },
      { label: "Signal", value: asset.signal },
      { label: "Risk", value: asset.risk },
    ])

    drawSectionTitle(doc, "Executive Summary", "01")
    drawRect(doc, MARGIN_X, doc.y - paragraphHeight(report.summary, CONTENT_WIDTH - 28, { size: 10, leading: 15 }) - 28, CONTENT_WIDTH, paragraphHeight(report.summary, CONTENT_WIDTH - 28, { size: 10, leading: 15 }) + 28, "#ffffff", "#e2e8f0")
    doc.y -= 18
    drawParagraph(doc, report.summary, MARGIN_X + 14, CONTENT_WIDTH - 28, { size: 10, color: "#334155", leading: 15 })
    doc.y -= 18

    drawTwoCards(
      doc,
      { title: "Project Overview", body: report.overview },
      { title: "Market Position", body: report.marketPosition },
    )
    drawListCard(doc, "Key Strengths", report.growthDrivers, "green")
    drawListCard(doc, "Main Risks", report.risks, "red")

    drawSignalTable(
      doc,
      "Market Signals",
      report.marketInterest.map((item) => ({
        label: item.label,
        value: item.value,
        note: `${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}`,
      })),
    )

    drawSignalTable(
      doc,
      "Latest Intelligence",
      report.latestIntel.map((item) => ({
        label: `${item.source} / ${item.impact}`,
        value: item.headline,
        note: item.time,
      })),
    )

    if (effectiveReportType === "deep") {
      drawSignalTable(
        doc,
        "Fundamental, Economic and Financial Analysis",
        report.fundamentals.map((item) => ({
          label: item.title,
          value: item.description,
        })),
      )
      drawSignalTable(
        doc,
        "On-chain and Social Proxies",
        [...report.onchain, ...report.social].map((item) => ({
          label: item.label,
          value: item.value,
          note: `${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}`,
        })),
      )
      drawSignalTable(
        doc,
        "Risk Framework",
        report.riskScores.map((item) => ({
          label: `${item.label} / ${item.level}`,
          value: item.note,
        })),
      )
    }

    drawSectionTitle(doc, "Disclaimer")
    drawParagraph(doc, "This report is AI-generated research for informational purposes only. It is not financial or investment advice.", MARGIN_X, CONTENT_WIDTH, {
      size: 8,
      color: "#64748b",
      leading: 12,
    })

    const generatedPdf = buildPdf(doc)
    await writeStoredReportPdf(pdfCacheKey, generatedPdf)
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
