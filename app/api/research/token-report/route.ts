import { getOrCreateTokenReport } from "@/lib/research-cache"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("asset") ?? undefined
  const query = request.nextUrl.searchParams.get("q") ?? undefined
  const reportTypeParam = request.nextUrl.searchParams.get("type")
  const reportType = reportTypeParam === "deep" ? "deep" : "quick"

  const report = await getOrCreateTokenReport({ assetId, query, reportType })
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  })
}
