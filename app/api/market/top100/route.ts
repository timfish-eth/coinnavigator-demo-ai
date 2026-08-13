import { getTopAssets } from "@/lib/market-data"
import { NextResponse } from "next/server"

export async function GET() {
  const data = await getTopAssets()
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  })
}
