"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import type { Asset } from "@/lib/data"

const STORAGE_KEY = "coinnavigator.watchlist.assets"
const EMPTY_SNAPSHOT = "[]"

function isAsset(value: unknown): value is Asset {
  if (!value || typeof value !== "object") return false
  const asset = value as Partial<Asset>
  return Boolean(asset.id && asset.name && asset.symbol)
}

function parseAssets(raw: string): Asset[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    return parsed.filter(isAsset).filter((asset) => {
      if (seen.has(asset.id)) return false
      seen.add(asset.id)
      return true
    })
  } catch {
    return []
  }
}

function getSnapshot() {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT
  return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_SNAPSHOT
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("storage", callback)
  window.addEventListener("coinnavigator:watchlist-updated", callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("coinnavigator:watchlist-updated", callback)
  }
}

function writeStoredAssets(assets: Asset[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
  window.dispatchEvent(new CustomEvent("coinnavigator:watchlist-updated"))
}

export function useWatchlist() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT)
  const assets = useMemo(() => parseAssets(snapshot), [snapshot])

  const ids = useMemo(() => new Set(assets.map((asset) => asset.id)), [assets])

  const addAsset = useCallback((asset: Asset) => {
    const current = parseAssets(getSnapshot())
    if (current.some((item) => item.id === asset.id)) return
    writeStoredAssets([...current, asset])
  }, [])

  const removeAsset = useCallback((id: string) => {
    const current = parseAssets(getSnapshot())
    writeStoredAssets(current.filter((asset) => asset.id !== id))
  }, [])

  const toggleAsset = useCallback((asset: Asset) => {
    const current = parseAssets(getSnapshot())
    const exists = current.some((item) => item.id === asset.id)
    const next = exists ? current.filter((item) => item.id !== asset.id) : [...current, asset]
    writeStoredAssets(next)
  }, [])

  return {
    assets,
    ready: true,
    isSaved: useCallback((id: string) => ids.has(id), [ids]),
    addAsset,
    removeAsset,
    toggleAsset,
  }
}
