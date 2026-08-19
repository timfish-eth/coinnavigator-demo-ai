import { mkdir, readFile, readdir, rename, writeFile } from "fs/promises"
import path from "path"

import { normalizeReportChainId } from "@/lib/report-network"
import type { TokenReport } from "@/lib/research-cache"

type StoredTokenReport = Omit<TokenReport, "cacheStatus">

export type StoredReportSummary = {
  id: string
  asset: StoredTokenReport["asset"]
  chainId: number
  reportType: StoredTokenReport["reportType"]
  generatedAt: string
  expiresAt: string
  summary: string
  source: "stored"
}

const REPORT_STORAGE_ROOT = path.join(process.cwd(), "storage", "reports")

type ReportStorageState = {
  locks: Map<string, Promise<unknown>>
}

const state = globalThis as typeof globalThis & {
  __coinnavigatorReportStorage?: ReportStorageState
}

function reportStorageState(): ReportStorageState {
  state.__coinnavigatorReportStorage ??= {
    locks: new Map(),
  }
  return state.__coinnavigatorReportStorage
}

function safeFileKey(reportKey: string): string {
  return reportKey.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function reportPath(reportKey: string, extension: "json" | "pdf"): string {
  return path.join(REPORT_STORAGE_ROOT, `${safeFileKey(reportKey)}.${extension}`)
}

async function writeFileAtomic(filePath: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(filePath)
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(/* turbopackIgnore: true */ tempPath, data)
  await rename(/* turbopackIgnore: true */ tempPath, /* turbopackIgnore: true */ filePath)
}

export async function withReportLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const storage = reportStorageState()
  const existing = storage.locks.get(key) as Promise<T> | undefined
  if (existing) return existing

  const pending = task().finally(() => {
    storage.locks.delete(key)
  })
  storage.locks.set(key, pending)
  return pending
}

export async function readStoredTokenReport(reportKey: string): Promise<StoredTokenReport | null> {
  try {
    const filePath = reportPath(reportKey, "json")
    const raw = await readFile(/* turbopackIgnore: true */ filePath, "utf8")
    const parsed = JSON.parse(raw) as Partial<StoredTokenReport>
    if (!parsed.id || !parsed.asset || !parsed.report || !parsed.generatedAt || !parsed.expiresAt || !parsed.reportType) {
      return null
    }
    return {
      ...parsed,
      chainId: normalizeReportChainId(parsed.chainId),
    } as StoredTokenReport
  } catch {
    return null
  }
}

export async function writeStoredTokenReport(reportKey: string, report: StoredTokenReport): Promise<void> {
  await writeFileAtomic(reportPath(reportKey, "json"), JSON.stringify(report, null, 2))
}

export async function listStoredTokenReports(): Promise<StoredReportSummary[]> {
  try {
    const files = await readdir(/* turbopackIgnore: true */ REPORT_STORAGE_ROOT)
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          try {
            const raw = await readFile(/* turbopackIgnore: true */ path.join(REPORT_STORAGE_ROOT, file), "utf8")
            const parsed = JSON.parse(raw) as Partial<StoredTokenReport>
            if (!parsed.id || !parsed.asset || !parsed.report || !parsed.generatedAt || !parsed.expiresAt || !parsed.reportType) {
              return null
            }
            return {
              id: parsed.id,
              asset: parsed.asset,
              chainId: normalizeReportChainId(parsed.chainId),
              reportType: parsed.reportType,
              generatedAt: parsed.generatedAt,
              expiresAt: parsed.expiresAt,
              summary: parsed.report.summary,
              source: "stored" as const,
            }
          } catch {
            return null
          }
        }),
    )

    return reports
      .filter((report): report is StoredReportSummary => Boolean(report))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
  } catch {
    return []
  }
}

export async function readStoredReportPdf(reportKey: string): Promise<Buffer | null> {
  try {
    const filePath = reportPath(reportKey, "pdf")
    return await readFile(/* turbopackIgnore: true */ filePath)
  } catch {
    return null
  }
}

export async function writeStoredReportPdf(reportKey: string, pdf: Buffer): Promise<void> {
  await writeFileAtomic(reportPath(reportKey, "pdf"), pdf)
}
