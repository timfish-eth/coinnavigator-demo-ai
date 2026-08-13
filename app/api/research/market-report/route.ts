import { getDailyMarketAnalysis } from "@/lib/research-cache"
import { NextResponse } from "next/server"

export async function GET() {
  const { report } = await getDailyMarketAnalysis()
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  })
}
