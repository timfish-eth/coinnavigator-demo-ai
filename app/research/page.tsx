import { AppShell } from "@/components/app/app-shell"
import { ResearchView } from "@/components/research/research-view"
import { normalizeReportType } from "@/lib/research-cache"

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string; type?: string; date?: string }>
}) {
  const { asset, type, date } = await searchParams
  const reportType = type ? normalizeReportType(type) : undefined
  return (
    <AppShell>
      <ResearchView initialId={asset} initialType={reportType} initialDate={date} />
    </AppShell>
  )
}
