import { getPublicMockUsdtAddress } from "@/config/public-chain-addresses"

export function getMockUsdtAddress(chainId?: number) {
  return getPublicMockUsdtAddress(chainId)
}
