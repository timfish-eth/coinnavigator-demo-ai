"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import type { Asset } from "@/lib/data"
import { beijingDateKey } from "@/lib/beijing-day"
import { DEFAULT_REPORT_CHAIN_ID, normalizeReportChainId } from "@/lib/report-network"

const STORAGE_KEY = "coinnavigator.research.history"
const UPDATED_EVENT = "coinnavigator:report-history-updated"
const EMPTY_SNAPSHOT = "[]"
const REPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type StoredReportType = "quick" | "deep"

export type StoredReportRecord = {
  id: string
  assetId: string
  assetName: string
  chainId: number
  symbol: string
  color: string
  imageUrl?: string
  reportType: StoredReportType
  reportDay?: string
  generatedAt: string
  expiresAt: string
}

function isRecord(value: unknown): value is StoredReportRecord {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<StoredReportRecord>
  return Boolean(
    record.id &&
      record.assetId &&
      record.assetName &&
      record.symbol &&
      (record.chainId === undefined || typeof record.chainId === "number") &&
      record.color &&
      record.reportType &&
      record.generatedAt &&
      record.expiresAt,
  )
}

function parseRecords(raw: string): StoredReportRecord[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    const seen = new Set<string>()
    return parsed
      .filter(isRecord)
      .map((record) => ({ ...record, chainId: normalizeReportChainId(record.chainId ?? DEFAULT_REPORT_CHAIN_ID) }))
      .filter((record) => new Date(record.expiresAt).getTime() > now)
      .filter((record) => {
        if (seen.has(record.id)) return false
        seen.add(record.id)
        return true
      })
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
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
  window.addEventListener(UPDATED_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(UPDATED_EVENT, callback)
  }
}

function writeRecords(records: StoredReportRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT))
}

function pruneExpiredRecords() {
  const raw = getSnapshot()
  const current = parseRecords(raw)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length !== current.length) writeRecords(current)
  } catch {
    writeRecords(current)
  }
}

export function useReportHistory() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT)
  const records = useMemo(() => parseRecords(snapshot), [snapshot])

  useEffect(() => {
    pruneExpiredRecords()
  }, [])

  const upsertReport = useCallback((input: { asset: Asset; chainId: number; reportType: StoredReportType; generatedAt: string; expiresAt: string; reportDay?: string }) => {
    const current = parseRecords(getSnapshot())
    const chainId = normalizeReportChainId(input.chainId)
    const reportDay = input.reportDay ?? beijingDateKey(new Date(input.generatedAt))
    const id = `chain-${chainId}:${input.asset.id}:${input.reportType}:${reportDay}`
    const nextRecord: StoredReportRecord = {
      id,
      assetId: input.asset.id,
      assetName: input.asset.name,
      chainId,
      symbol: input.asset.symbol,
      color: input.asset.color,
      imageUrl: input.asset.imageUrl,
      reportType: input.reportType,
      reportDay,
      generatedAt: input.generatedAt,
      expiresAt: input.expiresAt,
    }
    writeRecords([nextRecord, ...current.filter((record) => record.id !== id)])
  }, [])

  const removeReport = useCallback((id: string) => {
    writeRecords(parseRecords(getSnapshot()).filter((record) => record.id !== id))
  }, [])

  const clearExpired = useCallback(() => {
    pruneExpiredRecords()
  }, [])

  return {
    records,
    upsertReport,
    removeReport,
    clearExpired,
    ttlMs: REPORT_TTL_MS,
  }
}
