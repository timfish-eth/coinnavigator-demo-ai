import { bsc, bscTestnet } from "wagmi/chains"
import type { Address } from "viem"
import { getPublicMembershipPassAddress } from "@/config/public-chain-addresses"

export const MEMBERSHIP_MONTHS = 1n

export function getMembershipPassAddress(chainId?: number): Address | undefined {
  if (chainId === bsc.id || chainId === bscTestnet.id) return getPublicMembershipPassAddress(chainId)
  return undefined
}

export function formatMembershipExpiry(expiry?: bigint): string {
  if (!expiry) return "Not active"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(expiry) * 1000))
}
