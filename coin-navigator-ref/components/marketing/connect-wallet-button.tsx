"use client"

import { useAuth, truncateAddress } from "@/components/auth/auth-context"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"

export function ConnectWalletButton({
  size = "lg",
  className,
  connectedLabel = "Enter Terminal",
}: {
  size?: "sm" | "lg" | "default"
  className?: string
  connectedLabel?: string
}) {
  const { isConnected, wallet, openConnect } = useAuth()
  const router = useRouter()

  if (isConnected && wallet) {
    return (
      <button
        onClick={() => router.push("/dashboard")}
        className={cn(buttonVariants({ size }), "bg-primary text-primary-foreground hover:bg-primary/90", className)}
      >
        <span className="font-mono">{truncateAddress(wallet.address)}</span>
        <ArrowRight className="size-4" />
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
