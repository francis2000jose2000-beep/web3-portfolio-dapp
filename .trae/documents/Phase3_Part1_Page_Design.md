# Phase 3 Part 1 — Page Design Spec (Desktop-first)

## Global (App Shell / Root Layout)

### Layout
- Desktop-first container: centered max-width content (e.g., 1100–1200px) with full-width background.
- Primary layout pattern: vertical stack (NavBar → Main content → Footer).
- Use Flexbox for NavBar horizontal alignment and Footer row/column alignment.

### Meta Information
- Default title template: `NFT Marketplace — {Page}`
- Default description: “Discover and create NFTs.”
- Open Graph: title/description mirror page title/description (placeholder images acceptable in this phase).

### Global Styles (Tailwind tokens)
- Background: near-white or near-black neutral (choose one theme and apply consistently).
- Text: high-contrast foreground for accessibility.
- Brand accent: one primary brand color used for primary buttons and link hovers.
- Typography scale: clear H1/H2/body sizes; strong H1 weight for hero.
- Buttons:
  - Primary: solid brand background, white text, hover darken/lighten.
  - Secondary: subtle border, transparent background, hover add tinted background.
- Links: underline-on-hover or color shift on hover.

### Shared Components
1. NavBar
   - Left: brand/logo (clickable to `/`).
   - Center/Right: navigation links (to `/explore`, `/create`) with hover state.
   - Right-most: “Connect Wallet” button placeholder (disabled or no-op).
2. Footer
   - Minimal footer row: copyright.
   - Optional: 1–2 placeholder links (e.g., “Docs”, “Terms”) without requiring implementation beyond styling.

## Page: Home (/)

### Page Structure
- Stacked sections:
  1) Hero section (primary content)
  2) (Optional) thin trust/benefits strip (text-only) to balance the page without adding new features

### Sections & Components
1. Hero
   - H1 headline (value proposition).
   - One-sentence supporting copy.
   - CTA row:
     - Primary CTA button: links to `/explore`.
     - Secondary CTA button: links to `/create`.
   - Optional right-side visual block (desktop): simple gradient card/illustration placeholder.

### Responsive behavior
- Desktop: hero uses two-column layout (text left, visual right).
- Tablet/mobile: collapse to single column; CTAs stack vertically with full-width buttons.

## Page: Explore (Placeholder) (/explore)

### Page Structure
- Simple centered “Coming soon” layout within the global shell.

### Sections & Components
- Page title (H1/H2): “Explore”.
- Supporting text: “Coming soon”.
- Link/button back to Home.

## Page: Create (Placeholder) (/create)

### Page Structure
- Simple centered “Coming soon” layout within the global shell.

### Sections & Components
- Page title (H1/H2): “Create”.
- Supporting text: “Coming soon”.
- Link/button back to Home.