"use client"

import { useAuth, truncateAddress } from "@/components/auth/auth-context"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Wallet } from "lucide-react"
import { useRouter } from "next/navigation"

export function ConnectWalletButton({
  size = "lg",
  className,
}: {
  size?: "sm" | "lg" | "default"
  className?: string
}) {
  const { isConnected, wallet, openConnect } = useAuth()
  const router = useRouter()

  if (isConnected && wallet) {
    return (
      <button
        onClick={() => router.push("/dashboard")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5",
          className,
        )}
      >
        <span className="size-2 rounded-full bg-success" aria-hidden />
        <Wallet className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-mono tabular-nums">{truncateAddress(wallet.address)}</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => openConnect("generic")}
      className={cn(buttonVariants({ size }), "bg-primary text-primary-foreground hover:bg-primary/90", className)}
    >
      <Wallet className="size-4" /> Connect Wallet
    </button>
  )
}
