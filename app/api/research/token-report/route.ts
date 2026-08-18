import { getOrCreateTokenReport, getStoredTokenReport, normalizeReportType } from "@/lib/research-cache"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("asset") ?? undefined
  const query = request.nextUrl.searchParams.get("q") ?? undefined
  const reportTypeParam = request.nextUrl.searchParams.get("type")
  const reportType = normalizeReportType(reportTypeParam)
  const cacheMode = request.nextUrl.searchParams.get("cache")
  const generatedAt = request.nextUrl.searchParams.get("date") ?? undefined

  if (cacheMode === "only") {
    if (!assetId) {
      return NextResponse.json({ error: "asset is required for cache-only report lookup" }, { status: 400 })
    }
    const cached = await getStoredTokenReport({ assetId, reportType, generatedAt })
    if (!cached) {
      return NextResponse.json({ error: "cached report not found" }, { status: 404 })
    }
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    })
  }

  const report = await getOrCreateTokenReport({ assetId, query, reportType })
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  })
}
