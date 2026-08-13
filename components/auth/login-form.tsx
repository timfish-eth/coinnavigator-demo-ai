"use client"

import { CoinLogo } from "@/components/primitives"
import { useAuth } from "@/components/auth/auth-context"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Wallet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function LoginForm() {
  const { isConnected, openConnect } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard")
    }
  }, [isConnected, router])

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
            <button
              onClick={() => openConnect("generic")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "flex h-12 w-full items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Wallet className="size-4" /> Connect Wallet
            </button>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
              Non-custodial. We never access your funds.
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
