"use client"

import { useConnectModal } from "@rainbow-me/rainbowkit"
import {
  FREE_REPORT_LIMIT,
  RESEARCH_PASS,
  type Membership,
} from "@/lib/simulation"
import { membershipPassAbi } from "@/lib/contracts/membership-pass-abi"
import { formatMembershipExpiry, getMembershipPassAddress } from "@/lib/contracts/membership"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { useAccount, useAccountEffect, useDisconnect, useReadContract, useSwitchChain } from "wagmi"
import { bsc, bscTestnet } from "wagmi/chains"
import type { Address } from "viem"

export type WalletId = "metamask" | "okx" | "bitget"
export type { Membership }
export { FREE_REPORT_LIMIT, RESEARCH_PASS }

export type Wallet = {
  address: string
  walletId: WalletId
  network: string
  membership: Membership
}

export const walletMeta: Record<WalletId, { name: string; short: string; accent: string; logo: string }> = {
  metamask: { name: "MetaMask", short: "MM", accent: "#F6851B", logo: "/wallets/metamask.svg" },
  okx: { name: "OKX Wallet", short: "OKX", accent: "#111111", logo: "/wallets/okx.svg" },
  bitget: { name: "Bitget Wallet", short: "BG", accent: "#00F0FF", logo: "/wallets/bitget.svg" },
}

const connectorIdToWalletId: Record<string, WalletId> = {
  metaMask: "metamask",
  okx: "okx",
  bitget: "bitget",
}

const emptyAddress = "0x0000000000000000000000000000000000000000" as Address

export type AuthIntent = "watchlist" | "report" | "export" | "generic"

const intentCopy: Record<AuthIntent, { title: string; subtitle: string }> = {
  watchlist: {
    title: "Connect wallet to track research",
    subtitle: "Connect a wallet to save assets and follow your research.",
  },
  report: {
    title: "Connect wallet to generate reports",
    subtitle: "Connect a wallet to run AI-powered research on any asset.",
  },
  export: {
    title: "Connect wallet to export research",
    subtitle: "Connect a wallet to save and export analyst-grade reports.",
  },
  generic: {
    title: "Connect your wallet",
    subtitle: "Choose a wallet to enter the research terminal.",
  },
}

export function truncateAddress(addr: string) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

type AuthContextValue = {
  wallet: Wallet | null
  isConnected: boolean
  isPro: boolean
  membership: Membership
  // connect
  intent: AuthIntent
  intentCopy: (i: AuthIntent) => { title: string; subtitle: string }
  openConnect: (intent?: AuthIntent) => void
  disconnect: () => void
  requireWallet: (action: () => void, intent?: AuthIntent) => void
  // upgrade modal
  upgradeOpen: boolean
  openUpgrade: () => void
  closeUpgrade: () => void
  // payment modal
  paymentOpen: boolean
  openPayment: () => void
  closePayment: () => void
  activatePro: () => void
  refreshMembership: () => void
  membershipExpiry?: bigint
  membershipExpiryLabel: string
  membershipContractAddress?: `0x${string}`
  // free tier report usage
  freeReportLimit: number
  reportsRemaining: number
  consumeReport: () => void
  // welcome
  showWelcome: boolean
  dismissWelcome: () => void
  // chain
  currentChainId?: number
  isSupportedChain: boolean
  switchChain: (chainId: number) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const supportedChains = [bsc, bscTestnet]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const account = useAccount()
  const { disconnect: disconnectWagmi } = useDisconnect()
  const { switchChain: switchChainWagmi } = useSwitchChain()
  const { openConnectModal } = useConnectModal()

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [intent, setIntent] = useState<AuthIntent>("generic")
  const [showWelcome, setShowWelcome] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [reportsRemaining, setReportsRemaining] = useState(FREE_REPORT_LIMIT)
  const [membership, setMembership] = useState<Membership>("Free")
  const wasConnectedRef = useRef(false)

  const currentChainId = account.chainId
  const membershipContractAddress = getMembershipPassAddress(currentChainId)
  const isSupportedChain = account.isConnected
    ? supportedChains.some((c) => c.id === currentChainId)
    : true

  const accountAddress = (account.address ?? emptyAddress) as Address
  const membershipReadEnabled = Boolean(account.address && membershipContractAddress && isSupportedChain)
  const {
    data: onchainIsMember,
    refetch: refetchIsMember,
  } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "isMember",
    args: [accountAddress],
    query: {
      enabled: membershipReadEnabled,
    },
  })
  const {
    data: membershipExpiry,
    refetch: refetchMembershipExpiry,
  } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "getMembershipExpiry",
    args: [accountAddress],
    query: {
      enabled: membershipReadEnabled,
    },
  })

  const effectiveMembership: Membership = membershipContractAddress && membershipReadEnabled
    ? onchainIsMember === true
      ? "Pro"
      : "Free"
    : membership

  const wallet: Wallet | null = useMemo(() => {
    if (!account.isConnected || !account.address) return null
    const network = account.chain?.name ?? (currentChainId === bsc.id ? "BSC Mainnet" : currentChainId === bscTestnet.id ? "BSC Testnet" : "Unknown")
    const walletId = account.connector?.id ? (connectorIdToWalletId[account.connector.id] ?? "metamask") : "metamask"
    return {
      address: account.address,
      walletId,
      network,
      membership: effectiveMembership,
    }
  }, [account.isConnected, account.address, account.chain?.name, account.connector?.id, currentChainId, effectiveMembership])

  const isConnected = account.isConnected && !!wallet
  const isPro = effectiveMembership === "Pro"
  const membershipExpiryLabel = formatMembershipExpiry(membershipExpiry)

  // Open the RainbowKit connect modal. This is used by the explicit "Connect Wallet" CTA.
  const openConnect = useCallback(
    (i: AuthIntent = "generic") => {
      setIntent(i)
      openConnectModal?.()
    },
    [openConnectModal],
  )

  const disconnect = useCallback(() => {
    disconnectWagmi()
    setShowWelcome(false)
    setReportsRemaining(FREE_REPORT_LIMIT)
    setMembership("Free")
    wasConnectedRef.current = false
    pendingActionRef.current = null
  }, [disconnectWagmi])

  const requireWallet = useCallback(
    (action: () => void, i: AuthIntent = "generic") => {
      if (wallet) {
        action()
        return
      }
      pendingActionRef.current = action
      setIntent(i)
      openConnectModal?.()
    },
    [wallet, openConnectModal],
  )

  // Show welcome toast and run any pending action after the wallet connects.
  useAccountEffect({
    onConnect() {
      if (!wasConnectedRef.current) {
        setShowWelcome(true)
        wasConnectedRef.current = true
      }
      if (pendingActionRef.current) {
        const fn = pendingActionRef.current
        pendingActionRef.current = null
        setTimeout(fn, 50)
      }
    },
  })

  const openUpgrade = useCallback(() => setUpgradeOpen(true), [])
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), [])
  const openPayment = useCallback(() => {
    setUpgradeOpen(false)
    setPaymentOpen(true)
  }, [])
  const closePayment = useCallback(() => setPaymentOpen(false), [])

  const activatePro = useCallback(() => {
    setMembership("Pro")
  }, [])

  const refreshMembership = useCallback(() => {
    void refetchIsMember()
    void refetchMembershipExpiry()
  }, [refetchIsMember, refetchMembershipExpiry])

  const consumeReport = useCallback(() => {
    setReportsRemaining((n) => Math.max(0, n - 1))
  }, [])

  const switchChain = useCallback(
    (chainId: number) => {
      if (switchChainWagmi) {
        switchChainWagmi({ chainId })
      }
    },
    [switchChainWagmi],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      wallet,
      isConnected,
      isPro,
      membership: effectiveMembership,
      intent,
      intentCopy: (i: AuthIntent) => intentCopy[i],
      openConnect,
      disconnect,
      requireWallet,
      upgradeOpen,
      openUpgrade,
      closeUpgrade,
      paymentOpen,
      openPayment,
      closePayment,
      activatePro,
      refreshMembership,
      membershipExpiry,
      membershipExpiryLabel,
      membershipContractAddress,
      freeReportLimit: FREE_REPORT_LIMIT,
      reportsRemaining,
      consumeReport,
      showWelcome,
      dismissWelcome: () => setShowWelcome(false),
      currentChainId,
      isSupportedChain,
      switchChain,
    }),
    [
      wallet,
      isConnected,
      isPro,
      effectiveMembership,
      intent,
      openConnect,
      disconnect,
      requireWallet,
      upgradeOpen,
      openUpgrade,
      closeUpgrade,
      paymentOpen,
      openPayment,
      closePayment,
      activatePro,
      refreshMembership,
      membershipExpiry,
      membershipExpiryLabel,
      membershipContractAddress,
      reportsRemaining,
      consumeReport,
      showWelcome,
      currentChainId,
      isSupportedChain,
      switchChain,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
