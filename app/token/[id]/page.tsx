import { AppShell } from "@/components/app/app-shell"
import { TokenView } from "@/components/token/token-view"
import { assets } from "@/lib/data"
import { getOrCreateTokenProfile } from "@/lib/research-cache"

export function generateStaticParams() {
  return assets.map((a) => ({ id: a.id }))
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { asset } = await getOrCreateTokenProfile(id)
  return (
    <AppShell>
      <TokenView asset={asset} />
    </AppShell>
  )
}
