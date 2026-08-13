import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { bsc, bscTestnet } from "wagmi/chains"

export const config = getDefaultConfig({
  appName: "CoinNavigator",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "coinnavigator-demo",
  chains: [bsc, bscTestnet],
  ssr: true,
})
