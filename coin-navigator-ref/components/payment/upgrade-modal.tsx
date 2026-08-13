"use client"

import { RESEARCH_PASS, useAuth } from "@/components/auth/auth-context"
import { cn } from "@/lib/utils"
import { Check, Crown, X } from "lucide-react"
import { useEffect, useState } from "react"

const perks = ["Unlimited AI research", "Advanced reports", "Export reports", "Research library"]

export function UpgradeModal() {
  const { upgradeOpen, closeUpgrade, openPayment } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (upgradeOpen) setMounted(true)
  }, [upgradeOpen])

  useEffect(() => {
    if (!upgradeOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUpgrade()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [upgradeOpen, closeUpgrade])

  if (!upgradeOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close upgrade"
        onClick={closeUpgrade}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          mounted ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to Research Pass"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-white/[0.08] bg-[#0B1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] transition-all duration-200",
          "rounded-t-2xl sm:w-[420px] sm:rounded-2xl",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-end px-5 pt-5">
          <button
            onClick={closeUpgrade}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col px-7 pb-8 pt-2">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
              <Crown className="size-6 text-accent" />
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground text-balance">
              Advanced Research requires Research Pass
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{RESEARCH_PASS.price}</span> / {RESEARCH_PASS.period}
            </p>
          </div>

          <ul className="mt-6 grid gap-2">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-foreground/90">
                <Check className="size-4 shrink-0 text-accent" /> {p}
              </li>
            ))}
          </ul>

          <button
            onClick={openPayment}
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Crown className="size-4" /> Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}
