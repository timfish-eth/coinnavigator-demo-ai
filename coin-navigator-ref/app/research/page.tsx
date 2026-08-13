import { AppShell } from "@/components/app/app-shell"
import { ResearchView } from "@/components/research/research-view"

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>
}) {
  const { asset } = await searchParams
  return (
    <AppShell>
      <ResearchView initialId={asset} />
    </AppShell>
  )
}
