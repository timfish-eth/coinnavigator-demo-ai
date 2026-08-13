"use client"

import { CoinLogo } from "@/components/primitives"
import { useAuth, walletMeta, type WalletId } from "@/components/auth/auth-context"
import { WalletGlyph } from "@/components/auth/wallet-modal"
import { ChevronRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const order: WalletId[] = ["metamask", "okx", "bitget"]

export function LoginForm() {
  const { connect } = useAuth()
  const router = useRouter()

  const handleConnect = (id: WalletId) => {
    connect(id)
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center">
            <Link href="/">
              <CoinLogo size={36} />
            </Link>
            <h1 className="mt-7 text-2xl font-semibold tracking-tight text-foreground text-balance">
              Connect your wallet
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Your AI-powered Web3 research terminal.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)]">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Choose your wallet</p>
            <div className="space-y-2.5">
              {order.map((id) => (
                <button
                  key={id}
                  onClick={() => handleConnect(id)}
                  className="group flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-white/5"
                >
                  <WalletGlyph id={id} />
                  <span className="flex-1 text-sm font-medium text-foreground">{walletMeta[id].name}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
              <ShieldCheck className="size-3.5" /> Non-custodial. We never access your funds.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
