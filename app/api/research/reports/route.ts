import { listStoredTokenReports, readStoredTokenReport } from "@/lib/report-storage"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (id) {
    const report = await readStoredTokenReport(id)
    if (!report) {
      return NextResponse.json({ error: "stored report not found" }, { status: 404 })
    }
    return NextResponse.json(
      { report: { ...report, cacheStatus: "hit" } },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      },
    )
  }

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
