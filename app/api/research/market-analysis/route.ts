import { getDailyMarketAnalysis } from "@/lib/research-cache"
import { NextResponse } from "next/server"

export async function GET() {
  const analysis = await getDailyMarketAnalysis()
  return NextResponse.json(analysis, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  })
}
