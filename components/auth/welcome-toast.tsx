"use client"

import { truncateAddress, useAuth } from "@/components/auth/auth-context"
import { Sparkles, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function WelcomeToast() {
  const { showWelcome, dismissWelcome, wallet } = useAuth()
  const router = useRouter()

  if (!showWelcome) return null

  const go = (href: string) => {
    dismissWelcome()
    router.push(href)
  }

  return (
    <div
      className="fixed right-4 top-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] toast-enter"
      role="status"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="size-[18px] text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Wallet Connected</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {wallet ? `Connected as ${truncateAddress(wallet.address)}. ` : ""}Your Web3 research terminal is ready.
          </p>
        </div>
        <button
          onClick={dismissWelcome}
          aria-label="Dismiss"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex gap-2 border-t border-border px-4 py-3">
        <button
          onClick={() => go("/market")}
          className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Explore Market
        </button>
        <button
          onClick={() => go("/watchlist")}
          className="flex-1 rounded-lg border border-border bg-surface py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/5"
        >
          Create Watchlist
        </button>
      </div>
    </div>
  )
}
