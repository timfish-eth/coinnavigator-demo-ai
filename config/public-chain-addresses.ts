import type { Address } from "viem"
import { bsc, bscTestnet } from "wagmi/chains"

export const PUBLIC_CHAIN_ADDRESSES = {
  NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS: "0x87dF983571427F755749946bcACf627456910A8C" as Address,
  NEXT_PUBLIC_MEMBERSHIP_PASS_ADDRESS: "0x87dF983571427F755749946bcACf627456910A8C" as Address,
  BSC_TESTNET_MOCK_USDT_ADDRESS: "0x598eF48d5B25B2930faA250A32A4DFb376aE5A93" as Address,
  MOCK_USDT_ADDRESS: "0x598eF48d5B25B2930faA250A32A4DFb376aE5A93" as Address,
} as const

export function getPublicMembershipPassAddress(chainId?: number): Address | undefined {
  if (chainId === bscTestnet.id) return PUBLIC_CHAIN_ADDRESSES.NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS
  if (chainId === bsc.id) return PUBLIC_CHAIN_ADDRESSES.NEXT_PUBLIC_MEMBERSHIP_PASS_ADDRESS
  return undefined
}

export function getPublicMockUsdtAddress(chainId?: number): Address | undefined {
  if (chainId === bscTestnet.id) return PUBLIC_CHAIN_ADDRESSES.BSC_TESTNET_MOCK_USDT_ADDRESS
  if (chainId === bsc.id) return PUBLIC_CHAIN_ADDRESSES.MOCK_USDT_ADDRESS
  return undefined
}
