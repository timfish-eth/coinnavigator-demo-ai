"use client"

import { RESEARCH_PASS, truncateAddress, useAuth } from "@/components/auth/auth-context"
import { erc20Abi } from "@/lib/contracts/erc20-abi"
import { membershipPassAbi } from "@/lib/contracts/membership-pass-abi"
import { displayPaymentTokenSymbol } from "@/lib/use-membership-price"
import { cn } from "@/lib/utils"
import { Check, Loader2, ShieldCheck, Wallet, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatUnits, type Address } from "viem"
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi"

type PaymentPhase = "confirm" | "approving" | "recharging" | "success"

export function PaymentModal() {
  const {
    paymentOpen,
    closePayment,
    wallet,
    refreshMembership,
    membershipExpiryLabel,
    membershipContractAddress,
    currentChainId,
    isSupportedChain,
  } = useAuth()
  const account = useAccount()
  const publicClient = usePublicClient({ chainId: currentChainId })
  const { writeContractAsync } = useWriteContract()
  const [phase, setPhase] = useState<PaymentPhase>("confirm")
  const [error, setError] = useState<string | null>(null)

  const contractReady = Boolean(membershipContractAddress && account.address && isSupportedChain)
  const { data: paymentToken } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "paymentToken",
    query: { enabled: contractReady },
  })
  const { data: monthlyPrice } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "monthlyPrice",
    query: { enabled: contractReady },
  })
  const { data: tokenSymbol } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(paymentToken) },
  })
  const { data: tokenDecimals } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(paymentToken) },
  })
  const {
    data: tokenBalance,
    isLoading: balanceLoading,
    refetch: refetchTokenBalance,
  } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account.address ? [account.address] : undefined,
    query: { enabled: Boolean(paymentToken && account.address) },
  })

  const isProcessing = phase === "approving" || phase === "recharging"
  const tokenUnit = displayPaymentTokenSymbol(tokenSymbol)
  const formattedPrice = useMemo(() => {
    if (!isSupportedChain) return "Unsupported network"
    if (!membershipContractAddress) return "Contract not configured"
    if (!monthlyPrice || tokenDecimals === undefined) return "Loading contract price..."
    return `${formatUnits(monthlyPrice, tokenDecimals)} ${tokenUnit} / ${RESEARCH_PASS.period}`
  }, [isSupportedChain, membershipContractAddress, monthlyPrice, tokenDecimals, tokenUnit])
  const formattedBalance = useMemo(() => {
    if (tokenBalance === undefined || tokenDecimals === undefined) return "-"
    return `${formatUnits(tokenBalance, tokenDecimals)} ${tokenUnit}`
  }, [tokenBalance, tokenDecimals, tokenUnit])

  const handleClose = useCallback(() => {
    if (isProcessing) return
    closePayment()
    setPhase("confirm")
    setError(null)
  }, [closePayment, isProcessing])

  useEffect(() => {
    if (!paymentOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paymentOpen, handleClose])

  const start = async () => {
    if (!membershipContractAddress || !paymentToken || !monthlyPrice || !account.address || !publicClient) {
      setError("Membership contract is not configured for the current network.")
      return
    }

    try {
      setError(null)
      const latestBalance = await refetchTokenBalance()
      const balance = latestBalance.data ?? tokenBalance ?? 0n
      if (balance < monthlyPrice) {
        setPhase("confirm")
        const required = tokenDecimals === undefined ? monthlyPrice.toString() : `${formatUnits(monthlyPrice, tokenDecimals)} ${tokenUnit}`
        const available = tokenDecimals === undefined ? balance.toString() : `${formatUnits(balance, tokenDecimals)} ${tokenUnit}`
        setError(`Insufficient ${tokenUnit} balance. Required: ${required}. Available: ${available}. Please add funds and try again.`)
        return
      }

      setPhase("approving")
      const approveHash = await writeContractAsync({
        address: paymentToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [membershipContractAddress, monthlyPrice],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      setPhase("recharging")
      const rechargeHash = await writeContractAsync({
        address: membershipContractAddress,
        abi: membershipPassAbi,
        functionName: "recharge",
      })
      await publicClient.waitForTransactionReceipt({ hash: rechargeHash })

      refreshMembership()
      setPhase("success")
    } catch (e) {
      setPhase("confirm")
      setError(e instanceof Error ? e.message : "Transaction failed. Please try again.")
    }
  }

  if (!paymentOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Close payment"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop-enter"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm payment"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-white/[0.08] bg-[#0B1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] modal-panel-enter",
          "rounded-t-2xl sm:w-[420px] sm:rounded-2xl",
        )}
      >
        {!isProcessing && (
          <div className="flex items-center justify-end px-5 pt-5">
            <button
              onClick={handleClose}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col px-7 pb-8 pt-4">
          {phase === "success" ? (
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-success/15 ring-1 ring-success/30">
                <Check className="size-7 text-success" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Payment Successful</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Membership Activated</p>
              <div className="mt-5 w-full rounded-xl border border-border bg-surface p-4 text-left text-sm">
                <Row label="Plan" value={RESEARCH_PASS.name} />
                <Row label="Amount" value={formattedPrice} mono />
                <Row label="Network" value={wallet?.network ?? RESEARCH_PASS.network} />
                <Row label="Status" value="Active" />
                {membershipExpiryLabel !== "Not active" && <Row label="Expires" value={membershipExpiryLabel} />}
              </div>
              <button
                onClick={handleClose}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start Researching
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                  <Wallet className="size-6 text-primary" />
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Confirm Payment</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Approve stablecoin payment, then recharge membership.</p>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                <Row label="Plan" value={RESEARCH_PASS.name} />
                <Row label="Price" value={formattedPrice} mono />
                <Row label="Balance" value={balanceLoading ? "Checking..." : formattedBalance} mono />
                <Row label="Network" value={wallet?.network ?? RESEARCH_PASS.network} />
                <Row label="From" value={wallet ? truncateAddress(wallet.address) : "-"} mono />
              </div>

              <button
                onClick={start}
                disabled={isProcessing || !contractReady}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-80"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {phase === "approving" ? "Approving token..." : "Recharging membership..."}
                  </>
                ) : (
                  <>Confirm Transaction</>
                )}
              </button>
              {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
                <ShieldCheck className="size-3.5" /> Membership is verified from the connected wallet address.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  )
}
