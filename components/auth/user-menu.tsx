"use client"

import { truncateAddress, useAuth } from "@/components/auth/auth-context"
import { WalletGlyph } from "@/components/auth/wallet-glyph"
import { bsc, bscTestnet } from "wagmi/chains"
import { CalendarClock, Crown, LogOut, Wallet as WalletIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export function UserMenu() {
  const {
    wallet,
    isConnected,
    isPro,
    openConnect,
    openUpgrade,
    disconnect,
    currentChainId,
    isSupportedChain,
    switchChain,
    membershipExpiryLabel,
  } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const showExpiry = isPro && membershipExpiryLabel !== "Not active"

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  if (!isConnected || !wallet) {
    return (
      <button
        onClick={() => openConnect("generic")}
        className="ml-1 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <WalletIcon className="size-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
      </button>
    )
  }

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Wallet menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 transition-colors hover:border-primary/40"
      >
        <WalletGlyph id={wallet.walletId} size={28} />
        <span className="hidden font-mono text-xs font-medium text-foreground sm:inline">
          {truncateAddress(wallet.address)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-64 origin-top-right animate-in fade-in slide-in-from-top-1 overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] duration-150">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <WalletGlyph id={wallet.walletId} size={40} />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium text-foreground">
                {truncateAddress(wallet.address)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{wallet.network} Network</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Membership</span>
            <span
              className={
                isPro
                  ? "inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent ring-1 ring-accent/20"
                  : "inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border"
              }
            >
              {isPro && <Crown className="size-3" />}
              {isPro ? "Research Pass" : "Free Member"}
            </span>
          </div>
          {showExpiry && (
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Expires
              </span>
              <span className="text-right text-xs font-medium text-foreground">{membershipExpiryLabel}</span>
            </div>
          )}

          {!isPro && (
            <div className="border-b border-border py-1.5">
              <button
                onClick={() => {
                  setOpen(false)
                  openUpgrade()
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <Crown className="size-4" />
                Upgrade
              </button>
            </div>
          )}

          <div className="border-b border-border py-1.5">
            <div className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Network</div>
            {!isSupportedChain && (
              <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                Unsupported network
              </div>
            )}
            <button
              onClick={() => switchChain(bsc.id)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${currentChainId === bsc.id ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span>BSC Mainnet</span>
              {currentChainId === bsc.id && <span className="size-2 rounded-full bg-success" />}
            </button>
            <button
              onClick={() => switchChain(bscTestnet.id)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${currentChainId === bscTestnet.id ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span>BSC Testnet</span>
              {currentChainId === bscTestnet.id && <span className="size-2 rounded-full bg-success" />}
            </button>
          </div>

          <div className="py-1.5">
            <button
              onClick={() => {
                setOpen(false)
                disconnect()
                router.push("/dashboard")
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive/90 transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
