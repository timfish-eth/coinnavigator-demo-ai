import { AppShell } from "@/components/app/app-shell"
import { TokenView } from "@/components/token/token-view"
import { assets, getAsset } from "@/lib/data"

export function generateStaticParams() {
  return assets.map((a) => ({ id: a.id }))
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = getAsset(id)
  return (
    <AppShell>
      <TokenView asset={asset} />
    </AppShell>
  )
}
