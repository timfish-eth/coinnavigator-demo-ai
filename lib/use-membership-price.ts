"use client"

import { useAuth } from "@/components/auth/auth-context"
import { erc20Abi } from "@/lib/contracts/erc20-abi"
import { getMembershipPassAddress } from "@/lib/contracts/membership"
import { membershipPassAbi } from "@/lib/contracts/membership-pass-abi"
import { RESEARCH_PASS } from "@/lib/simulation"
import { useMemo } from "react"
import { formatUnits, type Address } from "viem"
import { useReadContract } from "wagmi"
import { bsc } from "wagmi/chains"

export function displayPaymentTokenSymbol(symbol?: string): string {
  if (!symbol) return "USDT"
  return symbol.toUpperCase().includes("USDT") ? "USDT" : symbol
}

export function useMembershipPriceLabel() {
  const { membershipContractAddress, isSupportedChain, currentChainId } = useAuth()
  const priceChainId = currentChainId ?? bsc.id
  const priceContractAddress = membershipContractAddress ?? getMembershipPassAddress(priceChainId)
  const contractReady = Boolean(priceContractAddress && isSupportedChain)

  const { data: paymentToken } = useReadContract({
    address: priceContractAddress,
    abi: membershipPassAbi,
    functionName: "paymentToken",
    chainId: priceChainId,
    query: { enabled: contractReady },
  })
  const { data: monthlyPrice } = useReadContract({
    address: priceContractAddress,
    abi: membershipPassAbi,
    functionName: "monthlyPrice",
    chainId: priceChainId,
    query: { enabled: contractReady },
  })
  const { data: tokenSymbol } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: priceChainId,
    query: { enabled: Boolean(paymentToken) },
  })
  const { data: tokenDecimals } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: priceChainId,
    query: { enabled: Boolean(paymentToken) },
  })

  return useMemo(() => {
    if (!isSupportedChain) return "Unsupported network"
    if (!priceContractAddress) return "Contract not configured"
    if (!monthlyPrice || tokenDecimals === undefined) return "Loading contract price..."
    return `${formatUnits(monthlyPrice, tokenDecimals)} ${displayPaymentTokenSymbol(tokenSymbol)} / ${RESEARCH_PASS.period}`
  }, [isSupportedChain, priceContractAddress, monthlyPrice, tokenDecimals, tokenSymbol])
}
