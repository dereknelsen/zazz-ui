---
version: alpha
name: zazz-design
description: Zazz combines editorial typography with emotive imagery to create web applications and B2B, wholesale, and retail experiences that feel trustworthy, brand-authentic, and premium without pretension.
colorMode: light dark

colors:
  # No defaults ship — author every value from the brand (see Brand Customization below).
  # Values are OKLCH — the authoritative token format (HEX is imprecise for our scales).
  # Theme (author light-mode values; dark mode swaps automatically)
  background:
  foreground:
  border:
  border-foreground:
  card:
  card-foreground:
  popover:
  popover-foreground:
  input:
  input-foreground:

  # Overlay
  muted:
  muted-foreground:
  faded:
  faded-foreground:

  # Brand
  primary:
  primary-foreground:
  secondary:
  secondary-foreground:
  tertiary:
  tertiary-foreground:

  # Status — conventional hues (blue / green / amber / red) are fine when the brand has no equivalent
  info:
  info-foreground:
  success:
  success-foreground:
  warning:
  warning-foreground:
  destructive:
  destructive-foreground:

typography:
  # Font families are intentionally unspecified — set them in `fonts` below from the brand.
  # The size / weight / leading / tracking scale is structural — keep it.
  display:
    fontSize: 5.96rem
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.05em
  h1:
    fontSize: 4.77rem
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.05em
  h2:
    fontSize: 3.81rem
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.025em
  h3:
    fontSize: 3.05rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.025em
  h4:
    fontSize: 2.44rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.015em
  h5:
    fontSize: 1.95rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.01em
  h6:
    fontSize: 1.56rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.005em
  body-xl:
    fontSize: 1.56rem
    fontWeight: 400
    lineHeight: 1.5
  body-lg:
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.5
  body-xs:
    fontSize: 0.64rem
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontSize: 0.58rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.1em
  mono:
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6

spacing:
  # Semantic scale only — px + xs–xl. No numeric step scale.
  px: 1px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 44px
  xl: 96px

rounded:
  # Roundness is unspecified — author the scale from the brand (full stays pill).
  xs:
  sm:
  md:
  lg:
  xl:
  full: 9999px

components:
  # Variants below match the shipped `data-variant` values (no attribute = default).
  button-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  button-muted:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  button-link:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: 0px
    padding: 0px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-inverted:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.faded-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.input-foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  # Badge ships primary/muted/ghost/link only — no destructive or status variants.
  # Status badges (info/success/warning/destructive) are an instance override, e.g.
  # style="--badge-background: var(--success); --badge-foreground: var(--success-foreground)".
  badge:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-muted:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: 8px
  badge-link:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: 0px
    padding: 0px

fonts:
  # Unspecified — author from the brand's real typefaces (never default to generic system fonts).
  body:
  heading:
  mono:
roundness:
---

> **🎨 CRITICAL: Brand Customization**
>
> The token frontmatter above ships **intentionally blank** — no default colors, fonts, or roundness.
> Fill it from the brand before generating anything. (The semantic spacing scale and the type
> size/weight/leading/tracking scale are structural — leave them as-is.)
>
> When a URL or brand instructions are provided alongside this file:
>
> 1. **Fetch the website** — extract the brand's color palette, logo, imagery style, and visual identity
> 2. **Fill the YAML frontmatter** — author `colors`, `fonts`, `rounded`, and `roundness` to match the brand as precisely as reasonable
> 3. **Include the logo** in the header and footer of generated designs
> 4. **Adapt the archetype** — choose the site archetype (below) that best fits the brand's market position
>
> Generate OKLCH color scales using [Tints.dev](https://www.tints.dev) from extracted brand hex values. Default theme bindings: primary/secondary use step 600 (light) / 500 (dark); tertiary uses 500 / 400.

# Design System: Zazz Design System

## 1. Visual Theme & Atmosphere

A conversion-focused eCommerce system for B2B, wholesale, and retail frontends. The aesthetic balances clean commerce mechanics with emotive brand storytelling — editorial serif-italic accents in typography elevate product narratives while surfaces stay clean and product-forward.

Light mode feels like a premium catalog: crisp surfaces with photographic warmth. Dark mode maintains trustworthy character with deeper tones. Typography mixes clean sans-serif body copy with italic serif display words for emphasis ("_quality_", "_value_", "_trusted_") — an editorial cadence that elevates products into brand storytelling.

### Site Archetypes

| Archetype                  | Character                                                                                                       | Typical Clients                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Industrial Distributor** | Function-first, catalog-dense, account-gated. Prominent search, minimal atmosphere. Speed and clarity dominate. | Packaging, safety, industrial supplies, janitorial, electrical |
| **Lifestyle Brand**        | Balanced — product-forward with brand storytelling. Carousels, seasonal collections, aspirational photography.  | Lighting, furniture, home goods, apparel, building materials   |
| **Editorial Studio**       | Gallery-like, story-driven, generous whitespace. Video heroes, craft narratives, asymmetric layouts.            | Artisan goods, luxury, design-forward manufacturers            |

Default to **Lifestyle Brand** when unclear — it balances conversion with brand investment. Most B2B clients fall between Distributor and Lifestyle.

### Design with Intention

The token contract in the frontmatter is what lets you be bold without the result turning to mush. Before generating a screen, commit to a clear aesthetic direction and execute it precisely — **intentionality, not intensity, is the bar.** Refined minimalism and expressive maximalism both win when they're deliberate. First decide: who uses this and to do what, which archetype fits, and the one thing a visitor will remember. Let those answers set density, imagery, and rhythm before placing a single section. Every generation should feel designed for _this_ brand — never converge on the same template, font, or palette twice.

### Design Guidelines

**Creative ambition** — bring a point of view:

- **Commit to a direction** — one cohesive, opinionated aesthetic true to the brand, not a safe average. Vary between light and dark, different type pairings, different atmospheres across generations.
- **Distinctive typography** — pair the brand's sans with a classic serif italic (Playfair Display Italic, Cormorant Garamond Italic) on emphasis words ("_quality_", "_trusted_") for editorial cadence, and use the full scale for real hierarchy: a genuine `text-display`/`text-h1` moment against calm body copy, not five near-identical sizes. Always adopt the brand's real typefaces — never default to generic system fonts.
- **Commit to the palette** — a dominant surface with sharp brand accents reads as _designed_; timid, evenly-distributed grays read as slop. The frontmatter ships no default palette — fill it from the brand and make its colors the point.
- **Compose with tension** — break the centered stack. Play full-bleed imagery against capped text columns, use the left-label layout, overlap layers, and let section rhythm (`--gap-xl`, 96px) open real negative space. Asymmetry and generous whitespace are choices, not accidents.
- **Build atmosphere, not flat fills** — layer depth from tokens: gradient washes across a brand scale (`--primary-600` → `--primary-900`), `shade`/`tint` transparencies, subtle noise/grain, decorative `--border` rules, and emotive photography. (Keep surfaces flat and reserve `--shadow-*` for genuine elevation — atmosphere lives in the background, not on every card.)
- **Spend motion where it counts** — one orchestrated page-load with staggered reveals delights more than scattered micro-interactions. Use `--spring-easing` / `--spring-duration` for confident, unhurried movement and scroll reveals for narrative pacing.
- **Balance conversion mechanics with brand storytelling** — clear CTAs and product grids alongside testimonials, messaging, and premium photography.

**Discipline** — keeps it consistent:

- **Never use generic AI aesthetics** — no cold tech minimalism, cliched startup palettes, sterile layouts, or the lazy violet-gradient-on-white centered hero. Designs must feel unique to the brand.
- **Use Zazz tokens exclusively** — never hardcode colors, spacing, radii, shadows, or typography. Use `var(--token-name)`.
- **Typography via `text-*` classes** — never compose type from individual size/weight/leading utilities.
- **Spacing via `--gap-*` semantic scale** — never use arbitrary px/rem values.
- **Dark mode for free** — role tokens auto-swap; never write separate dark-mode overrides for token-handled values.

---

## 2. Color Palette & Roles

### Theme (Mode-Aware Role Tokens)

| Token                  | Role                                          | Light Character              | Dark Character              |
| ---------------------- | --------------------------------------------- | ---------------------------- | --------------------------- |
| `--background`         | Page surface                                  | White / warm off-white       | Near-black (brand-cast)     |
| `--foreground`         | Default text                                  | Rich charcoal (neutral-900)  | Pure white                  |
| `--border`             | 1px lines and dividers                        | Soft cool gray (neutral-100) | Deep gray                   |
| `--border-foreground`  | Text on outlined/bordered elements            | Near-opaque white (tint-950) | Subtle white (tint-100)     |
| `--card`               | Card surface, elevated from background        | Pure white                   | Dark charcoal               |
| `--card-foreground`    | Text on cards                                 | Rich charcoal                | Pure white                  |
| `--popover`            | Popover / menu surface                        | Pure white                   | Near-black (shade-950)      |
| `--popover-foreground` | Text on popovers and menus                    | Rich charcoal                | Pure white                  |
| `--input`              | Input field background                        | Near-white (neutral-50)      | Barely-there tint (tint-50) |
| `--input-foreground`   | Input text                                    | Rich charcoal                | Pure white                  |
| `--muted`              | Subtle dim — always darker than its surface   | shade-50                     | tint-50                     |
| `--muted-foreground`   | De-emphasized text, helper copy               | shade-600                    | tint-600                    |
| `--faded`              | Subtle fade — always lighter than its surface | tint-100                     | shade-100                   |
| `--faded-foreground`   | Text on faded surfaces                        | tint-600                     | shade-600                   |

### Brand Colors

| Token         | Role                  | Character                                   |
| ------------- | --------------------- | ------------------------------------------- |
| `--primary`   | Dominant brand anchor | Author from the brand's primary color       |
| `--secondary` | Complementary accent  | Author from a supporting brand color        |
| `--tertiary`  | Third accent          | Author from a third brand color (or derive) |

No brand colors ship by default — author all three from the brand (see the Brand Customization
callout). Brand foregrounds are typically white. Bind step **600** (light) / **500** (dark), brand
steps **lighter** in dark mode, and generate a full 50–950 OKLCH scale per color via
[Tints.dev](https://www.tints.dev).

Key scale steps for context:

- **-100**: Subtle background tint for sections
- **-500**: Vivid mid-tone (dark mode default)
- **-600**: Deep saturated (light mode default)
- **-900**: Near-black for deep accent panels

### Grayscale (Neutrals)

A full `--neutral-50` through `--neutral-950` scale — author it from the brand, ideally carrying a
subtle cast of the brand hue rather than pure gray. Generate the scale via [Tints.dev](https://www.tints.dev).

### Overlays

- **Shade** (`--shade-50` through `--shade-950`): Alpha-based dim derived from neutral-950. Use for backdrops and darkening. `--shade-900` for modal backdrops (not `--muted`).
- **Tint** (`--tint-50` through `--tint-950`): Alpha-based fade derived from white. Use for lightening over dark surfaces.

### Status Colors

| Token           | Character                                 |
| --------------- | ----------------------------------------- |
| `--info`        | Cerulean blue — informational notices     |
| `--success`     | Teal green — positive confirmations       |
| `--warning`     | Amber gold — cautionary alerts            |
| `--destructive` | Vivid red-orange — errors, danger actions |

All status foregrounds are white. Status steps **darker** in dark mode (opposite of brand).

---

## 3. Typography Rules

### Font Families

No font families ship by default — author all three from the brand's real typefaces (with a
sensible web-safe fallback stack). Never default to generic system fonts.

| Token                   | Role               |
| ----------------------- | ------------------ |
| `--font-family-body`    | Body copy, UI text |
| `--font-family-heading` | Headings, display  |
| `--font-family-mono`    | Code, tabular data |

### Weights

| Token                   | Value | Usage                       |
| ----------------------- | ----- | --------------------------- |
| `--font-weight-body`    | 400   | All body text               |
| `--font-weight-heading` | 600   | All headings, display       |
| `--font-weight-strong`  | 500   | Bold/strong inline emphasis |
| `--font-weight-eyebrow` | 600   | Eyebrow labels              |

### Type Scale

All sizes are fluid via `clamp()`, scaling between mobile and desktop viewports.

| Class          | Size (desktop) | Leading | Tracking | Character                     |
| -------------- | -------------- | ------- | -------- | ----------------------------- |
| `text-display` | 5.96rem        | 0.95    | -0.05em  | Massive hero statement        |
| `text-h1`      | 4.77rem        | 0.95    | -0.05em  | Primary page heading          |
| `text-h2`      | 3.81rem        | 0.95    | -0.025em | Section heading               |
| `text-h3`      | 3.05rem        | 1       | -0.025em | Subsection heading            |
| `text-h4`      | 2.44rem        | 1       | -0.015em | Component heading             |
| `text-h5`      | 1.95rem        | 1       | -0.01em  | Small heading                 |
| `text-h6`      | 1.56rem        | 1       | -0.005em | Minor heading                 |
| `text-xl`      | 1.56rem        | 1.5     | 0        | Large body / intro paragraph  |
| `text-lg`      | 1.25rem        | 1.5     | 0        | Lead text                     |
| `text-md`      | 1rem           | 1.6     | 0        | Default body text             |
| `text-sm`      | 0.8rem         | 1.5     | 0        | Small UI labels               |
| `text-xs`      | 0.64rem        | 1.5     | 0        | Captions, fine print          |
| `text-eyebrow` | 0.58rem        | 1.2     | 0.1em    | Uppercase label, wide-tracked |

Headings use `text-wrap: balance`. Body uses `text-wrap: pretty`. Tight-leading on large text, generous-leading on body.

### Text Link

`.text-link` — `--primary` color, 1px underline, offset lifts on hover.

---

## 4. Component Stylings

**Two conventions:**

- **Variants are data attributes:** `class="button" data-variant="primary"` — never `button-primary`.
- **Theming via local custom properties:** Components declare `--button-background`, `--button-radius`, etc. off theme roles. Variants re-point those locals.

### Buttons

Subtly rounded (`--radius-md`, ~10px). Fixed height (`--step-8`). Variants (via `data-variant`): **default** (no attribute — bordered, `--card`), **primary** (solid `--primary`), **muted** (`--muted` fill), **ghost** (transparent, hover reveals `--muted`), **destructive** (solid `--destructive`), **link** (inline, underlined). Sizes (via `data-size`): `sm`, `icon`, `icon-sm`.

### Badges

Gently rounded chips (`--radius-sm`, ~6px). Height `--step-5_5`. Variants (via `data-variant`): `default`, `primary`, `muted`, `ghost`, `link` — note badge has **no** `destructive` variant. Size: `icon`. `--font-size-xs`, `--font-weight-strong`.

### Dialog

Native `<dialog>` via Invoker Commands API. `--card` surface, `--shadow-md`, `--radius-lg`. Backdrop: `--shade-900`. Sizes (via `data-size`): `article` (default width), `container`, `screen`.

### Dropdown & Navigation Menu

Popover API + CSS anchor positioning. Native light-dismiss. Dropdown items are `.button[data-variant="ghost"]`. Navigation menu supports mega-panels with a `__viewport` grid and rich `__link` rows (title + description); callouts are built from utilities (e.g. `bg-muted rounded-sm p-sm` + `.text-eyebrow`).

### Tabs

CSS-first grouped radio inputs wrapped in `<tab-group>`. Segmented control with sliding card pill indicator. Panel order must match radio order. The element adds orientation-aware arrow keys, Home/End, and wrap-around; radios still work without JS.

### Cards (composition pattern)

`--card` / `--card-foreground`, `1px solid var(--border)`, `--radius-lg`. Padding: `--gap-md`. Figure: `--radius-md`, aspect 3/2.

### Forms

Shared `--field-*` tokens unify `.input`, `.textarea`, `.select`, `.input-group`, `.password-group`. Validation via `:user-invalid` (surfaces after blur/submit, never while typing). `.field` wrapper for label/control/hint/error layout. Password visibility uses `<input-password>` around `.password-group`; checkbox, switch, and radio are restyled native inputs.

---

## 5. Layout Principles

### Container bands

| Markup                               | Result                                                         | Purpose                    |
| ------------------------------------ | -------------------------------------------------------------- | -------------------------- |
| `.container`                         | Subgrid band system; children land in the `md` band by default | Full-width content wrapper |
| `.container[data-variant="article"]` | Centered reading width (`--article-lg` 70ch by default)        | Reading-width content      |

`.container` is a subgrid spanning its region; each direct child drops into a band (`xs sm md lg xl`
cap + center at that breakpoint, `full` = region minus gutters, `bleed` = edge to edge). Set the band
per child with `data-container="…"`, or the default for all children with `data-container="…"`
on the container. No wrapper div needed. See `references/tokens.md` §7 for the full model.

### Spacing

| Token      | Computed | Use For                                |
| ---------- | -------- | -------------------------------------- |
| `--gap-xs` | 8px      | Tight grouping, button rows            |
| `--gap-sm` | 16px     | Default component gap, gutters         |
| `--gap-md` | 24px     | Card padding, section internal spacing |
| `--gap-lg` | 44px     | Large component separation             |
| `--gap-xl` | 96px     | Section-level vertical rhythm          |

Utility classes: `.gap-*`, `.p-*`, `.px-*`, `.py-*`, `.m-*`, `.mx-*`, `.my-*` at each size (xs/sm/md/lg/xl).

_Values shown throughout (spacing, radius, type sizes) are **desktop maximums**. Spacing and radius derive from `--spacing-interval` (`clamp(0.225rem, …, 0.25rem)`) and type from per-step `clamp()`s, so all three scale down fluidly on narrower viewports._

### Radius

| Token           | Computed    | Use For            |
| --------------- | ----------- | ------------------ |
| `--radius-none` | 0           | Sharp edges        |
| `--radius-xs`   | ~4px        | Subtle softening   |
| `--radius-sm`   | ~6px        | Badges             |
| `--radius-md`   | ~10px       | Buttons, inputs    |
| `--radius-lg`   | ~20px       | Cards, dialogs     |
| `--radius-xl`   | ~28px       | Statement surfaces |
| `--radius-full` | Pill-shaped | Circular/capsular  |

Utility classes: `rounded-0` through `rounded-xl`, `rounded-full`.

### Shadows & Elevation

Whisper-soft, multi-layered diffused shadows. Surfaces are flat by default — shadow is applied intentionally.

| Token         | Character                          |
| ------------- | ---------------------------------- |
| `none`        | Flat                               |
| `--shadow-xs` | Barely perceptible resting shadow  |
| `--shadow-sm` | Gentle lift                        |
| `--shadow-md` | Clear elevation (modals, popovers) |
| `--shadow-lg` | Strong floating presence           |
| `--shadow-xl` | Maximum drama (overlay-level)      |

### Focus Ring

Box-shadow-based, Tailwind/shadcn-compatible: `--ring` (color, = `--primary` at `--ring-opacity`), `--ring-width` (2px), `--ring-offset-width` (1px), `--ring-offset-color` (= `--background`), composed via `--ring-offset-shadow` + `--ring-shadow` (`--shadow-ring`). Components keep a same-geometry transparent outline (`--outline-*`) so forced-colors/high-contrast modes still show focus.

### Animation

Spring easing (`--spring-easing`) with 0.333s duration. Fallback: `cubic-bezier(0.17, 0.84, 0.44, 1)`.

### Section Layout Patterns

- **Left-Label Layout**: Thin left column (eyebrow label, `--muted-foreground`) + right content column, separated by `--border`. Collapses to stacked on mobile.
- **Horizontal Rule Dividers**: `1px solid var(--border)` as lightweight section separators.
- **Tabbed Content Areas**: Tab bar revealing different content panes. Good for 3-7 product families.

### Breakpoints

`--breakpoint-xs` (640px) · `--breakpoint-sm` (768px) · `--breakpoint-md` (1024px) · `--breakpoint-lg` (1280px) · `--breakpoint-xl` (1536px)

---

## 6. Design Patterns

See [`PATTERNS.md`](PATTERNS.md) for page-level structure and house style. It currently covers:

- **Sentence case everywhere** — the default for all UI text unless the user asks otherwise
- **Page structure** — header (logo + desktop/mobile nav), `<main>` sections, footer
- **Heading group with CTAs** — eyebrow + heading + subheading + action buttons

Most other patterns fall out of the primitives and components directly (browse them at
`/docs/components`). A broader section library (hero variants, product grids, trust signals)
and whole **page-type outlines** (eCommerce landing, PLP, PDP, cart, checkout, account, B2B
quote) keyed to the archetypes are a planned future addition.
