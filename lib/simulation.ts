/**
 * Simulation configuration and helpers for demo-only features.
 *
 * These utilities keep UI-only behavior (membership, payments, report quotas)
 * isolated from real Web3 integration so the demo can run without moving
 * real funds.
 */

export type Membership = "Free" | "Pro"

export const RESEARCH_PASS = {
  name: "Research Pass",
  period: "30 Days",
  network: "BSC",
} as const

export const FREE_REPORT_LIMIT = 3

export const SIMULATED_PAYMENT_DELAY_MS = 1900

export const RESEARCH_PASS_PERKS = [
  "Unlimited AI research",
  "Advanced reports",
  "Export reports",
  "Research library",
] as const

export const SIMULATION_DISCLAIMER =
  "Simulated on-chain payment for demo purposes."

export type PaymentPhase = "confirm" | "processing" | "success"

export interface SimulatePaymentOptions {
  delayMs?: number
  onStart?: () => void
}

/**
 * Simulate an on-chain payment confirmation.
 * Resolves after the configured delay without touching any real wallet.
 */
export function simulatePayment(
  options: SimulatePaymentOptions = {},
): Promise<void> {
  const delayMs = options.delayMs ?? SIMULATED_PAYMENT_DELAY_MS
  options.onStart?.()
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

/**
 * Check whether a free-tier user can still generate a report.
 */
export function hasReportQuota(reportsRemaining: number): boolean {
  return reportsRemaining > 0
}
