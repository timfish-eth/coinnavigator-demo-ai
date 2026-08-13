"use client"

import {
  type PaymentPhase,
  SIMULATED_PAYMENT_DELAY_MS,
  simulatePayment,
} from "@/lib/simulation"
import { useCallback, useState } from "react"

/**
 * Manages the simulated payment lifecycle: confirm → processing → success.
 * The success callback is invoked immediately before the phase flips to success
 * so callers can activate entitlements before the UI updates.
 */
export function useSimulatedPayment(
  onSuccess?: () => void,
  delayMs = SIMULATED_PAYMENT_DELAY_MS,
) {
  const [phase, setPhase] = useState<PaymentPhase>("confirm")

  const start = useCallback(() => {
    setPhase("processing")
    simulatePayment({ delayMs }).then(() => {
      onSuccess?.()
      setPhase("success")
    })
  }, [delayMs, onSuccess])

  return {
    phase,
    start,
    isProcessing: phase === "processing",
    isSuccess: phase === "success",
  }
}
