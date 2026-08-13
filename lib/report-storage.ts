import { mkdir, readFile, rename, writeFile } from "fs/promises"
import path from "path"

import type { TokenReport } from "@/lib/research-cache"

type StoredTokenReport = Omit<TokenReport, "cacheStatus">

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
    return parsed as StoredTokenReport
  } catch {
    return null
  }
}

export async function writeStoredTokenReport(reportKey: string, report: StoredTokenReport): Promise<void> {
  await writeFileAtomic(reportPath(reportKey, "json"), JSON.stringify(report, null, 2))
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
