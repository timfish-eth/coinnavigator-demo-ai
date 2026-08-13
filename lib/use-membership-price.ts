"use client"

import { useAuth } from "@/components/auth/auth-context"
import { erc20Abi } from "@/lib/contracts/erc20-abi"
import { membershipPassAbi } from "@/lib/contracts/membership-pass-abi"
import { RESEARCH_PASS, formatPassPrice } from "@/lib/simulation"
import { useMemo } from "react"
import { formatUnits, type Address } from "viem"
import { useReadContract } from "wagmi"

export function useMembershipPriceLabel() {
  const { membershipContractAddress, isSupportedChain } = useAuth()
  const contractReady = Boolean(membershipContractAddress && isSupportedChain)

  const { data: paymentToken } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "paymentToken",
    query: { enabled: contractReady },
  })
  const { data: monthlyPrice } = useReadContract({
    address: membershipContractAddress,
    abi: membershipPassAbi,
    functionName: "monthlyPrice",
    query: { enabled: contractReady },
  })
  const { data: tokenSymbol } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(paymentToken) },
  })
  const { data: tokenDecimals } = useReadContract({
    address: paymentToken as Address | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(paymentToken) },
  })

  return useMemo(() => {
    if (!monthlyPrice || tokenDecimals === undefined) return formatPassPrice()
    return `${formatUnits(monthlyPrice, tokenDecimals)} ${tokenSymbol ?? "USDT"} / ${RESEARCH_PASS.period}`
  }, [monthlyPrice, tokenDecimals, tokenSymbol])
}
