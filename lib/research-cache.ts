import { getMarketAnalysis, type MarketAnalysis } from "@/lib/ai-analysis"
import { getResearch, type Asset, type Impact, type Research, type RiskLevel } from "@/lib/data"
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

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "Low"
  if (score >= 55) return "Medium"
  return "High"
}

function impactFor(asset: Asset, newsIndex: number): Impact {
  if (newsIndex === 0 || asset.activity >= 80 || Math.abs(asset.change24h) >= 5) return "High"
  if (asset.activity >= 60 || Math.abs(asset.change24h) >= 2) return "Medium"
  return "Low"
}

function sourceLabel(item: { source?: string; url?: string }, fallback: string): string {
  if (item.source) return item.source
  if (!item.url) return fallback
  try {
    return new URL(item.url).hostname.replace(/^www\./, "") || fallback
  } catch {
    return fallback
  }
}

function newsIntel(asset: Asset, news: { title: string; source: string; url?: string; publishedAt?: string }[]): Research["latestIntel"] {
  if (news.length) {
    return news.slice(0, 4).map((item, index) => ({
      time: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Today",
      source: sourceLabel(item, "News"),
      headline: item.title,
      impact: impactFor(asset, index),
    }))
  }

  return [
    {
      time: "Today",
      source: asset.source ?? "Market data",
      headline: asset.event,
      impact: impactFor(asset, 0),
    },
  ]
}

function buildDataDrivenResearch(asset: Asset, marketAnalysis: MarketAnalysis, news: MarketAnalysis["report"]["news"]): Research {
  const base = getResearch(asset)
  const narrative = marketAnalysis.narratives.find((item) => item.name === asset.category)
  const featured = marketAnalysis.featuredAssets.find((item) => item.id === asset.id)
  const volumeScore = clamp(asset.activity)
  const rankScore = clamp(100 - asset.rank * 0.7)
  const momentumScore = clamp(50 + asset.change24h * 5)
  const riskScore = asset.risk === "Low" ? 82 : asset.risk === "Medium" ? 66 : 48
  const overall = featured?.score ?? Math.round(rankScore * 0.35 + volumeScore * 0.3 + momentumScore * 0.2 + riskScore * 0.15)
  const compositeScore = (overall / 10).toFixed(1)
  const sectorChange = narrative?.change ?? asset.change24h
  const sectorScore = narrative?.activity ?? asset.activity
  const newsCount = news.length

  return {
    ...base,
    overview: `${asset.name} is a ${asset.category} asset currently ranked #${asset.rank} by market capitalization. The profile is generated from live market data, category momentum and the latest daily news available to the app.`,
    marketPosition: `${asset.name} trades with ${asset.volume} in 24h volume and ${asset.marketCap} market capitalization. Its ${asset.category} narrative score is ${sectorScore}, with average category movement of ${sectorChange >= 0 ? "+" : ""}${sectorChange.toFixed(2)}% over 24h.`,
    growthDrivers: featured?.strengths.length
      ? featured.strengths
      : [
          `Rank #${asset.rank} market position`,
          `${asset.volume} 24h trading volume`,
          `${asset.category} narrative score ${sectorScore}`,
          `${newsCount} relevant daily news item${newsCount === 1 ? "" : "s"} tracked`,
        ],
    risks: featured?.risks.length
      ? featured.risks
      : [
          `${asset.risk} composite market risk`,
          asset.change24h < 0 ? "Negative 24h price momentum" : "Positive momentum can reverse quickly",
          "Research quality depends on available market and news coverage",
        ],
    summary: `${asset.name} shows a ${asset.signal.toLowerCase()} near-term market signal, ${asset.risk.toLowerCase()} risk and an AI research score of ${overall}. The current read is driven by rank, 24h movement, volume/activity, sector narrative strength and daily news coverage. This is research information, not financial advice.`,
    compositeScore,
    website: `www.coingecko.com/en/coins/${asset.id}`,
    fundamentals: [
      {
        title: "Market Snapshot",
        description: `${asset.name} is ranked #${asset.rank} with ${asset.marketCap} market capitalization and ${asset.volume} 24h volume.`,
        details: [
          { label: "Source", value: asset.source ?? "Market data" },
          { label: "24h Change", value: `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%` },
        ],
      },
      {
        title: "Narrative Position",
        description: `${asset.category} has a current narrative score of ${sectorScore}.`,
        details: [
          { label: "Sector", value: asset.category },
          { label: "Sector 24h", value: `${sectorChange >= 0 ? "+" : ""}${sectorChange.toFixed(2)}%` },
        ],
      },
      {
        title: "Liquidity & Attention",
        description: `The app estimates attention from rank, volume-to-market-cap context and recent market activity.`,
        details: [
          { label: "Activity Score", value: String(asset.activity) },
          { label: "Signal", value: asset.signal },
        ],
      },
    ],
    ecosystem: {
      ...base.ecosystem,
      devActivity: asset.activity >= 80 ? "High" : asset.activity >= 60 ? "Elevated" : "Moderate",
      growth: sectorChange >= 1 ? "Expanding" : sectorChange <= -1 ? "Contracting" : "Stable",
    },
    performance: [
      { label: "24H", value: Number(asset.change24h.toFixed(2)) },
      { label: "Narrative", value: Number(sectorChange.toFixed(2)) },
      { label: "AI Score", value: overall },
    ],
    marketInterest: [
      { label: "24h Volume", value: asset.volume, change: asset.change24h },
      { label: "Market Signal", value: asset.signal, change: momentumScore - 50 },
      { label: "News Coverage", value: `${newsCount} item${newsCount === 1 ? "" : "s"}`, change: newsCount * 2 },
    ],
    riskScores: [
      { label: "Market Risk", level: asset.risk, note: "Derived from rank and 24h volatility" },
      { label: "Liquidity Risk", level: riskLevel(rankScore), note: "Estimated from market-cap rank and accessibility" },
      { label: "Momentum Risk", level: riskLevel(100 - Math.abs(asset.change24h) * 6), note: "Higher short-term movement increases reversal risk" },
      { label: "Coverage Risk", level: newsCount ? "Medium" : "High", note: "Depends on available daily news coverage" },
    ],
    onchain: [
      { label: "Market Activity", value: `${asset.activity}/100`, change: asset.change24h, hint: "Proxy from rank, volume and liquidity" },
      { label: "Narrative Strength", value: `${sectorScore}/100`, change: sectorChange, hint: "Category momentum and news/event mentions" },
      { label: "Liquidity Rank", value: `#${asset.rank}`, change: rankScore - 50, hint: "Market-cap rank proxy" },
      { label: "Exchange Flow Proxy", value: asset.change24h >= 0 ? "Demand improving" : "Supply pressure", change: asset.change24h, hint: "Direction inferred from 24h market move" },
    ],
    social: [
      { label: "News Coverage", value: `${newsCount} daily item${newsCount === 1 ? "" : "s"}`, change: newsCount * 2 },
      { label: "Attention Score", value: `${asset.activity}/100`, change: asset.activity - 50 },
      { label: "Narrative Score", value: `${sectorScore}/100`, change: sectorChange },
    ],
    aiRating: {
      overall,
      breakdown: [
        { label: "Market Position", score: Math.round(rankScore) },
        { label: "Liquidity/Attention", score: Math.round(volumeScore) },
        { label: "Momentum", score: Math.round(momentumScore) },
        { label: "Risk", score: riskScore },
      ],
    },
    narratives: narrative ? [narrative.name, ...narrative.assets.filter((symbol) => symbol !== asset.symbol).slice(0, 3)] : base.narratives,
    latestIntel: newsIntel(asset, news),
  }
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

export async function getTokenResearchSnapshot(asset: Asset): Promise<Research> {
  const [dailyAnalysis, tokenNews] = await Promise.all([
    getDailyMarketAnalysis(),
    getDailyTokenNews(asset),
  ])
  const reportNews = tokenNews.length ? tokenNews : dailyAnalysis.report.news
  return buildDataDrivenResearch(asset, dailyAnalysis, reportNews)
}

export async function getStoredTokenReport(input: {
  assetId: string
  reportType: TokenReport["reportType"]
  generatedAt?: string
}): Promise<TokenReport | null> {
  const key = reportKey(input.assetId, input.reportType, input.generatedAt?.slice(0, 10) ?? dateKey())
  const db = researchStore()
  const cached = db.tokenReports.get(key)
  if (cached && !isExpired(cached)) return { ...cached, cacheStatus: "hit" }

  const storedOnDisk = await readStoredTokenReport(key)
  if (!storedOnDisk || isExpired(storedOnDisk)) return null

  db.tokenReports.set(key, storedOnDisk)
  return { ...storedOnDisk, cacheStatus: "hit" }
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
    const dailyAnalysis = await getDailyMarketAnalysis()
    const tokenNews = await getDailyTokenNews(asset)
    const reportNews = tokenNews.length ? tokenNews : dailyAnalysis.report.news
    const baseResearch = buildDataDrivenResearch(asset, dailyAnalysis, reportNews)
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
