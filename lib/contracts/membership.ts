import { bsc, bscTestnet } from "wagmi/chains"
import type { Address } from "viem"
import { getPublicMembershipPassAddress } from "@/config/public-chain-addresses"

export const MEMBERSHIP_MONTHS = 1n

const addressPattern = /^0x[a-fA-F0-9]{40}$/

function asAddress(value: string | undefined): Address | undefined {
  if (!value || !addressPattern.test(value)) return undefined
  return value as Address
}

export function getMembershipPassAddress(chainId?: number): Address | undefined {
  if (chainId === bsc.id) {
    return (
      asAddress(process.env.NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS) ??
      asAddress(process.env.NEXT_PUBLIC_MEMBERSHIP_PASS_ADDRESS) ??
      getPublicMembershipPassAddress(chainId)
    )
  }

  if (chainId === bscTestnet.id) {
    return (
      asAddress(process.env.NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS) ??
      getPublicMembershipPassAddress(chainId)
    )
  }

  return undefined
}

export function formatMembershipExpiry(expiry?: bigint): string {
  if (!expiry) return "Not active"
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(expiry) * 1000))
}
