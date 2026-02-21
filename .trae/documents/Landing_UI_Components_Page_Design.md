# Page Design Spec — Landing UI Components + Home Composition (Desktop-first)

## Global Styles (applies to all pages)
- Layout system: Flexbox + CSS Grid via Tailwind utility classes.
- Background: `bg-zinc-950` with subtle radial gradients for neon haze (use absolute gradient layer + `blur-xl`).
- Brand tokens (existing): `web3-cyan #22D3EE`, `web3-purple #A78BFA`, `shadow-glow`.
- Typography: Geist Sans for UI, Geist Mono for hashes/addresses.
- Panels: frosted glass cards `border border-white/10 bg-white/5`, hover `bg-white/10`, focus rings with cyan/purple glow.
- Buttons: Primary `bg-web3-cyan text-zinc-950 shadow-glow`, Secondary `border-white/15 bg-white/5`.

## Page: Home (/)
### Meta Information
- Title: “NFT Marketplace”
- Description: “Discover, collect, and sell extraordinary NFTs.”
- Open Graph: `og:title`, `og:description`, `og:type=website`.

### Page Structure
- Desktop: stacked sections inside a centered container (max-w-6xl), generous vertical spacing (gap 10–14).
- Mobile: sections remain stacked; grids collapse to 1 column; CTA row becomes vertical.

### Sections & Components
1) **Hero (existing, updated wrapper)**
- Layout: 2-column grid on desktop (copy + CTA on left, visual card on right).
- Keep neon “status pill”, main H1, supporting paragraph, and 2 CTAs.
- Visual: right-side card keeps frosted look with gradient glow underlay.

2) **Landing Component 1 — Featured Drops (new)**
- Purpose: instantly show “what you can find here” with a cyberpunk gallery feel.
- Layout: section header row + 3–6 card grid (`sm:grid-cols-2 lg:grid-cols-3`).
- Content:
  - Title: “Featured Drops”
  - Subcopy: short line about curated / trending.
  - Cards: reuse `NFTCard` styling; if on-chain data isn’t loaded, render skeleton cards.
- Interactions: card hover elevates (slightly brighter border), optional link to `/explore`.

3) **Landing Component 2 — Marketplace Stats (new)**
- Purpose: reassure users the marketplace is live and connected.
- Layout: 3-up stat tiles in a single row on desktop; wraps to 1 column on mobile.
- Tiles (minimum):
  - “Listed NFTs” (count if available, else “—”)
  - “Chain” (e.g., “Hardhat” locally; display chainId)
  - “Contract” (truncate address; copyable optional but not required)
- Styling: each tile is a frosted panel with small neon accent line (cyan/purple gradient).

4) **Landing Component 3 — How It Works (new)**
- Purpose: explain flow in 3 steps.
- Layout: 3 cards in a row on desktop; stacked on mobile.
- Steps (copy + link):
  - Step 1: “Connect” → links to Home connect button / NavBar connect affordance.
  - Step 2: “Mint & List” → links to `/create`.
  - Step 3: “Buy” → links to `/explore`.
- Interaction: hover highlights border; minimal motion (150–200ms transitions only).

5) **Final CTA Strip (Home composition)**
- Purpose: reinforce primary actions after explanation.
- Layout: wide neon panel with 2 buttons (Explore/Create).
- Styling: gradient border + soft glow, consistent with existing CTAs.

## Page: Explore (/explore)
- No layout redesign required; ensure Featured Drops/seeded items appear naturally via `fetchMarketItems`.
- Maintain existing states: loading skeleton, error banner, empty state card.

## Page: Create (/create)
- No visual redesign required; seed script reduces “empty marketplace” by ensuring listings exist for testing.

## Page: Dashboard (/dashboard)
- No visual redesign required; seeded listings help validate dashboard tabs when using multiple local accounts.
