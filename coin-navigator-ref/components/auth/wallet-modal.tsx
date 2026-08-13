"use client"

import { CoinLogo } from "@/components/primitives"
import { useAuth, walletMeta, type WalletId } from "@/components/auth/auth-context"
import { cn } from "@/lib/utils"
import { ChevronRight, ShieldCheck, X } from "lucide-react"
import { useEffect, useState } from "react"

const order: WalletId[] = ["metamask", "okx", "bitget"]

export function WalletModal() {
  const { connectOpen, closeConnect, intent, intentCopy, connect } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (connectOpen) setMounted(true)
  }, [connectOpen])

  useEffect(() => {
    if (!connectOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConnect()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [connectOpen, closeConnect])

  if (!connectOpen) return null

  const copy = intentCopy(intent)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close connect wallet"
        onClick={closeConnect}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          mounted ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect Wallet"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-white/[0.08] bg-[#0B1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] transition-all duration-200",
          "rounded-t-2xl sm:w-[420px] sm:rounded-2xl",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-end px-5 pt-5">
          <button
            onClick={closeConnect}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col px-7 pb-8 pt-2">
          <div className="flex flex-col items-center text-center">
            <CoinLogo size={34} />
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-foreground text-balance">Connect Wallet</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{copy.subtitle}</p>
          </div>

          <div className="mt-7 space-y-2.5">
            {order.map((id) => (
              <button
                key={id}
                onClick={() => connect(id)}
                className="group flex w-full items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-white/[0.06]"
              >
                <WalletGlyph id={id} />
                <span className="flex-1 text-sm font-medium text-foreground">{walletMeta[id].name}</span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
            <ShieldCheck className="size-3.5" />
            Non-custodial. We never access your funds.
          </p>
        </div>
      </div>
    </div>
  )
}

export function WalletGlyph({ id, size = 36 }: { id: WalletId; size?: number }) {
  const meta = walletMeta[id]
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white"
      style={{
        width: size,
        height: size,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <img
        src={meta.logo || "/placeholder.svg"}
        alt={`${meta.name} logo`}
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        className="object-contain"
      />
    </span>
  )
}
