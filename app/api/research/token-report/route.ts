import { normalizeReportChainId } from "@/lib/report-network"
import { getOrCreateTokenReport, getStoredTokenReport, normalizeReportType } from "@/lib/research-cache"
import type { Asset } from "@/lib/data"
import { NextRequest, NextResponse } from "next/server"

function parseAssetSnapshot(value: string | null): Asset | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value) as Partial<Asset>
    if (!parsed.id || !parsed.name || !parsed.symbol) return undefined
    return {
      id: parsed.id,
      name: parsed.name,
      symbol: parsed.symbol,
      category: parsed.category ?? "Market",
      price: typeof parsed.price === "number" ? parsed.price : 0,
      change24h: typeof parsed.change24h === "number" ? parsed.change24h : 0,
      marketCap: parsed.marketCap ?? "-",
      volume: parsed.volume ?? "-",
      rank: typeof parsed.rank === "number" ? parsed.rank : 999,
      signal: parsed.signal === "Bullish" || parsed.signal === "Bearish" ? parsed.signal : "Neutral",
      risk: parsed.risk === "Low" || parsed.risk === "Medium" || parsed.risk === "High" ? parsed.risk : "High",
      activity: typeof parsed.activity === "number" ? parsed.activity : 50,
      event: parsed.event ?? `${parsed.name} was selected from market search results.`,
      trend: Array.isArray(parsed.trend) && parsed.trend.every((point) => typeof point === "number") ? parsed.trend : [],
      color: parsed.color ?? "#64748b",
      imageUrl: parsed.imageUrl,
      source: parsed.source === "CoinMarketCap" || parsed.source === "CoinGecko" || parsed.source === "Demo" ? parsed.source : "Demo",
    }
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("asset") ?? undefined
  const query = request.nextUrl.searchParams.get("q") ?? undefined
  const assetSnapshot = parseAssetSnapshot(request.nextUrl.searchParams.get("snapshot"))
  const reportTypeParam = request.nextUrl.searchParams.get("type")
  const reportType = normalizeReportType(reportTypeParam)
  const chainId = normalizeReportChainId(request.nextUrl.searchParams.get("chainId"))
  const cacheMode = request.nextUrl.searchParams.get("cache")
  const generatedAt = request.nextUrl.searchParams.get("date") ?? undefined

  if (cacheMode === "only") {
    if (!assetId) {
      return NextResponse.json({ error: "asset is required for cache-only report lookup" }, { status: 400 })
    }
    const cached = await getStoredTokenReport({ assetId, chainId, reportType, generatedAt })
    if (!cached) {
      return NextResponse.json({ error: "cached report not found" }, { status: 404 })
    }
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  }

  const report = await getOrCreateTokenReport({ assetId, query, assetSnapshot, chainId, reportType })
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
