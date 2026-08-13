"use client"

import { walletMeta, type WalletId } from "@/components/auth/auth-context"
import Image from "next/image"

export function WalletGlyph({ id, size = 36 }: { id: WalletId; size?: number }) {
  const meta = walletMeta[id]
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white"
      style={{
        width: size,
        height: size,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <Image
        src={meta.logo || "/placeholder.svg"}
        alt={`${meta.name} logo`}
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        className="object-contain"
        unoptimized
      />
    </span>
  )
}
