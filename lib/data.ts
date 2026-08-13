export type Trend = number[]

export type AISignal = "Positive" | "Neutral" | "Watch"

export type Asset = {
  id: string
  name: string
  symbol: string
  category: string
  price: number
  change24h: number
  marketCap: string
  volume: string
  rank: number
  signal: "Bullish" | "Neutral" | "Bearish"
  risk: "Low" | "Medium" | "High"
  activity: number
  event: string
  trend: Trend
  color: string
  imageUrl?: string
  source?: "CoinMarketCap" | "CoinGecko" | "Demo"
}

export function aiSignal(a: Asset): AISignal {
  if (a.signal === "Bullish") return "Positive"
  if (a.signal === "Bearish") return "Watch"
  return "Neutral"
}

export function activityLabel(v: number): "High" | "Elevated" | "Moderate" | "Low" {
  if (v >= 80) return "High"
  if (v >= 60) return "Elevated"
  if (v >= 40) return "Moderate"
  return "Low"
}

export function researchScore(a: Asset): number {
  // Composite 0–10 research score derived from rank, activity and signal.
  const rankScore = a.rank <= 5 ? 3.4 : a.rank <= 15 ? 3 : a.rank <= 40 ? 2.4 : 1.8
  const activityScore = (a.activity / 100) * 3.5
  const signalScore = a.signal === "Bullish" ? 3 : a.signal === "Neutral" ? 2.3 : 1.6
  return Math.min(9.9, Number((rankScore + activityScore + signalScore).toFixed(1)))
}

export const globalMarket = {
  totalMarketCap: "$2.41T",
  totalMarketCapChange: 1.8,
  volume24h: "$96.4B",
  volume24hChange: -3.2,
  btcDominance: "54.2%",
  btcDominanceChange: 0.4,
  fearGreed: 72,
  fearGreedLabel: "Greed",
  fearGreedChange: 6,
  stablecoinSupply: "$160B",
  stablecoinSupplyChange: 0.9,
}

// Underlying chain for each asset (used by the market screener chain filter).
const chainMap: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
  render: "Ethereum",
  fetch: "Ethereum",
  ondo: "Ethereum",
  chainlink: "Ethereum",
  arbitrum: "Ethereum",
}

export function chainOf(a: Asset): string {
  return chainMap[a.id] ?? "Ethereum"
}

// AI Score (0–100): momentum-weighted signal blending activity and trend direction.
export function aiScore(a: Asset): number {
  const base = a.activity
  const signalAdj = a.signal === "Bullish" ? 8 : a.signal === "Bearish" ? -6 : 0
  const changeAdj = Math.round(a.change24h * 0.8)
  return Math.max(40, Math.min(99, base + signalAdj + changeAdj))
}

function makeTrend(seed: number, up: boolean): Trend {
  const pts: number[] = []
  let v = 50
  for (let i = 0; i < 24; i++) {
    const noise = Math.sin(seed + i * 0.7) * 8 + (Math.cos(seed * 2 + i) * 4)
    v += noise + (up ? 1.4 : -1.1)
    pts.push(Math.max(8, Math.min(96, v)))
  }
  return pts
}

export const assets: Asset[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    category: "Layer 1",
    price: 68420.32,
    change24h: 2.14,
    marketCap: "$1.35T",
    volume: "$38.2B",
    rank: 1,
    signal: "Bullish",
    risk: "Low",
    activity: 88,
    event: "Spot ETF inflows reached a three-week high",
    trend: makeTrend(1, true),
    color: "#F7931A",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    category: "Layer 1",
    price: 3542.18,
    change24h: 1.32,
    marketCap: "$425.8B",
    volume: "$18.6B",
    rank: 2,
    signal: "Bullish",
    risk: "Low",
    activity: 81,
    event: "Network activity improved after protocol upgrade",
    trend: makeTrend(3, true),
    color: "#627EEA",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    category: "Layer 1",
    price: 178.44,
    change24h: -0.87,
    marketCap: "$82.4B",
    volume: "$4.1B",
    rank: 5,
    signal: "Neutral",
    risk: "Medium",
    activity: 72,
    event: "DEX volume steady amid broad market cooldown",
    trend: makeTrend(7, false),
    color: "#14F195",
  },
  {
    id: "render",
    name: "Render",
    symbol: "RNDR",
    category: "AI",
    price: 9.82,
    change24h: 5.62,
    marketCap: "$3.8B",
    volume: "$412M",
    rank: 28,
    signal: "Bullish",
    risk: "Medium",
    activity: 86,
    event: "Compute demand climbed with AI sector rotation",
    trend: makeTrend(11, true),
    color: "#FF5A36",
  },
  {
    id: "fetch",
    name: "Fetch.ai",
    symbol: "FET",
    category: "AI",
    price: 1.44,
    change24h: 3.91,
    marketCap: "$3.6B",
    volume: "$298M",
    rank: 31,
    signal: "Bullish",
    risk: "Medium",
    activity: 79,
    event: "Developer activity up 18% week-over-week",
    trend: makeTrend(13, true),
    color: "#4F7CFF",
  },
  {
    id: "ondo",
    name: "Ondo",
    symbol: "ONDO",
    category: "RWA",
    price: 0.94,
    change24h: -2.03,
    marketCap: "$1.3B",
    volume: "$126M",
    rank: 62,
    signal: "Neutral",
    risk: "High",
    activity: 68,
    event: "Tokenized treasury TVL crossed a new milestone",
    trend: makeTrend(17, false),
    color: "#38D9FF",
  },
  {
    id: "chainlink",
    name: "Chainlink",
    symbol: "LINK",
    category: "Oracle",
    price: 14.21,
    change24h: 0.74,
    marketCap: "$8.9B",
    volume: "$521M",
    rank: 14,
    signal: "Neutral",
    risk: "Low",
    activity: 63,
    event: "New CCIP integrations expand cross-chain reach",
    trend: makeTrend(19, true),
    color: "#2A5ADA",
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ARB",
    category: "Layer 2",
    price: 0.82,
    change24h: -1.44,
    marketCap: "$3.1B",
    volume: "$204M",
    rank: 45,
    signal: "Bearish",
    risk: "High",
    activity: 47,
    event: "Sequencer revenue softened on lower L2 usage",
    trend: makeTrend(23, false),
    color: "#28A0F0",
  },
  {
    id: "bittensor",
    name: "Bittensor",
    symbol: "TAO",
    category: "AI",
    price: 402.15,
    change24h: 6.34,
    marketCap: "$4.5B",
    volume: "$182M",
    rank: 26,
    signal: "Bullish",
    risk: "Medium",
    activity: 90,
    event: "AI infrastructure demand increasing across subnets",
    trend: makeTrend(29, true),
    color: "#4A4A4A",
  },
  {
    id: "akash",
    name: "Akash Network",
    symbol: "AKT",
    category: "DePIN",
    price: 3.18,
    change24h: 4.82,
    marketCap: "$820M",
    volume: "$64M",
    rank: 71,
    signal: "Bullish",
    risk: "Medium",
    activity: 83,
    event: "GPU marketplace usage expanding with AI demand",
    trend: makeTrend(31, true),
    color: "#E2231A",
  },
  {
    id: "pendle",
    name: "Pendle",
    symbol: "PENDLE",
    category: "RWA",
    price: 4.62,
    change24h: 3.15,
    marketCap: "$740M",
    volume: "$88M",
    rank: 78,
    signal: "Bullish",
    risk: "Medium",
    activity: 76,
    event: "Yield tokenization TVL growth accelerating",
    trend: makeTrend(37, true),
    color: "#2D9CDB",
  },
  {
    id: "helium",
    name: "Helium",
    symbol: "HNT",
    category: "DePIN",
    price: 6.94,
    change24h: 2.28,
    marketCap: "$1.1B",
    volume: "$42M",
    rank: 66,
    signal: "Neutral",
    risk: "Medium",
    activity: 69,
    event: "Physical infrastructure network coverage expanding",
    trend: makeTrend(41, true),
    color: "#474DFF",
  },
  {
    id: "pyth",
    name: "Pyth Network",
    symbol: "PYTH",
    category: "Oracle",
    price: 0.41,
    change24h: 1.06,
    marketCap: "$1.5B",
    volume: "$71M",
    rank: 58,
    signal: "Neutral",
    risk: "Medium",
    activity: 61,
    event: "Low-latency price feeds adopted by more protocols",
    trend: makeTrend(43, true),
    color: "#7C3AED",
  },
]

export type Narrative = {
  name: string
  activity: number
  change: number
  assets: string[]
  note: string
}

export const narratives: Narrative[] = [
  {
    name: "AI Infrastructure",
    activity: 92,
    change: 8.4,
    assets: ["TAO", "RNDR", "AKT"],
    note: "Strong developer activity and ecosystem growth across compute and inference networks.",
  },
  {
    name: "Real-World Assets",
    activity: 78,
    change: 4.1,
    assets: ["ONDO", "PENDLE"],
    note: "Institutional adoption of tokenized treasuries and yield products continues to expand.",
  },
  {
    name: "DePIN",
    activity: 64,
    change: 2.7,
    assets: ["HNT", "AKT"],
    note: "Physical infrastructure networks growing as real-world usage increases.",
  },
  {
    name: "DeFi",
    activity: 57,
    change: 1.4,
    assets: ["LINK", "PENDLE"],
    note: "On-chain financial protocols see steady liquidity and new integrations.",
  },
  {
    name: "Gaming",
    activity: 44,
    change: -2.1,
    assets: ["IMX", "BEAM"],
    note: "Attention cooling as capital rotates toward AI and infrastructure narratives.",
  },
]

export type ResearchUpdate = {
  id: string
  title: string
  time: string
  summary: string
}

// Recent AI-generated research insights shown on the dashboard.
export const researchUpdates: ResearchUpdate[] = [
  {
    id: "bitcoin",
    title: "Bitcoin Research Updated",
    time: "2 hours ago",
    summary: "Market position remains strong as institutional ETF demand continues.",
  },
  {
    id: "bittensor",
    title: "Bittensor Research Updated",
    time: "5 hours ago",
    summary: "AI infrastructure demand and subnet activity continue to expand.",
  },
  {
    id: "ondo",
    title: "Ondo Finance Research Updated",
    time: "8 hours ago",
    summary: "Tokenized treasury adoption grows among institutional participants.",
  },
  {
    id: "ethereum",
    title: "Ethereum Research Updated",
    time: "1 day ago",
    summary: "Ecosystem usage improves following recent protocol upgrades.",
  },
]

export type IntelType = "Market Event" | "Protocol Update" | "Research Report" | "Community Signal"

export type IntelItem = {
  title: string
  type: IntelType
  time: string
  summary: string
  impact: "High" | "Medium" | "Low"
}

export const intelligenceFeed: IntelItem[] = [
  {
    title: "Bitcoin ETF inflows reach a three-week high",
    type: "Market Event",
    time: "12m ago",
    impact: "High",
    summary:
      "Spot Bitcoin ETFs recorded net positive inflows for the fifth consecutive session, signalling continued institutional demand.",
  },
  {
    title: "Ethereum ecosystem activity increased after major protocol updates",
    type: "Protocol Update",
    time: "1h ago",
    impact: "Medium",
    summary:
      "Account abstraction improvements and higher validator efficiency drove a measurable uptick in on-chain transactions.",
  },
  {
    title: "AI sector sees rising developer activity",
    type: "Research Report",
    time: "3h ago",
    impact: "Medium",
    summary:
      "Weekly commits across decentralized compute protocols climbed 18%, led by rendering and inference networks.",
  },
  {
    title: "Large wallets accumulate mid-cap RWA tokens",
    type: "Community Signal",
    time: "5h ago",
    impact: "Medium",
    summary:
      "On-chain trackers flagged repeated accumulation by high-balance addresses across leading tokenization protocols.",
  },
  {
    title: "RWA tokenization crosses a new milestone",
    type: "Market Event",
    time: "6h ago",
    impact: "Low",
    summary:
      "Total value of tokenized treasuries expanded as traditional finance participants deepen on-chain exposure.",
  },
  {
    title: "Oracle networks expand cross-chain data coverage",
    type: "Protocol Update",
    time: "8h ago",
    impact: "Low",
    summary:
      "New integrations broaden real-time price and data availability across additional Layer 1 and Layer 2 networks.",
  },
]

export const marketBrief = {
  overview:
    "Crypto markets remain stable today. Bitcoin maintains strength near local highs while the AI and RWA sectors show increased on-chain attention. Liquidity is healthy and volatility remains contained across major assets.",
  insights: [
    "AI sector activity increased, led by decentralized compute and inference networks.",
    "Ethereum ecosystem usage improved following recent protocol updates.",
    "Institutional Bitcoin demand continued via sustained spot ETF inflows.",
    "Large-wallet accumulation detected across mid-cap RWA tokens.",
  ],
  trend: "Neutral · Bullish bias" as const,
  risk: "Low" as const,
  updated: "Updated 4 min ago",
}

export const riskMonitor = [
  { label: "Market Volatility", level: "Medium", value: 52 },
  { label: "Liquidity", level: "Healthy", value: 78 },
  { label: "Market Events", level: "3 active", value: 45 },
  { label: "Extreme Movements", level: "None detected", value: 18 },
  { label: "Large Transactions", level: "Detected", value: 62 },
]

/* ---- Dashboard intelligence workspace ---- */

export const marketMood = {
  condition: "Stable" as const,
  confidence: 72,
  }

export type Impact = "High" | "Medium" | "Low"

export type KeyInsight = {
  id: string
  category: string
  headline: string
  explanation: string
  impact: Impact
  relatedTokens: string[]
}

export const keyInsights: KeyInsight[] = [
  {
    id: "ai-infra",
    category: "AI Infrastructure",
    headline: "Decentralized compute gains attention",
    explanation: "Demand for AI infrastructure tokens increased as GPU capacity rotated back into the sector.",
    impact: "High",
    relatedTokens: ["TAO", "RNDR", "AKT"],
  },
  {
    id: "rwa",
    category: "RWA",
    headline: "Institutional tokenization keeps expanding",
    explanation: "Tokenized treasury products continue attracting traditional finance participants on-chain.",
    impact: "Medium",
    relatedTokens: ["ONDO", "PENDLE"],
  },
  {
    id: "btc-institutional",
    category: "Institutional",
    headline: "Spot ETF inflows remain a key driver",
    explanation: "Bitcoin recorded a fifth consecutive session of net positive ETF inflows.",
    impact: "High",
    relatedTokens: ["BTC"],
  },
  {
    id: "eth-scaling",
    category: "Ethereum Scaling",
    headline: "Ecosystem usage improves post-upgrade",
    explanation: "Efficiency improvements lifted on-chain transaction activity across the network.",
    impact: "Medium",
    relatedTokens: ["ETH", "ARB"],
  },
]

export type PulseStatus = "Positive" | "Stable" | "Weak" | "Increasing"

export type MarketPulse = {
  label: string
  status: PulseStatus
  direction: "up" | "flat" | "down"
  note: string
}

export const marketPulse: MarketPulse[] = [
  { label: "BTC Market", status: "Positive", direction: "up", note: "Institutional demand remains strong." },
  { label: "ETH Ecosystem", status: "Stable", direction: "flat", note: "Network activity steady after protocol upgrade." },
  { label: "Total Market", status: "Stable", direction: "flat", note: "Liquidity healthy with contained volatility." },
]

/* ---- Featured / researched assets (dashboard + market) ---- */

export type FeaturedAsset = {
  id: string
  whyTrending: string
}

// Assets worth researching, ranked by AI Score. `whyTrending` is a short reason.
export const featuredAssets: FeaturedAsset[] = [
  { id: "bittensor", whyTrending: "AI infrastructure demand increasing" },
  { id: "bitcoin", whyTrending: "Institutional ETF inflows sustained" },
  { id: "render", whyTrending: "Compute demand rising with AI rotation" },
  { id: "ethereum", whyTrending: "Ecosystem usage improving post-upgrade" },
  { id: "fetch", whyTrending: "Developer activity up week-over-week" },
  { id: "akash", whyTrending: "GPU marketplace usage expanding" },
  { id: "pendle", whyTrending: "Yield tokenization TVL accelerating" },
  { id: "ondo", whyTrending: "Tokenized treasury adoption growing" },
  { id: "solana", whyTrending: "High-throughput consumer app activity" },
  { id: "helium", whyTrending: "DePIN network coverage expanding" },
  { id: "chainlink", whyTrending: "Cross-chain integrations broadening" },
  { id: "pyth", whyTrending: "Low-latency price feeds gaining adoption" },
]

/* ---- Research Library ---- */

export type ReportType = "Quick Analysis" | "Full Research Report"

export type SavedReport = {
  id: string
  assetId: string
  type: ReportType
  createdLabel: string
  summary: string
}

// Previously generated AI research reports, newest first.
export const savedReports: SavedReport[] = [
  {
    id: "r-btc-1",
    assetId: "bitcoin",
    type: "Full Research Report",
    createdLabel: "July 2026",
    summary: "Institutional demand and sustained ETF inflows keep Bitcoin's market position strong.",
  },
  {
    id: "r-tao-1",
    assetId: "bittensor",
    type: "Full Research Report",
    createdLabel: "July 2026",
    summary: "Decentralized AI network with expanding subnet activity and rising developer interest.",
  },
  {
    id: "r-eth-1",
    assetId: "ethereum",
    type: "Quick Analysis",
    createdLabel: "June 2026",
    summary: "Ecosystem usage improving post-upgrade with healthy on-chain transaction growth.",
  },
  {
    id: "r-rndr-1",
    assetId: "render",
    type: "Quick Analysis",
    createdLabel: "June 2026",
    summary: "Compute demand rising as the AI infrastructure narrative gains momentum.",
  },
  {
    id: "r-ondo-1",
    assetId: "ondo",
    type: "Full Research Report",
    createdLabel: "May 2026",
    summary: "Tokenized treasury adoption growing among institutional participants.",
  },
]

export type HotTopic = {
  name: string
  reason: string
  assets: string[]
  activity: number
}

export const hotTopics: HotTopic[] = [
  {
    name: "AI Infrastructure",
    reason: "Strong market attention and rising ecosystem activity across compute networks.",
    assets: ["TAO", "RNDR", "AKT"],
    activity: 92,
  },
  {
    name: "Real-World Assets",
    reason: "Increasing institutional adoption of tokenized treasuries and yield products.",
    assets: ["ONDO", "PENDLE", "OM"],
    activity: 78,
  },
  {
    name: "Ethereum Scaling",
    reason: "New ecosystem developments and improved throughput after recent upgrades.",
    assets: ["ARB", "OP", "STRK"],
    activity: 66,
  },
]

export type ResearchOpportunity = {
  id: string
  reason: string
}

export const researchOpportunities: ResearchOpportunity[] = [
  { id: "bitcoin", reason: "Important institutional activity detected via sustained ETF inflows." },
  { id: "render", reason: "AI compute narrative gaining momentum with rising demand." },
  { id: "ondo", reason: "Real-world asset adoption expanding among institutions." },
]

/* ---- Market Intelligence page ---- */

export type SectorPerf = {
  name: string
  change24h: number
  trend: "Strong" | "Growing" | "Stable" | "Weak"
  attention: "High" | "Medium" | "Low"
  spark: Trend
}

export const sectorPerformance: SectorPerf[] = [
  { name: "AI", change24h: 12.5, trend: "Strong", attention: "High", spark: makeTrend(2, true) },
  { name: "RWA", change24h: 6.8, trend: "Growing", attention: "Medium", spark: makeTrend(9, true) },
  { name: "Layer 1", change24h: 2.4, trend: "Stable", attention: "High", spark: makeTrend(4, true) },
  { name: "DePIN", change24h: 4.2, trend: "Stable", attention: "Medium", spark: makeTrend(15, true) },
  { name: "Oracle", change24h: 1.1, trend: "Stable", attention: "Medium", spark: makeTrend(18, true) },
  { name: "Layer 2", change24h: -1.5, trend: "Weak", attention: "Low", spark: makeTrend(21, false) },
  { name: "Gaming", change24h: -3.5, trend: "Weak", attention: "Low", spark: makeTrend(25, false) },
]

export type EmergingAsset = {
  name: string
  symbol: string
  category: string
  chain: string
  reason: string
  signals: string[]
}

export const emergingAssets: EmergingAsset[] = [
  {
    name: "Bittensor",
    symbol: "TAO",
    category: "AI",
    chain: "Bittensor",
    reason: "Decentralized machine learning network drawing sustained developer and capital interest.",
    signals: ["Developer activity increased", "Social attention rising", "Institutional accumulation detected"],
  },
  {
    name: "Akash Network",
    symbol: "AKT",
    category: "DePIN",
    chain: "Cosmos",
    reason: "Decentralized compute marketplace benefiting from the AI infrastructure narrative.",
    signals: ["GPU demand climbing", "Network usage expanding", "New provider onboarding"],
  },
  {
    name: "Pendle",
    symbol: "PENDLE",
    category: "RWA",
    chain: "Ethereum",
    reason: "Yield tokenization protocol gaining traction as RWA products expand on-chain.",
    signals: ["TVL growth accelerating", "New yield markets launched", "Rising integrations"],
  },
]

export type StructureMetric = {
  label: string
  value: string
  status: string
  direction: "up" | "flat" | "down"
}

export const marketStructure: StructureMetric[] = [
  { label: "BTC Dominance", value: "54.2%", status: "Elevated", direction: "up" },
  { label: "Stablecoin Flow", value: "Net inflow", status: "Risk-on", direction: "up" },
  { label: "Exchange Activity", value: "Moderate", status: "Outflows detected", direction: "down" },
  { label: "Liquidity Condition", value: "Healthy", status: "Deep order books", direction: "flat" },
]

export function getAsset(id: string) {
  return assets.find((a) => a.id === id) ?? assets[0]
}

export type RiskLevel = "Low" | "Medium" | "High"

export type Research = {
  overview: string
  marketPosition: string
  growthDrivers: string[]
  risks: string[]
  summary: string
  compositeScore: string
  useCase: string
  launch: string
  team: string
  blockchain: string
  website: string
  fundamentals: { title: string; description: string; details: { label: string; value: string }[] }[]
  ecosystem: { layer: string; related: string[]; devActivity: string; growth: string }
  performance: { label: string; value: number }[]
  marketInterest: { label: string; value: string; change: number }[]
  riskScores: { label: string; level: RiskLevel; note: string }[]
  onchain: { label: string; value: string; change: number; hint: string }[]
  social: { label: string; value: string; change: number }[]
  related: { id: string; reason: string }[]
  aiRating: { overall: number; breakdown: { label: string; score: number }[] }
  narratives: string[]
  latestIntel: { time: string; source: string; headline: string; impact: Impact }[]
}

const overviewMap: Record<string, string> = {
  bitcoin:
    "Bitcoin is a decentralized digital asset designed as a peer-to-peer payment network and store of value, secured by a global proof-of-work network with no central issuer.",
  ethereum:
    "Ethereum is a decentralized smart contract platform that powers the majority of on-chain applications, stablecoins and tokenized assets, settling value through a proof-of-stake network.",
  solana:
    "Solana is a high-throughput Layer 1 blockchain optimized for low-cost, high-speed applications across payments, DeFi and consumer software.",
  render:
    "Render is a decentralized GPU compute network that connects idle graphics power with demand for rendering and AI inference workloads.",
  fetch:
    "Fetch.ai is an infrastructure network for autonomous agents, combining machine learning and on-chain coordination to automate digital and economic tasks.",
  ondo:
    "Ondo brings institutional-grade real-world assets on-chain, offering tokenized exposure to treasuries and yield-bearing instruments.",
  chainlink:
    "Chainlink is a decentralized oracle network that delivers real-world data and cross-chain messaging to smart contracts across major blockchains.",
  arbitrum:
    "Arbitrum is an Ethereum Layer 2 network using optimistic rollups to scale transactions with lower fees while inheriting Ethereum security.",
}

const teamMap: Record<string, string> = {
  bitcoin: "Satoshi Nakamoto (pseudonymous), maintained by a global open-source contributor base.",
  ethereum: "Founded by Vitalik Buterin and co-founders; developed by the Ethereum Foundation and independent client teams.",
  solana: "Founded by Anatoly Yakovenko; developed by Solana Labs and the Solana Foundation.",
}

const fundingMap: Record<string, string> = {
  bitcoin: "No initial funding round — fully permissionless launch.",
  ethereum: "Public crowdsale in 2014.",
  solana: "Multiple venture and public token rounds.",
}

const relatedReason: Record<string, string> = {
  bitcoin: "Reference store-of-value asset",
  ethereum: "Leading smart contract platform",
  solana: "High-performance Layer 1 alternative",
  render: "AI & decentralized compute exposure",
  fetch: "AI agent infrastructure",
  ondo: "Real-world asset tokenization",
  chainlink: "Core oracle & data infrastructure",
  arbitrum: "Ethereum scaling layer",
}

const narrativeMap: Record<string, string[]> = {
  bitcoin: ["Institutional Adoption", "Store of Value", "Layer 1", "Macro Hedge"],
  ethereum: ["Smart Contract Platforms", "Layer 1", "Tokenization", "Staking Economy"],
  solana: ["High-Performance L1", "Consumer Crypto", "Layer 1", "DePIN"],
  render: ["AI Infrastructure", "DePIN", "Decentralized Compute"],
  fetch: ["AI Agents", "AI Infrastructure", "Automation"],
  ondo: ["Real-World Assets", "Tokenization", "Institutional DeFi"],
  chainlink: ["Oracles", "Cross-Chain Infrastructure", "Tokenization"],
  arbitrum: ["Ethereum Scaling", "Layer 2", "Rollups"],
}

// Primary narrative an asset is most associated with (used by monitoring views).
export function assetNarrative(a: Asset): string {
  return narrativeMap[a.id]?.[0] ?? a.category
}

// Deterministic "last updated" label so monitored assets show a stable recency.
const UPDATED_LABELS = ["8 min ago", "26 min ago", "1 hour ago", "2 hours ago", "4 hours ago", "7 hours ago", "Yesterday"]
export function lastUpdatedLabel(a: Asset): string {
  const h = a.id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return UPDATED_LABELS[h % UPDATED_LABELS.length]
}

export function getResearch(a: Asset): Research {
  const isBtc = a.id === "bitcoin"
  const related = assets
    .filter((x) => x.id !== a.id)
    .sort((x, y) => (x.category === a.category ? -1 : 0) - (y.category === a.category ? -1 : 0))
    .slice(0, 4)

  return {
    overview:
      overviewMap[a.id] ??
      `${a.name} is a ${a.category} asset with an active ecosystem and growing on-chain adoption across the digital asset market.`,
    marketPosition: `${a.name} is positioned as a ${a.rank <= 5 ? "top-tier" : a.rank <= 25 ? "established mid-cap" : "emerging"} asset within the ${a.category} sector, ranked #${a.rank} by market capitalization. Adoption is supported by ${isBtc ? "deep institutional participation and unmatched liquidity" : "a growing developer base and expanding real-world usage"}, while it competes with other ${a.category} networks for share of on-chain activity.`,
    growthDrivers: isBtc
      ? ["Institutional adoption via spot ETFs", "Fixed, predictable supply schedule", "Global brand recognition", "Deepest liquidity in digital assets"]
      : [
          "Expanding developer ecosystem",
          "Growing network usage and adoption",
          `Momentum in the ${a.category} narrative`,
          "New protocol integrations and partnerships",
        ],
    risks: isBtc
      ? ["Price volatility across market cycles", "Evolving regulatory landscape", "Macro-driven liquidity swings"]
      : ["Price volatility across market cycles", "Competitive landscape within the sector", "Evolving regulatory landscape", "Execution and technology risk"],
    summary: `${a.name} is a ${a.rank <= 10 ? "core" : "notable"} asset in the ${a.category} category with ${a.risk.toLowerCase()} composite risk and a ${a.signal.toLowerCase()} near-term signal. Strengths center on ${isBtc ? "liquidity and recognition" : "ecosystem momentum and adoption"}; the main considerations are volatility and regulatory uncertainty. This is data-driven research, not investment advice.`,
    compositeScore: a.rank <= 5 ? "8.6" : a.rank <= 25 ? "7.4" : "6.8",
    useCase: a.category === "Layer 1" ? "Settlement & smart contract platform" : `${a.category} infrastructure`,
    launch: a.id === "bitcoin" ? "2009" : a.id === "ethereum" ? "2015" : a.id === "solana" ? "2020" : "2021",
    team: teamMap[a.id] ?? "Core foundation and independent contributor teams.",
    blockchain: a.category.includes("Layer 2") ? "Ethereum (Layer 2)" : `${a.name} network`,
    website: `${a.id}.org`,
    fundamentals: [
      {
        title: "Project Overview",
        description:
          overviewMap[a.id] ?? `${a.name} operates in the ${a.category} sector with an active on-chain ecosystem.`,
        details: [
          { label: "Sector", value: a.category },
          { label: "Launched", value: a.id === "bitcoin" ? "2009" : a.id === "ethereum" ? "2015" : "2020+" },
        ],
      },
      {
        title: "Technology",
        description: isBtc
          ? "Proof-of-work consensus secures a fixed-supply ledger optimized for settlement and value storage."
          : `${a.name} uses a modern consensus design focused on ${a.category === "Layer 1" ? "throughput and programmability" : "scalability and interoperability"}.`,
        details: [
          { label: "Consensus", value: isBtc ? "Proof of Work" : "Proof of Stake" },
          { label: "Programmable", value: isBtc ? "Limited" : "Yes" },
        ],
      },
      {
        title: "Team & Governance",
        description: teamMap[a.id] ?? "Developed by a core foundation with independent client and contributor teams.",
        details: [
          { label: "Governance", value: isBtc ? "Off-chain / social" : "Foundation + community" },
          { label: "Open source", value: "Yes" },
        ],
      },
      {
        title: "Funding & Backing",
        description: fundingMap[a.id] ?? "Backed by a mix of venture funding and public token distribution.",
        details: [
          { label: "Model", value: isBtc ? "Permissionless" : "Foundation-led" },
          { label: "Treasury", value: isBtc ? "None" : "Active" },
        ],
      },
      {
        title: "Use Case",
        description: isBtc
          ? "Store of value and peer-to-peer settlement across a censorship-resistant network."
          : `Serves as ${a.category === "Layer 1" ? "a platform for decentralized applications" : `key ${a.category} infrastructure`} within the broader ecosystem.`,
        details: [
          { label: "Primary", value: a.category === "Layer 1" ? "App platform" : a.category },
          { label: "Adoption", value: a.rank <= 10 ? "High" : "Growing" },
        ],
      },
    ],
    ecosystem: {
      layer: a.category.includes("Layer") ? a.category : "Layer 1",
      related: related.map((r) => r.symbol),
      devActivity: a.activity >= 80 ? "High" : a.activity >= 60 ? "Elevated" : "Moderate",
      growth: a.change24h >= 0 ? "Expanding" : "Stabilizing",
    },
    performance: [
      { label: "7D", value: Number((a.change24h * 2.1).toFixed(1)) },
      { label: "30D", value: Number((a.change24h * 4.4).toFixed(1)) },
      { label: "90D", value: Number((a.change24h * 7.8 + (isBtc ? 12 : 4)).toFixed(1)) },
    ],
    marketInterest: [
      { label: "Volume Trend", value: a.volume, change: a.change24h },
      { label: "Market Sentiment", value: a.signal, change: a.signal === "Bullish" ? 5.2 : a.signal === "Bearish" ? -3.4 : 1.1 },
      { label: "Search Interest", value: a.activity >= 75 ? "Rising" : "Steady", change: a.activity >= 75 ? 8.6 : 1.4 },
    ],
    riskScores: [
      { label: "Market Risk", level: a.risk, note: "Sensitivity to broad market volatility" },
      { label: "Liquidity Risk", level: a.rank <= 10 ? "Low" : a.rank <= 40 ? "Medium" : "High", note: "Depth of trading and market access" },
      { label: "Technology Risk", level: a.category === "Layer 1" && a.rank <= 10 ? "Low" : "Medium", note: "Protocol maturity and stability" },
      { label: "Centralization Risk", level: isBtc ? "Low" : "Medium", note: "Distribution of control and validators" },
      { label: "Regulatory Risk", level: a.category === "RWA" ? "High" : "Medium", note: "Exposure to changing policy" },
    ],
    onchain: [
      { label: "Holder Growth", value: "+2.4%", change: 2.4, hint: "New addresses over 30 days" },
      { label: "Transaction Activity", value: "1.2M / 24h", change: 3.8, hint: "Daily on-chain transactions" },
      { label: "Network Usage", value: `${Math.min(96, a.activity + 8)}% capacity`, change: -0.6, hint: "Utilization vs. throughput" },
      { label: "Large Wallet Movement", value: "Accumulating", change: 1.1, hint: "High-balance address behavior" },
      { label: "Exchange Flow", value: a.change24h >= 0 ? "Net outflow" : "Net inflow", change: a.change24h >= 0 ? 2.2 : -1.8, hint: "Coins moving to / from exchanges" },
    ],
    social: [
      { label: "Social Activity", value: "High", change: 6.2 },
      { label: "Developer Attention", value: a.activity >= 75 ? "Rising" : "Steady", change: 4.5 },
      { label: "News Activity", value: "1,284 mentions", change: 12.4 },
      { label: "Community Growth", value: "+3.1%", change: 3.1 },
    ],
    related: related.map((r) => ({ id: r.id, reason: relatedReason[r.id] ?? `${r.category} asset` })),
    aiRating: {
      overall: a.rank <= 5 ? 92 : a.rank <= 15 ? 84 : a.rank <= 40 ? 76 : 68,
      breakdown: [
        { label: "Technology", score: isBtc ? 95 : a.category === "Layer 1" ? 88 : 82 },
        { label: "Adoption", score: a.rank <= 5 ? 90 : a.rank <= 20 ? 78 : 66 },
        { label: "Market Position", score: a.rank <= 3 ? 98 : a.rank <= 10 ? 86 : 72 },
        { label: "Risk", score: a.risk === "Low" ? 82 : a.risk === "Medium" ? 70 : 55 },
      ],
    },
    narratives: narrativeMap[a.id] ?? [a.category, "Digital Assets", "On-chain Growth"],
    latestIntel: [
      {
        time: "2h ago",
        source: "Institutional",
        headline: isBtc ? "ETF inflows increased for a fifth session" : `${a.name} ecosystem activity trending higher`,
        impact: "High",
      },
      {
        time: "6h ago",
        source: "On-chain",
        headline: a.change24h >= 0 ? "Net exchange outflows detected" : "Accumulation by large wallets observed",
        impact: "Medium",
      },
      {
        time: "1d ago",
        source: "Research",
        headline: `${a.category} sector attention continues to expand`,
        impact: "Medium",
      },
      {
        time: "2d ago",
        source: "Community",
        headline: "Developer and social activity rose week-over-week",
        impact: "Low",
      },
    ],
  }
}
