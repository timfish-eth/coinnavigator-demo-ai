import { listStoredTokenReports } from "@/lib/report-storage"
import { NextResponse } from "next/server"

export async function GET() {
  const reports = await listStoredTokenReports()
  return NextResponse.json(
    { reports },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    },
  )
}
