"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { RESEARCH_PASS, truncateAddress, useAuth, walletMeta } from "@/components/auth/auth-context"
import { WalletGlyph } from "@/components/auth/wallet-glyph"
import { useMembershipPriceLabel } from "@/lib/use-membership-price"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, Crown, Wallet } from "lucide-react"

const freeFeatures = ["Market overview", "Basic token analysis", "Limited AI reports"]
const proFeatures = ["Unlimited AI research", "Advanced reports", "Export reports", "Research library"]

export function SettingsView() {
  const { wallet, isConnected, isPro, openConnect, openPayment, disconnect, membershipExpiryLabel } = useAuth()
  const priceLabel = useMembershipPriceLabel()
  const router = useRouter()
  const showExpiry = isPro && membershipExpiryLabel !== "Not active"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your wallet and membership.</p>
      </div>

      {/* 1 — Wallet */}
      <Panel>
        <PanelHeader title="Wallet" icon={Wallet} />
        {isConnected && wallet ? (
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <WalletGlyph id={wallet.walletId} size={56} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Connected Wallet
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-foreground">
                  {truncateAddress(wallet.address)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-md bg-surface px-2.5 py-1 font-medium text-muted-foreground ring-1 ring-border">
                  {walletMeta[wallet.walletId].name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary ring-1 ring-primary/20">
                  <span className="size-1.5 rounded-full bg-primary" /> {wallet.network} Network
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                disconnect()
                router.push("/dashboard")
              }}
              className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">No wallet connected. Connect a wallet to access the terminal.</p>
            <button
              onClick={() => openConnect("generic")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Wallet className="size-4" /> Connect Wallet
            </button>
          </div>
        )}
      </Panel>

      {/* 2 — Membership */}
      <Panel>
        <PanelHeader
          title="Membership"
          icon={Crown}
          action={
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1",
                isPro
                  ? "bg-accent/10 text-accent ring-accent/20"
                  : "bg-surface text-muted-foreground ring-border",
              )}
            >
              {isPro && <Crown className="size-3" />}
              Current: {isPro ? RESEARCH_PASS.name : "Free"}
            </span>
          }
        />
        <div className="grid gap-px bg-border/60 sm:grid-cols-2">
          <PlanColumn
            title="Free"
            price="$0"
            features={freeFeatures}
            current={!isPro}
          />
          <PlanColumn
            title={RESEARCH_PASS.name}
            price={priceLabel}
            features={proFeatures}
            current={isPro}
            highlight
          />
        </div>
        {showExpiry && (
          <div className="flex items-center justify-between gap-3 border-t border-border p-5">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4 text-accent" />
              Membership expires
            </p>
            <p className="text-sm font-medium text-foreground">{membershipExpiryLabel}</p>
          </div>
        )}
        {!isPro && (
          <div className="flex items-center justify-between gap-3 border-t border-border p-5">
            <p className="text-sm text-muted-foreground">
              Upgrade to unlock unlimited AI research and exports.
            </p>
            <button
              onClick={() => (isConnected ? openPayment() : openConnect("report"))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Crown className="size-3.5" /> Upgrade Membership
            </button>
          </div>
        )}
      </Panel>
    </div>
  )
}

function PlanColumn({
  title,
  price,
  features,
  current,
  highlight,
}: {
  title: string
  price: string
  features: string[]
  current: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {highlight && <Crown className="size-3.5 text-accent" />}
          {title}
        </p>
        {current && (
          <span className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/20">
            Current
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{price}</p>
      <ul className="mt-3 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Check className={cn("mt-0.5 size-3.5 shrink-0", highlight ? "text-accent" : "text-primary")} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}
