"use client"

import { Panel } from "@/components/app/panel"
import { RESEARCH_PASS, useAuth } from "@/components/auth/auth-context"
import { MembershipPlans } from "@/components/marketing/membership-plans"
import { useMembershipPriceLabel } from "@/lib/use-membership-price"
import { cn } from "@/lib/utils"
import { ArrowRight, CalendarClock, Check, FileText, LibraryBig, ShieldCheck, Sparkles, Wallet, X, type LucideIcon } from "lucide-react"

const flow = [
  { icon: Sparkles, label: "Run unlimited AI research" },
  { icon: FileText, label: "Generate advanced reports" },
  { icon: LibraryBig, label: "Build a full research library" },
]

const accessRows = [
  { feature: "Market overview, token pages and watchlist", free: true, pass: true },
  { feature: "View historical reports in Library", free: true, pass: true },
  { feature: "Generate Quick Analysis", free: false, pass: true },
  { feature: "Generate Advanced Research", free: false, pass: true },
  { feature: "Download styled PDF reports", free: false, pass: true },
]

export function MembershipView() {
  const { isConnected, isPro, membershipExpiryLabel, wallet, isSupportedChain } = useAuth()
  const priceLabel = useMembershipPriceLabel()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your plan and pay on-chain with USDT on {RESEARCH_PASS.network}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          icon={Wallet}
          label="Wallet"
          value={isConnected && wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Not connected"}
          tone={isConnected ? "active" : "neutral"}
        />
        <StatusCard
          icon={ShieldCheck}
          label="Plan Status"
          value={isPro ? "Research Pass Active" : "Free"}
          tone={isPro ? "active" : "neutral"}
        />
        <StatusCard
          icon={CalendarClock}
          label="Billing"
          value={isPro && membershipExpiryLabel !== "Not active" ? `Expires ${membershipExpiryLabel}` : priceLabel}
          tone={isSupportedChain ? "active" : "warning"}
        />
      </div>

      <MembershipPlans variant="app" />

      <Panel className="overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">Feature Access</h2>
          <p className="mt-1 text-xs text-muted-foreground">Library browsing remains open to connected users; generation and export require Research Pass.</p>
        </div>
        <div className="divide-y divide-border">
          {accessRows.map((row) => (
            <div key={row.feature} className="grid grid-cols-[1fr_80px_80px] items-center gap-3 p-4 text-sm sm:grid-cols-[1fr_120px_120px]">
              <span className="text-foreground/90">{row.feature}</span>
              <AccessCell enabled={row.free} label="Free" />
              <AccessCell enabled={row.pass} label="Pass" />
            </div>
          ))}
        </div>
      </Panel>

      {!isPro && (
        <Panel className="overflow-hidden">
          <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute -left-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                With Research Pass you can
              </p>
              <ul className="mt-3 space-y-2">
                {flow.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm text-foreground/90">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <f.icon className="size-3.5 text-primary" />
                    </span>
                    {f.label}
                    <ArrowRight className="ml-auto hidden size-3.5 text-muted-foreground sm:block" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Membership is verified from your connected wallet address on-chain.
      </p>
    </div>
  )
}

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: "active" | "neutral" | "warning"
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg ring-1",
            tone === "active" && "bg-accent/10 text-accent ring-accent/20",
            tone === "warning" && "bg-destructive/10 text-destructive ring-destructive/20",
            tone === "neutral" && "bg-surface text-muted-foreground ring-border",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </Panel>
  )
}

function AccessCell({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-medium ring-1",
        enabled
          ? "bg-success/10 text-success ring-success/20"
          : "bg-surface text-muted-foreground ring-border",
      )}
    >
      {enabled ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
