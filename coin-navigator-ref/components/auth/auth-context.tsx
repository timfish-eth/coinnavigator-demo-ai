"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type WalletId = "metamask" | "okx" | "bitget"
export type Membership = "Free" | "Pro"

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

export const RESEARCH_PASS = {
  name: "Research Pass",
  price: "9.9 USDT",
  period: "30 Days",
  network: "BSC",
} as const

const FREE_REPORT_LIMIT = 3

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

const HEX = "0123456789abcdef"
function randomAddress() {
  let out = "0x"
  for (let i = 0; i < 40; i++) out += HEX[Math.floor(Math.random() * 16)]
  return out
}

type AuthContextValue = {
  wallet: Wallet | null
  isConnected: boolean
  isPro: boolean
  membership: Membership
  // connect modal
  connectOpen: boolean
  intent: AuthIntent
  intentCopy: (i: AuthIntent) => { title: string; subtitle: string }
  openConnect: (intent?: AuthIntent) => void
  closeConnect: () => void
  connect: (walletId: WalletId) => void
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
  // free tier report usage
  freeReportLimit: number
  reportsRemaining: number
  consumeReport: () => void
  // welcome
  showWelcome: boolean
  dismissWelcome: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [intent, setIntent] = useState<AuthIntent>("generic")
  const [showWelcome, setShowWelcome] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [reportsRemaining, setReportsRemaining] = useState(FREE_REPORT_LIMIT)

  const openConnect = useCallback((i: AuthIntent = "generic") => {
    setIntent(i)
    setConnectOpen(true)
  }, [])

  const closeConnect = useCallback(() => {
    setConnectOpen(false)
    setPendingAction(null)
  }, [])

  const connect = useCallback(
    (walletId: WalletId) => {
      const next: Wallet = {
        address: randomAddress(),
        walletId,
        network: "BSC",
        membership: "Free",
      }
      setWallet(next)
      setConnectOpen(false)
      setShowWelcome(true)
      if (pendingAction) {
        const fn = pendingAction
        setPendingAction(null)
        setTimeout(fn, 50)
      }
    },
    [pendingAction],
  )

  const disconnect = useCallback(() => {
    setWallet(null)
    setShowWelcome(false)
    setReportsRemaining(FREE_REPORT_LIMIT)
  }, [])

  const requireWallet = useCallback(
    (action: () => void, i: AuthIntent = "generic") => {
      if (wallet) {
        action()
        return
      }
      setPendingAction(() => action)
      setIntent(i)
      setConnectOpen(true)
    },
    [wallet],
  )

  const openUpgrade = useCallback(() => setUpgradeOpen(true), [])
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), [])
  const openPayment = useCallback(() => {
    setUpgradeOpen(false)
    setPaymentOpen(true)
  }, [])
  const closePayment = useCallback(() => setPaymentOpen(false), [])

  const activatePro = useCallback(() => {
    setWallet((w) => (w ? { ...w, membership: "Pro" } : w))
  }, [])

  const consumeReport = useCallback(() => {
    setReportsRemaining((n) => Math.max(0, n - 1))
  }, [])

  const isPro = wallet?.membership === "Pro"

  const value = useMemo<AuthContextValue>(
    () => ({
      wallet,
      isConnected: !!wallet,
      isPro,
      membership: wallet?.membership ?? "Free",
      connectOpen,
      intent,
      intentCopy: (i: AuthIntent) => intentCopy[i],
      openConnect,
      closeConnect,
      connect,
      disconnect,
      requireWallet,
      upgradeOpen,
      openUpgrade,
      closeUpgrade,
      paymentOpen,
      openPayment,
      closePayment,
      activatePro,
      freeReportLimit: FREE_REPORT_LIMIT,
      reportsRemaining,
      consumeReport,
      showWelcome,
      dismissWelcome: () => setShowWelcome(false),
    }),
    [
      wallet,
      isPro,
      connectOpen,
      intent,
      openConnect,
      closeConnect,
      connect,
      disconnect,
      requireWallet,
      upgradeOpen,
      openUpgrade,
      closeUpgrade,
      paymentOpen,
      openPayment,
      closePayment,
      activatePro,
      reportsRemaining,
      consumeReport,
      showWelcome,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
