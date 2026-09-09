# DESIGN.md — the design language

**Authority:** this document defines the visual language. It outranks the baseline tokens in
SPEC §5.1. Where it conflicts with a §5.0 invariant, §5.0 wins and you report the conflict.

---

## PART 0 — Adaptation notes (read before applying anything below)

The system documented in Part 1 is a **marketing site** design language: ultra-low density,
one product tile per viewport, whitespace as pedestal. **We are building a data-dense interactive
teaching tool.** Adopt the language; do not adopt the density. Four collisions, resolved:

### 0.1 Density — adopt the rhythm, not the airiness

Apple's `{spacing.section}` of 80px and one-tile-per-viewport belong to **marketing surfaces
only**. In this project:

| Surface | Density |
|---|---|
| Index page, chapter landing pages | **Full Apple density.** Alternating full-bleed light/dark tiles, 80px section padding, one chapter per tile. This is where the language shines. |
| Unit pages (the 89 animations) | **Compact.** The animation canvas, caption rail, concept card, metrics table and transport must be visible together without scrolling on desktop. Use `{spacing.lg}` (24px) as the section rhythm, not `{spacing.section}`. |

A student mid-scrub must not have to scroll to see the caption for the frame they are looking at.
Whitespace never wins over that.

### 0.2 The single-accent rule does not apply to data

Part 1 says *"Don't introduce a second accent color."* That governs **interactive chrome** —
links, buttons, focus rings. It does **not** govern data encoding.

- `{colors.primary}` Action Blue `#0066cc` becomes `--accent`: every link, button, focus ring,
  and the playhead. One interactive colour, as Apple specifies.
- `--running` / `--waiting` / `--blocked` / `--idle` / `--completed` are **semantic data
  encoding**, not accents. They stay four-to-five visually distinct hues. SPEC §5.0 #2 governs
  them and outranks the single-accent rule.
- `--travel` / `--food` / `--friends` are analogy-domain tags. Same exemption. Never used for
  process state (SPEC §5.3).

Restyle these to sit harmoniously inside the Apple palette — desaturate toward its restraint —
but do not collapse them into blue.

### 0.3 Mono is a third role Apple does not have

Apple's ladder is SF Pro Display + SF Pro Text. We need a third: **all numbers, process ids,
timings and matrix cells are monospace with `font-variant-numeric: tabular-nums`** (SPEC §5.3).

Pair **SF Mono → JetBrains Mono** as the open fallback. Keep it visually quiet — Apple's
restraint applies to it too.

### 0.4 Hover exists; the doc simply does not document it

Part 1's *"Never document hover"* is an instruction to that document's author, not a prohibition.
Interactive controls in this app **must** have hover affordances alongside the documented
`transform: scale(0.95)` active state. Keyboard `:focus-visible` remains mandatory (SPEC §8).

### 0.5 What to take wholesale

Adopt without modification: the type scale and its negative tracking, 17px body, the
300/400/600/700 weight ladder with 500 absent, the radius grammar, the one-shadow rule
(product-shadow only — and in this project the **only** thing that earns it is the animation
canvas resting on its surface), surface-colour-change-as-divider, `scale(0.95)` on press,
Action Blue as the sole interactive colour, and the frosted sticky bar treatment — which is
exactly right for the unit transport bar.

---

# PART 1 — The design language

## Overview

Apple's web presence is a masterclass in **reverent product photography framed by near-invisible UI**. Every page is a stack of edge-to-edge product "tiles" — alternating light and dark canvases, each centered on a hero headline, a one-line tagline, two tiny blue pill CTAs, and an impossibly crisp product render. Nothing competes with the product. Typography is confident but quiet; color is either pure white, an off-white parchment, or a near-black tile; interactive elements are a single, quiet blue.

Density is unusually low even by contemporary SaaS standards. Each tile occupies roughly one viewport, and there is no decorative chrome — no borders, no gradients, no decorative frames, no shadows on headlines. Elevation appears only when a product image rests on a surface (a single soft `rgba(0, 0, 0, 0.22) 3px 5px 30px` drop for visual weight). The result is a catalog that feels more like a museum gallery: the wall disappears and the artifact takes over.

**Key Characteristics:**
- Photography-first presentation; UI recedes so the product can speak.
- Alternating full-bleed tile sections: white/parchment ↔ near-black, with the color change itself acting as the section divider.
- Single blue accent (`{colors.primary}` — #0066cc) carries every interactive element. No second brand color exists.
- Two button grammars: tiny blue pill CTAs (`{rounded.pill}`) and compact utility rects (`{rounded.sm}`).
- SF Pro Display + SF Pro Text — negative letter-spacing at display sizes for the signature "Apple tight" headline feel.
- Whisper-soft elevation used only when a product image needs to breathe — exactly one drop-shadow in the entire system.
- Tight two-row nav: slim `{component.global-nav}` + product-specific `{component.sub-nav-frosted}` with persistent right-aligned primary CTA.
- Section rhythm: light hero → dark product tile → light utility tile → dark tile → parchment footer — a predictable pulse.

## Colors

### Brand & Accent
- **Action Blue** (`{colors.primary}` — #0066cc): The single brand-level interactive color. All text links, all blue pill CTAs, and the focus ring root.
- **Focus Blue** (`{colors.primary-focus}` — #0071e3): Marginally brighter sibling, reserved for the keyboard focus ring (`outline: 2px solid`).
- **Sky Link Blue** (`{colors.primary-on-dark}` — #2997ff): Brighter blue for dark surfaces, where Action Blue would disappear.

### Surface
- **Pure White** (`{colors.canvas}` — #ffffff): The dominant canvas.
- **Parchment** (`{colors.canvas-parchment}` — #f5f5f7): The signature Apple off-white. Alternating light tiles, footer region.
- **Pearl Button** (`{colors.surface-pearl}` — #fafafc): Fill for secondary "ghost" buttons.
- **Near-Black Tile 1** (`{colors.surface-tile-1}` — #272729): Primary dark-tile surface.
- **Near-Black Tile 2** (`{colors.surface-tile-2}` — #2a2a2c): Micro-step lighter, for adjacent dark tiles.
- **Near-Black Tile 3** (`{colors.surface-tile-3}` — #252527): Micro-step darker, bottom of stack and player frames.
- **Pure Black** (`{colors.surface-black}` — #000000): True void — global nav bar, video backgrounds.
- **Translucent Chip Gray** (`{colors.surface-chip-translucent}` — #d2d2d7): Applied at ~64% alpha as `rgba(210, 210, 215, 0.64)`.

### Text
- **Near-Black Ink** (`{colors.ink}` — #1d1d1f): Every headline and body paragraph. Not pure black — keeps the page photographic rather than printed.
- **Body On Dark** (`{colors.body-on-dark}` — #ffffff)
- **Body Muted** (`{colors.body-muted}` — #cccccc): Secondary copy on dark tiles.
- **Ink Muted 80** (`{colors.ink-muted-80}` — #333333)
- **Ink Muted 48** (`{colors.ink-muted-48}` — #7a7a7a): Disabled text and legal fine-print.

### Hairlines & Borders
- **Divider Soft** (`{colors.divider-soft}` — #f0f0f0): Often applied as `rgba(0, 0, 0, 0.04)`.
- **Hairline** (`{colors.hairline}` — #e0e0e0): 1px hairline on utility cards.

### Brand Gradient
**No decorative gradients.** Apple is the rare luxury-brand site with zero gradient-based design tokens. Atmospheric depth is inherent to imagery, never a CSS overlay.

## Typography

### Font Family
- **Display**: `SF Pro Display, system-ui, -apple-system, sans-serif` — for sizes ≥ 19px.
- **Body / UI**: `SF Pro Text, system-ui, -apple-system, sans-serif` — body, captions, buttons, links below 20px.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 56px | 600 | 1.07 | -0.28px | Hero headline |
| `{typography.display-lg}` | 40px | 600 | 1.10 | 0 | Tile headlines |
| `{typography.display-md}` | 34px | 600 | 1.47 | -0.374px | Section heads |
| `{typography.lead}` | 28px | 400 | 1.14 | 0.196px | Tile subcopy |
| `{typography.lead-airy}` | 24px | 300 | 1.5 | 0 | Lead paragraphs (rare weight 300) |
| `{typography.tagline}` | 21px | 600 | 1.19 | 0.231px | Sub-tile tagline; sub-nav category |
| `{typography.body-strong}` | 17px | 600 | 1.24 | -0.374px | Inline strong emphasis |
| `{typography.body}` | 17px | 400 | 1.47 | -0.374px | Default paragraph |
| `{typography.dense-link}` | 17px | 400 | 2.41 | 0 | Footer / utility link lists |
| `{typography.caption}` | 14px | 400 | 1.43 | -0.224px | Secondary captions, button text |
| `{typography.caption-strong}` | 14px | 600 | 1.29 | -0.224px | Emphasized captions |
| `{typography.button-large}` | 18px | 300 | 1.0 | 0 | Hero CTAs (rare weight 300) |
| `{typography.button-utility}` | 14px | 400 | 1.29 | -0.224px | Utility/nav button labels |
| `{typography.fine-print}` | 12px | 400 | 1.0 | -0.12px | Fine-print, footer body |
| `{typography.micro-legal}` | 10px | 400 | 1.3 | -0.08px | Micro legal disclaimers |
| `{typography.nav-link}` | 12px | 400 | 1.0 | -0.12px | Global nav menu items |

### Principles
- **Negative letter-spacing at display sizes.** Every headline 17px and up carries `-0.12 → -0.374px`. Never at 12px or below.
- **Body copy at 17px, not 16px.** Gives the page a "reading, not scanning" pace.
- **Weight 300 is real and rare.** Reserved for airy large-size reads.
- **Weight 600, not 700, for headlines.** 700 only for `{typography.tagline}` when more assertion is needed.
- **Line-height is context-specific.** Display 1.07–1.19, body 1.47, dense link stacks 2.41 (not a bug).
- **Weight 500 is deliberately absent.** The ladder is 300 / 400 / 600 / 700.

### Font Substitutes
SF Pro is proprietary. When building off-system:
- Use `system-ui, -apple-system, BlinkMacSystemFont` first — on macOS/iOS/Safari this resolves to real SF Pro.
- Elsewhere, **Inter** (Google Fonts, variable) is the closest open equivalent. Weight 600 with `font-feature-settings: "ss03"` approximates SF Pro's rounded "a".
- Nudge `letter-spacing` down by `-0.01em` at display sizes; Inter runs slightly wider.
- Tighten body line-height by `0.03` (1.47 → 1.44); Inter's taller x-height needs less leading.

## Layout

### Spacing System
- **Base unit:** 8px. Structural layout snaps to 8/12/16/20/24.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 17px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section vertical padding:** 80px inside a tile; tiles stack edge-to-edge with 0 gap.
- **Card padding:** 24px. **Button padding:** 8–11px vertical, 15–22px horizontal.

### Grid & Container
- **Max content width:** ~980px text-heavy, ~1440px grids, full-bleed for tiles.
- **Gutters:** 20–24px between cards.

### Whitespace Philosophy
Whitespace is the product's pedestal. At least 64px of air above a tile headline, 48–64px below. The footer is the deliberate exception — dense, to expose the full information architecture.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Full-bleed tiles, nav, footer |
| Soft hairline | 1px `rgba(0, 0, 0, 0.08)` | Utility cards, sub-nav separator |
| Backdrop blur | `blur(N)` on Parchment 80% | Sub-nav, floating sticky bar |
| Product shadow | `rgba(0, 0, 0, 0.22) 3px 5px 30px 0` | The only true shadow in the system |

**Shadow philosophy.** Exactly one drop-shadow, applied to product imagery — never cards, buttons, or text. UI elevation comes from surface-colour change and backdrop-blur.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed tiles |
| `{rounded.xs}` | 5px | Inline chips (rare) |
| `{rounded.sm}` | 8px | Dark utility buttons, inline card imagery |
| `{rounded.md}` | 11px | Pearl Button capsules |
| `{rounded.lg}` | 18px | Utility cards, grid cards |
| `{rounded.pill}` | 9999px | Primary blue CTAs, option chips, search input — the signature Apple pill |
| `{rounded.full}` | 50% | Circular control chips over photography |

## Components

**`global-nav`** — Persistent ultra-thin bar. `{colors.surface-black}`, height 44px, `{typography.nav-link}` (12px/400/-0.12px). Links ~20px apart. Collapses to hamburger at ~834px.

**`sub-nav-frosted`** — Sticks below global nav. `{colors.canvas-parchment}` at 80% with backdrop-filter blur. Height 52px. Left: category name in `{typography.tagline}`. Right: inline links in `{typography.button-utility}` ending in a persistent primary CTA.

**`button-primary`** — `{colors.primary}` fill, `{typography.body}` (17px/400), `{rounded.pill}`, padding 11px × 22px. The full-pill radius IS the brand action signal. Active: `transform: scale(0.95)`. Focus: 2px solid `{colors.primary-focus}`.

**`button-secondary-pill`** — Transparent fill, `{colors.primary}` text and 1px border, `{rounded.pill}`, padding 11px × 22px. A "ghost pill."

**`button-dark-utility`** — `{colors.ink}` fill, `{typography.button-utility}`, `{rounded.sm}`, padding 8px × 15px.

**`button-pearl-capsule`** — `{colors.surface-pearl}` fill, `{colors.ink-muted-80}` text, `{typography.caption}`, 3px `{colors.divider-soft}` border as a soft ring, `{rounded.md}`, padding 8px × 14px.

**`button-icon-circular`** — 44 × 44px, `rgba(210,210,215,0.64)`, `{rounded.full}`. Carousel and in-image controls.

**`text-link`** — `{colors.primary}`. **`text-link-on-dark`** — `{colors.primary-on-dark}`.

**`product-tile-light`** — Full-bleed white, `{colors.ink}` text, `{rounded.none}`, 80px vertical padding. Centered stack: headline `{typography.display-lg}` → tagline `{typography.lead}` → two CTAs → product render with the system shadow.

**`product-tile-parchment`** — As above on `{colors.canvas-parchment}`, to break two consecutive white tiles.

**`product-tile-dark`** / **`-dark-2`** / **`-dark-3`** — Same structure on `{colors.surface-tile-1/2/3}`, using `{component.text-link-on-dark}` for inline copy.

**`store-utility-card`** — White fill, 1px `{colors.hairline}`, `{rounded.lg}`, padding 24px. Image at `{rounded.sm}`, then name in `{typography.body-strong}`, detail in `{typography.body}`, then a `{component.text-link}`. No card shadow.

**`configurator-option-chip`** — White fill, `{typography.caption}`, `{rounded.pill}`, padding 12px × 16px. Selected state: 2px solid `{colors.primary-focus}`.

**`floating-sticky-bar`** — Bottom of viewport. `{colors.canvas-parchment}` at 80% with backdrop blur, height 64px, padding 12px × 32px. Left: status in `{typography.body}`. Right: primary CTA.

**`search-input`** — White fill, `{typography.body}`, 1px `rgba(0,0,0,0.08)`, `{rounded.pill}`, padding 12px × 20px, height 44px.

**`footer`** — `{colors.canvas-parchment}`, link columns in `{typography.dense-link}` (2.41 leading is what makes dense columns scannable), headings in `{typography.caption-strong}`, legal row in `{typography.fine-print}` with `{colors.ink-muted-48}`. 64px vertical padding.

## Do's and Don'ts

### Do
- Use `{colors.primary}` for every interactive element and nothing else.
- Set headlines with negative letter-spacing (`-0.28 → -0.374px`).
- Run body copy at 17px / 400 / 1.47 / -0.374px — not 16px.
- Alternate light/parchment and dark tiles for section rhythm. The colour change IS the divider.
- Reserve `{rounded.pill}` for anything that should read as an action.
- Apply the single product-shadow only to imagery resting on a surface.
- Use `transform: scale(0.95)` as the press state on every button.
- Keep the global nav true black.

### Don't
- Don't introduce a second **interactive** accent colour.
- Don't add shadows to cards, buttons, or text.
- Don't use gradients as decorative backgrounds.
- Don't set body copy at weight 500 — the ladder is 300/400/600/700.
- Don't round full-bleed tiles.
- Don't tighten body line-height below 1.47.
- Don't mix radii grammars.
- Don't use Sky Link Blue on light surfaces.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Small phone | ≤ 419px | Single column; hero drops to 28px |
| Phone | 420–640px | Single column; hero 34px |
| Large phone | 641–735px | Tighter padding (48px vs 80px) |
| Tablet portrait | 736–833px | Nav collapses to hamburger |
| Tablet landscape | 834–1023px | Nav returns; 3-col grids → 2-col |
| Small desktop | 1024–1068px | Hero stays 40px |
| Desktop | 1069–1440px | Full layout; 1440px content max |
| Wide desktop | ≥ 1441px | Content locks at 1440px |

Structural breakpoints that matter: 1440 (content lock), 1068, 833, 734, 640, 480.

### Touch Targets
Minimum 44 × 44px. Circular icon buttons are exactly 44 × 44px.

### Collapsing Strategy
- Global nav → hamburger at 834px.
- Sub-nav → category name + primary CTA only on mobile.
- Utility grids: 5 → 4 (1440) → 3 (1068) → 2 (834) → 1 (640).
- Hero type: 56px → 40px (1068) → 34px (640) → 28px (419).

## Iteration Guide
1. Focus on ONE component at a time; reference its key directly.
2. Variants (`-active`, `-focus`, `-2`) live as separate entries.
3. Use token refs everywhere — never inline hex.
4. Display headlines stay 600 with negative tracking; body stays 400 at 17px. The boundary is unbreakable.
5. The single drop-shadow is reserved for imagery only.
6. When in doubt about emphasis: alternate surface before adding chrome.
