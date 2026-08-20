import { getDailyMarketAnalysis } from "@/lib/research-cache"
import { NextResponse } from "next/server"

export async function GET() {
  const analysis = await getDailyMarketAnalysis()
  return NextResponse.json(analysis, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
