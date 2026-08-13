"use client"

import { RESEARCH_PASS, useAuth } from "@/components/auth/auth-context"
import { RESEARCH_PASS_PERKS, formatPassPrice } from "@/lib/simulation"
import { cn } from "@/lib/utils"
import { CalendarClock, Check, Crown, Wallet } from "lucide-react"

const freeFeatures = ["Market overview", "Basic token analysis", "Limited AI reports"]

export function MembershipPlans({ variant = "marketing" }: { variant?: "marketing" | "app" }) {
  const { isConnected, isPro, openConnect, openPayment, membershipExpiryLabel } = useAuth()
  const showExpiry = isPro && membershipExpiryLabel !== "Not active"

  const handlePay = () => {
    if (!isConnected) {
      openConnect("report")
      return
    }
    openPayment()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Free */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Free</h3>
          {!isPro && variant === "app" && (
            <span className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/20">
              Current
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-3xl font-semibold text-foreground">$0</p>
        <p className="mt-1 text-xs text-muted-foreground">Get started, no cost</p>
        <ul className="mt-5 flex-1 space-y-2.5">
          {freeFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Research Pass */}
      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 shadow-[0_0_40px_-16px_var(--color-primary)]">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Crown className="size-4 text-accent" /> {RESEARCH_PASS.name}
          </h3>
          {isPro && variant === "app" && (
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-accent/20">
              Active
            </span>
          )}
        </div>
        <p className="relative mt-2 font-mono text-3xl font-semibold text-foreground">
          {formatPassPrice()}
        </p>
        <p className="relative mt-1 text-xs text-muted-foreground">Paid on {RESEARCH_PASS.network} with USDT</p>
        {showExpiry && (
          <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-accent/20">
            <CalendarClock className="size-3.5" />
            Expires {membershipExpiryLabel}
          </p>
        )}
        <ul className="relative mt-5 flex-1 space-y-2.5">
          {RESEARCH_PASS_PERKS.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={handlePay}
          disabled={isPro}
          className={cn(
            "relative mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-colors",
            isPro
              ? "cursor-default bg-surface text-muted-foreground ring-1 ring-border"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isPro ? (
            "Membership Active"
          ) : (
            <>
              <Wallet className="size-4" /> Pay with Wallet
            </>
          )}
        </button>
      </div>
    </div>
  )
}
