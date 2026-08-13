# Project Overview

`coinnavigator-demo-ai` is an AI-powered Web3 research terminal demo built at `G:/code-space/ai-space/coinnavigator-demo-ai`.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui using the Base UI / Nova preset
- **Web3**: wagmi + viem + RainbowKit
- **State**: React Context for auth/membership modals, @tanstack/react-query for Web3 data
- **Analytics**: @vercel/analytics

## Project Layout

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
- `public/` — Static assets including token icons and wallet logos

## Supported Networks

- BNB Smart Chain Mainnet (chain ID: 56)
- BNB Smart Chain Testnet (chain ID: 97)

## Supported Wallets

- MetaMask
- OKX Wallet
- Bitget Wallet
- WalletConnect-compatible wallets

## Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run format       # Format code with Prettier
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and optionally set:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — Required for WalletConnect wallets; injected wallets (MetaMask / OKX) work without it. Get a project ID at https://cloud.reown.com.

## Notes for Agents

- This is a frontend-only demo; no backend or real contract interactions are implemented yet.
- Wallet connection is real via wagmi/RainbowKit. Membership and payments are UI-only and do not process real transactions.
- Keep edits scoped to the Web3 research terminal features unless asked otherwise.
- When adding new shadcn components, prefer `npx shadcn add <component>` to match the existing style.
