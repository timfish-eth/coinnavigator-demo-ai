export const DEFAULT_REPORT_CHAIN_ID = 56
export const BSC_TESTNET_REPORT_CHAIN_ID = 97

export function normalizeReportChainId(value?: string | number | null): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return parsed === BSC_TESTNET_REPORT_CHAIN_ID ? BSC_TESTNET_REPORT_CHAIN_ID : DEFAULT_REPORT_CHAIN_ID
}

export function reportNetworkLabel(chainId?: string | number | null): string {
  return normalizeReportChainId(chainId) === BSC_TESTNET_REPORT_CHAIN_ID ? "BSC Testnet" : "BSC Mainnet"
}
