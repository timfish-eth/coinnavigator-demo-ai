import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { isBscTestnetEnabled } from "@/config/public-chain-addresses"
import { bsc, bscTestnet } from "wagmi/chains"

const chains = isBscTestnetEnabled() ? [bsc, bscTestnet] as const : [bsc] as const

export const config = getDefaultConfig({
  appName: "CoinNavigator",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "coinnavigator-demo",
  chains,
  ssr: true,
})
