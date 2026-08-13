# CoinNavigator

An AI-powered Web3 research terminal demo built with Next.js, Tailwind CSS v4, and shadcn/ui. Features a marketing landing page, dashboard, market overview, AI research, token details, watchlist, library, membership, and settings.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) (Base UI / Nova preset)
- **Web3**: [wagmi](https://wagmi.sh/) + [viem](https://viem.sh/) + [RainbowKit](https://www.rainbowkit.com/)
- **State**: React Context for auth/membership modals, @tanstack/react-query for Web3 data
- **Analytics**: [@vercel/analytics](https://vercel.com/docs/analytics)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example and optionally set your WalletConnect project ID and deployed membership contract address:

   ```bash
   cp .env.local.example .env.local
   ```

   > MetaMask and OKX Wallet work as injected wallets without a project ID. WalletConnect-based wallets require a project ID from [Reown Cloud](https://cloud.reown.com).
   >
   > Membership status is read from `MembershipPass`. Set `NEXT_PUBLIC_BSC_MEMBERSHIP_PASS_ADDRESS` or `NEXT_PUBLIC_BSC_TESTNET_MEMBERSHIP_PASS_ADDRESS` after deploying the contract. The frontend reads `paymentToken` and `monthlyPrice` from the contract, approves the stablecoin, then calls `recharge()`.
   >
   > Market data is served through `/api/market/top100`. Set `COINMARKETCAP_API_KEY` to use CoinMarketCap first; without it the app falls back to CoinGecko's markets endpoint.
   >
   > News can come from CoinMarketCap, CoinGecko Pro news, or CryptoPanic when `CRYPTOPANIC_API_KEY` is set.
   >
   > AI market analysis is served through `/api/research/market-analysis`. It combines top assets, global metrics and news/events into daily brief, key insights, narrative scores and asset research scores.
   >
   > Token reports are served through `/api/research/token-report` and cached by token, report type and day for 7 days. Set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` to use any OpenAI-compatible LLM provider. Without those variables, the app falls back to the deterministic demo report generator.

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

- `app/` — Next.js App Router pages
  - `app/page.tsx` — Marketing landing page
  - `app/dashboard/page.tsx` — Research terminal dashboard
  - `app/market/page.tsx` — Market overview
  - `app/research/page.tsx` — AI research workspace
  - `app/token/[id]/page.tsx` — Token detail page
  - `app/watchlist/page.tsx` — Saved assets watchlist
  - `app/library/page.tsx` — Saved research reports
  - `app/membership/page.tsx` — Membership plans
  - `app/settings/page.tsx` — User settings
  - `app/auth/login/page.tsx` — Login page
- `components/` — React components
  - `components/app/` — App shell, sidebar, topbar, command palette
  - `components/auth/` — Auth context, wallet modal, user menu, welcome toast
  - `components/dashboard/` — Dashboard widgets
  - `components/market/` — Market view
  - `components/research/` — Research view
  - `components/token/` — Token detail view
  - `components/watchlist/` — Watchlist view
  - `components/library/` — Library view
  - `components/membership/` — Membership view
  - `components/settings/` — Settings view
  - `components/marketing/` — Landing page sections
  - `components/payment/` — Upgrade and payment modals
  - `components/ui/` — shadcn/ui primitives (Button, etc.)
  - `components/primitives.tsx` — Shared primitive components
  - `components/web3-provider.tsx` — wagmi + RainbowKit provider
- `lib/` — Utilities and configuration
  - `lib/data.ts` — Sample tokens, narratives, and research data
  - `lib/utils.ts` — `cn()` helper
- `lib/web3.ts` — wagmi config for BSC Mainnet and Testnet
- `lib/market-data.ts` — Top 100 market-cap assets from CoinMarketCap or CoinGecko
- `lib/ai-analysis.ts` — Data-driven analysis engine for daily briefs, narrative scores and asset research scores

## Data & AI Pipeline

- Market data: CoinMarketCap listings when `COINMARKETCAP_API_KEY` is set; otherwise CoinGecko top markets and global metrics.
- News/events: CoinMarketCap content or CoinGecko news when available; otherwise generated market events from BTC, ETH, market cap, volume and BTC dominance.
- Optional extra news/events: CryptoPanic when `CRYPTOPANIC_API_KEY` is configured.
- Optional LLM generation: any OpenAI-compatible `/chat/completions` provider via `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`; supports hosted APIs or self-hosted gateways such as Ollama, vLLM and LiteLLM.
- Narrative score: 30% market momentum, 30% news/event mentions, 20% developer activity proxy, 20% market/social attention proxy.
- Asset research score: 30% narrative strength, 25% fundamental quality by market rank, 20% developer activity proxy, 15% market attention, 10% risk.
- `public/` — Static assets including token icons and wallet logos

## Supported Networks

- BNB Smart Chain Mainnet (chain ID: 56)
- BNB Smart Chain Testnet (chain ID: 97)

## Supported Wallets

- MetaMask
- OKX Wallet
- Bitget Wallet
- WalletConnect-compatible wallets

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run typecheck` — Run TypeScript checks
- `npm run format` — Format with Prettier

## Notes

- Wallet connection is real via wagmi/RainbowKit.
- Membership is backed by the `MembershipPass` Solidity contract when a contract address is configured. Without an address, the app can still run as a demo but on-chain membership payment is unavailable.
