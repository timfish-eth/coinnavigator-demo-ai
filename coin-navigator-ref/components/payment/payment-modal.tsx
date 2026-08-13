"use client"

import { RESEARCH_PASS, truncateAddress, useAuth } from "@/components/auth/auth-context"
import { cn } from "@/lib/utils"
import { Check, Loader2, ShieldCheck, Wallet, X } from "lucide-react"
import { useEffect, useState } from "react"

type Phase = "confirm" | "processing" | "success"

export function PaymentModal() {
  const { paymentOpen, closePayment, wallet, activatePro } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>("confirm")

  useEffect(() => {
    if (paymentOpen) {
      setMounted(true)
      setPhase("confirm")
    }
  }, [paymentOpen])

  useEffect(() => {
    if (!paymentOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "processing") closePayment()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paymentOpen, closePayment, phase])

  if (!paymentOpen) return null

  const confirm = () => {
    setPhase("processing")
    setTimeout(() => {
      activatePro()
      setPhase("success")
    }, 1900)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Close payment"
        onClick={() => phase !== "processing" && closePayment()}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          mounted ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm payment"
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-white/[0.08] bg-[#0B1220] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] transition-all duration-200",
          "rounded-t-2xl sm:w-[420px] sm:rounded-2xl",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        {phase !== "processing" && (
          <div className="flex items-center justify-end px-5 pt-5">
            <button
              onClick={closePayment}
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
                <Row label="Amount" value={RESEARCH_PASS.price} mono />
                <Row label="Network" value={RESEARCH_PASS.network} />
                <Row label="Status" value="Active — 30 Days" />
              </div>
              <button
                onClick={closePayment}
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
                <p className="mt-1.5 text-sm text-muted-foreground">Review the transaction in your wallet.</p>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                <Row label="Plan" value={RESEARCH_PASS.name} />
                <Row label="Price" value={`${RESEARCH_PASS.price} / ${RESEARCH_PASS.period}`} mono />
                <Row label="Network" value={RESEARCH_PASS.network} />
                <Row label="From" value={wallet ? truncateAddress(wallet.address) : "—"} mono />
              </div>

              <button
                onClick={confirm}
                disabled={phase === "processing"}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-80"
              >
                {phase === "processing" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirming transaction…
                  </>
                ) : (
                  <>Confirm Transaction</>
                )}
              </button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
                <ShieldCheck className="size-3.5" /> Simulated on-chain payment for demo purposes.
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
