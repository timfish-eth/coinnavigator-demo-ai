import { AppShell } from "@/components/app/app-shell"
import { TokenView } from "@/components/token/token-view"
import { getOrCreateTokenProfile, getTokenResearchSnapshot } from "@/lib/research-cache"

export const dynamic = "force-dynamic"

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { asset } = await getOrCreateTokenProfile(id)
  const research = await getTokenResearchSnapshot(asset)
  return (
    <AppShell>
      <TokenView asset={asset} research={research} />
    </AppShell>
  )
}
