import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { PUBLIC_CHAIN_RPC_URLS, isBscTestnetEnabled } from "@/config/public-chain-addresses"
import { fallback, http } from "wagmi"
import { bsc, bscTestnet } from "wagmi/chains"

function rpcFallback(urls: readonly string[]) {
  return fallback(urls.map((url) => http(url)))
}

const bscMainnet = {
  ...bsc,
  rpcUrls: {
    ...bsc.rpcUrls,
    default: { http: PUBLIC_CHAIN_RPC_URLS.BSC },
    public: { http: PUBLIC_CHAIN_RPC_URLS.BSC },
  },
} as const

const bscTestnetChain = {
  ...bscTestnet,
  rpcUrls: {
    ...bscTestnet.rpcUrls,
    default: { http: PUBLIC_CHAIN_RPC_URLS.BSC_TESTNET },
    public: { http: PUBLIC_CHAIN_RPC_URLS.BSC_TESTNET },
  },
} as const

export const config = isBscTestnetEnabled()
  ? getDefaultConfig({
      appName: "CoinNavigator",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "coinnavigator-demo",
      chains: [bscMainnet, bscTestnetChain],
      transports: {
        [bsc.id]: rpcFallback(PUBLIC_CHAIN_RPC_URLS.BSC),
        [bscTestnet.id]: rpcFallback(PUBLIC_CHAIN_RPC_URLS.BSC_TESTNET),
      },
      ssr: true,
    })
  : getDefaultConfig({
      appName: "CoinNavigator",
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "coinnavigator-demo",
      chains: [bscMainnet],
      transports: {
        [bsc.id]: rpcFallback(PUBLIC_CHAIN_RPC_URLS.BSC),
      },
      ssr: true,
    })
