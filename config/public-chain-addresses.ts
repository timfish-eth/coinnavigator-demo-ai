import type { Address } from "viem"
import { bsc, bscTestnet } from "wagmi/chains"

export const PUBLIC_CHAIN_FEATURES = {
  enableBscTestnet: true,
} as const

export const PUBLIC_CHAIN_ADDRESSES = {
  NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS: "0x87dF983571427F755749946bcACf627456910A8C" as Address,
  NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS: "0x1d3e926aB0a65A7d618430C112045273A4df4492" as Address,
  BSC_TESTNET_MOCK_USDT_ADDRESS: "0x598eF48d5B25B2930faA250A32A4DFb376aE5A93" as Address,
  USDT_ADDRESS: "0x55d398326f99059fF775485246999027B3197955" as Address,
} as const

export function isBscTestnetEnabled(): boolean {
  return PUBLIC_CHAIN_FEATURES.enableBscTestnet
}

export function getPublicMembershipPassAddress(chainId?: number): Address | undefined {
  if (chainId === bscTestnet.id && isBscTestnetEnabled()) return PUBLIC_CHAIN_ADDRESSES.NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS
  if (chainId === bsc.id) return PUBLIC_CHAIN_ADDRESSES.NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS
  return undefined
}

export function getPublicMockUsdtAddress(chainId?: number): Address | undefined {
  if (chainId === bscTestnet.id && isBscTestnetEnabled()) return PUBLIC_CHAIN_ADDRESSES.BSC_TESTNET_MOCK_USDT_ADDRESS
  if (chainId === bsc.id) return PUBLIC_CHAIN_ADDRESSES.USDT_ADDRESS
  return undefined
}
