import { getMarketAnalysis, type MarketAnalysis } from "@/lib/ai-analysis"
import { getResearch, type Asset, type Research } from "@/lib/data"
import { generateResearchWithLlm } from "@/lib/llm"
import { getMarketAsset, searchMarketAssets } from "@/lib/market-data"
import { readStoredTokenReport, withReportLock, writeStoredTokenReport } from "@/lib/report-storage"
import { getDailyTokenNews } from "@/lib/token-news"

const DAY_MS = 24 * 60 * 60 * 1000
const REPORT_TTL_DAYS = 7
const REPORT_TTL_MS = REPORT_TTL_DAYS * DAY_MS
const TOKEN_REPORT_TEMPLATE_VERSION = "v2"

export type TokenProfile = {
  asset: Asset
  createdAt: string
}

export type TokenReport = {
  id: string
  asset: Asset
  report: Research
  reportType: "quick" | "deep"
  generatedAt: string
  expiresAt: string
  cacheStatus: "hit" | "generated"
  inputs: {
    marketDataDate: string
    newsWindow: "24h"
  }
}

type StoredTokenReport = Omit<TokenReport, "cacheStatus">

type ResearchStore = {
  dailyMarketAnalysis: Map<string, MarketAnalysis>
  tokenProfiles: Map<string, TokenProfile>
  tokenReports: Map<string, StoredTokenReport>
}

const store = globalThis as typeof globalThis & {
  __coinnavigatorResearchStore?: ResearchStore
}

function researchStore(): ResearchStore {
  store.__coinnavigatorResearchStore ??= {
    dailyMarketAnalysis: new Map(),
    tokenProfiles: new Map(),
    tokenReports: new Map(),
  }
  return store.__coinnavigatorResearchStore
}

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function reportKey(assetId: string, reportType: TokenReport["reportType"], day = dateKey()): string {
  return `${assetId}:${reportType}:${day}:${TOKEN_REPORT_TEMPLATE_VERSION}`
}

function isExpired(report: StoredTokenReport, now = Date.now()): boolean {
  return new Date(report.expiresAt).getTime() <= now
}

export function pruneExpiredTokenReports(now = Date.now()) {
  const db = researchStore()
  for (const [key, report] of db.tokenReports) {
    if (new Date(report.expiresAt).getTime() <= now) {
      db.tokenReports.delete(key)
    }
  }
}

export async function getDailyMarketAnalysis(): Promise<MarketAnalysis> {
  const db = researchStore()
  const key = dateKey()
  const cached = db.dailyMarketAnalysis.get(key)
  if (cached) return cached

  const analysis = await getMarketAnalysis()
  db.dailyMarketAnalysis.set(key, analysis)
  return analysis
}

export async function getOrCreateTokenProfile(assetId: string): Promise<TokenProfile> {
  const db = researchStore()
  const cached = db.tokenProfiles.get(assetId)
  if (cached) return cached

  const profile = {
    asset: await getMarketAsset(assetId),
    createdAt: new Date().toISOString(),
  }
  db.tokenProfiles.set(profile.asset.id, profile)
  return profile
}

export async function resolveTokenForReport(input: { assetId?: string; query?: string }): Promise<Asset> {
  if (input.assetId) return (await getOrCreateTokenProfile(input.assetId)).asset

  const query = input.query?.trim()
  if (!query) return (await getOrCreateTokenProfile("bitcoin")).asset

  const results = await searchMarketAssets(query)
  const normalized = query.toLowerCase()
  const exact =
    results.assets.find((asset) => asset.symbol.toLowerCase() === normalized || asset.name.toLowerCase() === normalized) ??
    results.assets[0]

  if (!exact) return (await getOrCreateTokenProfile("bitcoin")).asset
  const db = researchStore()
  db.tokenProfiles.set(exact.id, {
    asset: exact,
    createdAt: new Date().toISOString(),
  })
  return exact
}

export async function getOrCreateTokenReport(input: {
  assetId?: string
  query?: string
  reportType?: TokenReport["reportType"]
}): Promise<TokenReport> {
  pruneExpiredTokenReports()

  const reportType = input.reportType ?? "quick"
  const asset = await resolveTokenForReport(input)
  const key = reportKey(asset.id, reportType)
  const db = researchStore()
  const cached = db.tokenReports.get(key)
  if (cached && !isExpired(cached)) return { ...cached, cacheStatus: "hit" }

  const storedOnDisk = await readStoredTokenReport(key)
  if (storedOnDisk && !isExpired(storedOnDisk)) {
    db.tokenReports.set(key, storedOnDisk)
    return { ...storedOnDisk, cacheStatus: "hit" }
  }

  return withReportLock(`token-report:${key}`, async () => {
    const cachedAfterWait = db.tokenReports.get(key)
    if (cachedAfterWait && !isExpired(cachedAfterWait)) return { ...cachedAfterWait, cacheStatus: "hit" }

    const diskAfterWait = await readStoredTokenReport(key)
    if (diskAfterWait && !isExpired(diskAfterWait)) {
      db.tokenReports.set(key, diskAfterWait)
      return { ...diskAfterWait, cacheStatus: "hit" }
    }

    const generatedAt = new Date()
    const baseResearch = getResearch(asset)
    const dailyAnalysis = await getDailyMarketAnalysis()
    const tokenNews = await getDailyTokenNews(asset)
    const reportNews = tokenNews.length ? tokenNews : dailyAnalysis.report.news
    let report = baseResearch
    try {
      const aiResearch = await generateResearchWithLlm({
        asset,
        baseResearch,
        news: reportNews,
      })
      report = {
        ...baseResearch,
        ...aiResearch,
        growthDrivers: aiResearch.growthDrivers?.length ? aiResearch.growthDrivers : baseResearch.growthDrivers,
        risks: aiResearch.risks?.length ? aiResearch.risks : baseResearch.risks,
      }
    } catch {
      report = baseResearch
    }

    const stored: StoredTokenReport = {
      id: key,
      asset,
      report,
      reportType,
      generatedAt: generatedAt.toISOString(),
      expiresAt: new Date(generatedAt.getTime() + REPORT_TTL_MS).toISOString(),
      inputs: {
        marketDataDate: dateKey(generatedAt),
        newsWindow: "24h",
      },
    }
    db.tokenReports.set(key, stored)
    await writeStoredTokenReport(key, stored)
    return { ...stored, cacheStatus: "generated" }
  })
}
