import { getDailyMarketAnalysis } from "@/lib/research-cache"
import { NextResponse } from "next/server"

export async function GET() {
  const { report } = await getDailyMarketAnalysis()
  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
