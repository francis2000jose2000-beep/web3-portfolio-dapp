# Page Design Spec — New Pages + Neon Style (Desktop-first)

## Global Styles (applies to all pages)
- Layout: Tailwind-based hybrid Flexbox + CSS Grid.
- Max width: `max-w-6xl` centered container with generous spacing (`gap-10` to `gap-14`).
- Neon theme tokens (consistent with existing docs):
  - Background: `bg-zinc-950` with subtle radial gradients and blurred glow underlays.
  - Panels/cards: frosted glass (`border border-white/10 bg-white/5`), hover (`bg-white/10`), focus ring (cyan/purple glow).
  - Accents: cyan + purple gradient separators, small neon “status pills”.
  - Buttons:
    - Primary: cyan fill, dark text, glow shadow.
    - Secondary: translucent with border; hover increases brightness.
- Typography: strong H1/H2; mono font for addresses/hashes.
- Motion: 150–200ms transitions; avoid heavy animations.

## Shared SSR-safe rendering guidance (all pages)
- Any wallet-derived UI must show deterministic placeholders on SSR (e.g., “—”, skeleton line, disabled button) and only render live wallet state after a mounted guard inside a Client Component.
- Connect buttons, address display, and chain indicators must not change text between SSR and first client render.

---

## Page: Search (/search)
### Layout
- Desktop: header row (title + query input) + optional filter bar + results grid.
- Grid: CSS Grid `grid-cols-3` desktop, `grid-cols-2` tablet, `grid-cols-1` mobile.

### Meta Information
- Title: “Search — NFT Marketplace”
- Description: “Search NFTs and creators.”
- Open Graph: `og:title`, `og:description`, `og:type=website`.

### Page Structure
1) Top header
2) Search + filters
3) Results

### Sections & Components
1) **Header Row**
- Left: page title “Search”.
- Right: compact neon pill showing “Results” count (or “—” before data resolves).

2) **Search Bar**
- Single input with neon focus ring.
- Submit button (secondary style) and optional clear icon.
- Keep query in URL (`?q=`) so it is shareable.

3) **Filter Bar (optional)**
- Minimal toggles/chips in frosted container (e.g., “Listed only”).

4) **Results Grid**
- Reuse existing `NFTCard` visual language.
- States:
  - Loading: 6 skeleton cards.
  - Empty: centered frosted panel “No results”.
  - Error: slim red/pink neon banner.

---

## Page: NFT Details (/nft-details/[id])
### Layout
- Desktop: 2-column layout (media left, info/actions right).
- Mobile: stacked (media then info).

### Meta Information
- Title: “NFT #{id} — NFT Marketplace” (or name if available)
- Description: “NFT details, pricing, and ownership.”
- Open Graph: `og:title`, `og:description`, `og:image` if media URL exists.

### Page Structure
1) Breadcrumb/back row
2) Media + details
3) Related actions / links

### Sections & Components
1) **Back/Breadcrumb Row**
- Back button (secondary) to previous page.
- Optional “View author” link.

2) **Media Panel**
- Large frosted card with media preview.
- If image/video fails: fallback placeholder with neon border.

3) **Details Panel**
- Title + short description.
- Metadata table (frosted): token id, contract, owner, seller.
- Price row: big neon price text when listed.

4) **Primary Action Box**
- SSR-safe:
  - Before mount: show disabled primary button + skeleton wallet status.
  - After mount: show connect/buy/other eligible action.
- Button styles: primary for the main action; secondary for “View on explorer”.

---

## Page: Author (/author)
### Layout
- Desktop: author header panel + tabs/filters row (optional) + NFT grid.

### Meta Information
- Title: “Author — NFT Marketplace”
- Description: “View NFTs from a creator.”
- Open Graph: standard website metadata.

### Page Structure
1) Author header
2) Author stats strip
3) NFT grid

### Sections & Components
1) **Author Header Panel**
- Avatar placeholder (gradient circle).
- Display name (fallback: truncated address).
- Address line in mono with copy affordance (optional).

2) **Stats Strip**
- 2–3 small tiles (e.g., “Items”, “Listed”, “Owned”) with “—” fallback when not derivable.

3) **NFT Grid**
- Same grid rules as Search.
- Empty state: “This author has no items yet.”

---

## Page: Upload NFT (/upload-nft)
### Layout
- Desktop: 2-column (preview left, form right).
- Mobile: stacked.

### Meta Information
- Title: “Upload NFT — NFT Marketplace”
- Description: “Mint and list your NFT.”
- Open Graph: standard website metadata.

### Page Structure
1) Page header
2) Preview + form
3) Transaction status panel

### Sections & Components
1) **Header**
- Title “Upload NFT” + short helper text.

2) **Asset Preview Panel**
- Drag/drop area or URL field (depending on implementation).
- Shows preview frame; empty state has dashed neon border.

3) **Metadata Form Panel**
- Fields: Name, Description, Price.
- Validation messages in subtle neon red.

4) **Wallet Guard + Submit**
- SSR-safe:
  - Before mount: show disabled submit + “Connect to continue” hint.
  - After mount: if disconnected, show connect CTA; if connected, enable submit.

5) **Tx Status Panel**
- Compact frosted panel that shows: Idle / Pending / Success / Error.

---

## Page: Subscription (/subscription)
### Layout
- Desktop: plan card row (3-up) + details panel beneath.
- Mobile: plans stack.

### Meta Information
- Title: “Subscription — NFT Marketplace”
- Description: “Choose a plan to unlock premium features.”
- Open Graph: standard website metadata.

### Page Structure
1) Header + wallet status
2) Plan cards
3) Confirmation + CTA

### Sections & Components
1) **Header + Wallet Status**
- Title “Subscription”.
- Wallet badge (SSR-safe placeholder → live address after mount).

2) **Plan Cards**
- 2–3 frosted cards with gradient top border.
- Each card: plan name, price, 3–5 bullet benefits, select button.
- Selected state: brighter border + subtle glow.

3) **Confirm Panel**
- Shows selected plan summary.
- Subscribe button:
  - Disabled if disconnected or no plan selected.
  - If contract integration isn’t available yet, label “Coming soon” and keep disabled.
