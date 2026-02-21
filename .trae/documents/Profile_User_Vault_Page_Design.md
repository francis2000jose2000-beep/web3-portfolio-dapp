# Profile / User Vault — Page Design Spec (Desktop-first)

## Layout
- Primary layout: 12-column CSS Grid for page shell + Flexbox inside cards.
- Desktop: two-column shell (left summary panel, right NFT grid). Tablet/mobile: stacked sections.
- Spacing: 24px section padding desktop; 16px on small screens. Card gap 16px.

## Meta Information
- Title: `Profile | Your Vault`
- Description: `View NFTs owned by this address.`
- Open Graph: title mirrors page title; use a default marketplace preview image.

## Global Styles (applies across this page and shared components)
- Typography: use sentence case for helper text; title case only for primary navigation labels.
- Voice & tone (professional English):
  - Prefer concise, neutral phrasing (avoid slang like “cool”, “oops”, “dang”).
  - Use consistent verbs: “View”, “Open”, “Retry”, “Copy address”.
  - Error copy format: short summary + next step.
- Standard UI strings (recommended):
  - Loading: `Loading your vault…`
  - Empty: `No NFTs found for this address.`
  - Error: `Unable to load NFTs. Please try again.`
  - Primary action: `Retry`

## Page Structure
- Header area (page title + owner context)
- Content area (owned NFT grid)
- State overlays/blocks (loading, empty, error)

## Sections & Components

### 1) Page Header
- Elements:
  - H1: `Your Vault`
  - Owner label row:
    - Label: `Owner address`
    - Value: truncated address (e.g., `0x1234…abcd`)
    - Secondary action: `Copy` button (copies full address)
- Interaction:
  - Copy button: hover state + toast `Address copied.`

### 2) Owned NFT Grid
- Grid: responsive card grid (desktop: 3–4 columns depending on container width).
- Each NFT Card:
  - Media preview (image/video/audio placeholder) with fixed aspect ratio.
  - Name (single line clamp), optional category badge.
  - Footer row: price (if present) + status (e.g., sold indicator if applicable).
  - Primary interaction: click card to open NFT details.

### 3) Loading State
- Show skeleton cards matching the grid layout.
- Disable card interactions until loaded.

### 4) Empty State
- Centered block within content area:
  - Title: `No NFTs to display`
  - Helper: `No NFTs found for this address.`

### 5) Error State
- Centered block within content area:
  - Title: `Something went wrong`
  - Helper: `Unable to load NFTs. Please try again.`
  - Button: `Retry` (re-fetches with same owner filter)

## Responsive Behavior
- ≥1024px: left summary panel ~320px; right grid fills remaining width.
- <1024px: summary panel becomes top section; grid becomes 2 columns.
- <640px: grid becomes 1 column; owner address wraps to two lines if needed.

## Motion / Transitions
- Use subtle 150–200ms transitions for button hover and card elevation.
- No complex animations; prioritize fast perceived loading with skeletons.