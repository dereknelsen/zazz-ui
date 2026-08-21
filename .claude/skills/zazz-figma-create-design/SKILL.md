---
name: zazz-figma-create-design
description: >-
  Design UI with the Zazz design system in Figma or any designer AI tool. Use whenever you
  create or edit frames, components, variables, or styles that should look like Zazz: buttons,
  badges, cards, dialogs, dropdowns, tooltips, tabs, accordions, carousels, forms, navigation,
  heroes, and sections — plus any theming, dark-mode, spacing/typography/color, or "make it
  on-brand" work. Zazz is token-driven (bind values to variables/styles), variant-driven
  (exact variant names), and sentence-case by house rule. Start here before hand-styling
  anything.
---

# Zazz design system — for designers

Zazz is a conversion-focused commerce design system for B2B, wholesale, and retail frontends: clean, product-forward surfaces with editorial typography. Designs will be translated into code by another AI, so every color, type size, spacing, and radius must map to a value below — never invent off-scale values. This spec is the source of truth; when the [Zazz Figma community library](https://www.figma.com/community/file/1468718708506413296/zazz-v0-4-4) disagrees, this spec wins.

## Core rules

- **Never hardcode.** Bind every color, size, radius, and type choice to a variable or style where the tool supports them (Figma: variables + text/effect styles); otherwise use the exact values below.
- **Semantic first.** Use a role (`primary`, `muted-foreground`, `gap-md`) before a raw scale step (`primary-600`). Roles carry light/dark for free.
- **One dark mode.** Light and dark are the same roles with swapped values (Figma: two modes on the theme collection). Never design dark mode as a separate palette or duplicate frames. A deliberately dark design is fine — it simply uses the roles' dark values as its resting theme.
- **Exact variant names.** Component variants use the system's names (`default`, `primary`, `ghost`, `sm`) — never invent names like "Button/Primary".
- **Sentence case everywhere** — headings, buttons, links, labels, nav, placeholders ("Add to cart", not "Add To Cart"). Never Title Case or ALL CAPS; eyebrow labels are the only uppercase, and that comes from the style, not the typing.

## Color

Build the palette as roles, each with a light and dark value. Generate 50–950 scales from brand seeds via [tints.dev](https://www.tints.dev); layers bind to roles, never raw scale steps.

- **Surfaces** — `background` (white / neutral-900), `card` and `popover` (white / neutral-950), `input` (neutral-50 / tint-50).
- **Text** — `foreground` (neutral-900 / white); every surface has a paired `*-foreground` — always use the pair.
- **Lines** — `border` (neutral-100 / tint-100), always 1px.
- **De-emphasis** — `muted` (shade-50 / tint-50) dims; `muted-foreground` (shade-600 / tint-600) for helper text; `faded` (tint-100 / shade-100) lightens.
- **Overlays** — `shade` = black at 5–95% alpha (darkens; dialog backdrops use shade-800), `tint` = white at 5–95% alpha (lightens over dark surfaces).
- **Brand** — `primary`, `secondary`, `tertiary`, plus a neutral scale. The seeds `primary` #4F46E5 (step 600 light / 500 dark), `secondary` #DE4917 (600 / 500), `tertiary` #E5375B (500 / 400), neutral #888890 are **placeholder defaults** — when a brand is given, derive all brand roles from its colors instead and never ship these. Brand colors go lighter in dark mode; their text is white.
- **Status** — `info` cerulean blue, `success` teal green, `warning` amber gold, `destructive` red-orange. White text; status colors go darker in dark mode (opposite of brand).

## Typography

In Figma, these already exist as `typography/*` text styles — `headings/` text-display–text-h6 and text-eyebrow, `body/` text-xl–text-xs, `bold/` strong-\* for emphasized body text, `primitives/` text-button and text-badge. Apply the matching style to every text layer; never restyle text manually. Family: Geist (body + headings), Geist Mono (mono) — these are **fallback defaults only**. When a brand, brief, or prompt specifies typefaces, those always win; never default to Geist over a specified or brand typeface. The scale below (sizes, weights, leading, tracking) is structural and applies to whatever family is chosen. Sizes are desktop maximums; keep headings short.

| Style   | Size  | Weight | Leading | Tracking | Use                         |
| ------- | ----- | ------ | ------- | -------- | --------------------------- |
| Display | ~95px | 600    | 95%     | -5%      | Massive hero statement      |
| H1      | ~76px | 600    | 95%     | -5%      | Primary page heading        |
| H2      | ~61px | 600    | 95%     | -2.5%    | Section heading             |
| H3      | ~49px | 600    | 100%    | -2.5%    | Subsection heading          |
| H4      | ~39px | 600    | 100%    | -1.5%    | Component heading           |
| H5      | ~31px | 600    | 100%    | -1%      | Small heading               |
| H6      | ~25px | 600    | 100%    | -0.5%    | Minor heading               |
| Body XL | ~25px | 400    | 150%    | 0        | Intro / lead paragraph      |
| Body LG | 20px  | 400    | 150%    | 0        | Lead text                   |
| Body MD | 16px  | 400    | 160%    | 0        | Default body                |
| Body SM | ~13px | 400    | 150%    | 0        | Small UI labels, buttons    |
| Body XS | ~10px | 400    | 150%    | 0        | Captions, fine print        |
| Eyebrow | ~9px  | 600    | 120%    | +10%     | Label — uppercase via style |

Create real hierarchy — one big Display/H1 moment against calm body copy, not five near-identical sizes. Signature move: an italic serif accent (Playfair Display Italic, Cormorant Garamond Italic) on emphasis words in headings ("the art of _quality_"). Text links: `primary` color, 1px underline.

## Spacing

Only these values, applied as auto-layout gap and padding: **8 / 16 / 24 / 44 / 96px** (`gap-xs`–`gap-xl`). 96px for vertical rhythm between sections, 24px for card padding and within-section spacing, 16px default gaps and gutters, 8px tight groups like button rows. Fine component metrics stay on a 4px grid (e.g. 10px button padding).

## Radius, shadows, motion

- **Radius scale** — 0 / 4 / 6 / 10 / 20 / 28px / pill. Convention: 6px badges, 10px buttons and inputs, 20px cards and dialogs, 28px statement surfaces. Choose the brand's overall roundness, then stay on the scale.
- **Shadows** — surfaces are flat by default; apply elevation intentionally, always via the `shadows/*` effect styles (shadow-none through shadow-xl) — never a hand-tuned drop shadow. They're whisper-soft stacks of near-black at 1–6% opacity (reference `shadow-md`, for modals/popovers: Y3 blur6 @5% + Y11 blur11 @4% + Y24 blur14 @3% + Y42 blur17 @1%).
- **Motion** — springy easing, ~0.33s, unhurried. Spend it on one orchestrated staggered page-load reveal plus scroll reveals — not scattered micro-interactions.

## Layout

Content sits in centered capped bands, not a fixed grid: a full-width section frame (background spans the viewport) wrapping a centered content frame with 24px side gutters. Caps: **1280px** default page content, 1024px narrower content, ~70ch reading text, full-bleed for hero imagery. Play full-bleed imagery against capped text columns. Useful patterns: left-label sections (thin eyebrow column beside content, split by a 1px border), 1px hairline dividers, tabbed content areas. Breakpoints: 640 / 768 / 1024 / 1280 / 1536px.

## Components

In Figma, buttons, badges, avatars, form fields, cards, and dialogs already exist as components on the **❖ Primitives** page — place and override instances of them; never redraw one from rectangles. Build something from scratch (with variant properties named exactly as below, bound to the variables and styles above) only when no library component exists for it.

- **Button** — height 32px, 10px inline padding, 10px radius, Body SM at weight 500, 4px icon–label gap. Variants: `default` (card fill + 1px border), `primary` (solid primary, white text), `muted`, `ghost` (transparent, hover shows muted), `destructive`, `link` (inline, underlined, no padding). Sizes: `sm` (24px tall, 6px radius), `icon` (square), `icon-sm`.
- **Badge** — chip, ~22px tall, 8px padding, 6px radius, Body XS at weight 500. Variants: `default`, `primary`, `muted`, `ghost`, `link` — no destructive; apply status by overriding fill/text to a status role.
- **Card** — card surface, 1px border, 20px radius, 24px padding; card images 3:2 at 10px radius. `inverted` variant flips to a dark surface.
- **Form fields** — input fill, 1px border, 10px radius across input, textarea, select. Group control + label + hint + error together; error styling appears only after interaction, never in the resting state.
- **Dialog** — card surface, 20px radius, `shadow-md`, shade-800 backdrop.
- **Dropdown / menus** — popover surface; items look like ghost buttons.
- **Tabs** — segmented control with a sliding pill indicator.
- **Avatar** — circular, image with text fallback. **Breadcrumbs** — link buttons separated by a muted `/`, current crumb disabled.

## Patterns

- **Page structure** — header (logo + nav) → main sections → footer, each a full-width frame with a centered content frame inside. Sections own their vertical rhythm with 96px padding. Desktop nav is a row of ghost-button links; mobile collapses to a menu button.
- **Logo** — the logo is a component named exactly **`Logo`** on the **❖ Assets** page. Always place an instance of it; never substitute a placeholder box, drawn approximation, or plain text wordmark. If `Logo` genuinely doesn't exist on ❖ Assets, say so in the delivery report rather than silently faking one.
- **Heading group** — eyebrow + heading + subheading (Body XL in `muted-foreground`) + CTAs, stacked with 16px gap. Lead CTA is a `primary` button, secondary is `ghost`. Center on mobile, left-align on desktop.
- **Archetypes** — pick by brand: **Industrial Distributor** (function-first, catalog-dense, prominent search), **Lifestyle Brand** (product-forward with storytelling — the default), **Editorial Studio** (gallery-like, generous whitespace, story-driven). Never generic AI aesthetics — balance conversion mechanics with brand storytelling.
- **Brand customization** — given a URL or brand: pull its palette, logo, imagery style, and market position; regenerate the brand scales from its colors (roles update automatically); match fonts and roundness; place the logo in header and footer; choose the archetype.

## Variable manifest (required handoff)

Every design is followed by an apply pass where another AI updates the file's Figma variables to match it. Tell it exactly what to change: place a text layer named **`zazz:variables`** immediately to the right of the design frame, listing **every variable whose value this design changes** — one per line, in the file's variable paths:

```text
Corporate/primary/primary-600: #1A5632
Grayscale/neutral/neutral-50: #FBFBF9
Theme/base/background [Light]: neutral-50
Theme/brand/primary [Light]: primary-600
Typography/font-family/font-heading: Playfair Display
Radius/semantic/radius-md [Desktop]: step-2
Radius/primitives/radius-badge: radius-full
```

Format rules — the apply AI parses this literally, so keep it exact:

- One variable per line: `Collection/group/name: value`. Raw values as hex/px/string; alias values as the target variable's name.
- Add a mode in brackets (`[Light]`, `[Dark]`, `[Desktop]`, `[Mobile]`) when a line applies to one mode only; omit it when the value applies to all modes.
- List only variables that **differ** from the file's current values — an empty manifest means "no variable changes."
- Style it small and unobtrusive (mono, muted), outside the design frame — it's a handoff artifact, never part of the design.
- One manifest per design; multiple designs each get their own.

## Verification checklist

Before delivering, check the design against every item. Fix any failure and re-check.

- [ ] **System fit** — every color maps to a named role, every type size / spacing value / radius is on the Zazz scales, and everything is bound to a variable or style where the tool supports it. No off-scale or one-off values.
- [ ] **Spacing** — consistent 96px section rhythm, even padding, no elements cramped or touching edges, no stray gaps. Spacing errors are the most common failure — verify visually.
- [ ] **Text contrast** — every text/background pairing is clearly readable (WCAG AA: 4.5:1 body, 3:1 large headings) — especially text over images or gradients, muted text, and dark mode. Verify visually; don't assume role pairings are safe.
- [ ] **Instances & styles** — buttons, badges, avatars, form fields, cards, and dialogs are instances from ❖ Primitives; the logo is a `Logo` instance from ❖ Assets; every text layer has a `typography/*` style and every shadow a `shadows/*` style.
- [ ] **Pairs & names** — every surface uses its matching `*-foreground` text, and variant names match the system exactly.
- [ ] **Casing** — all UI text is sentence case; only eyebrow labels are uppercase.
- [ ] **Dark mode** — driven by role values swapping, not duplicate frames or a second palette.
- [ ] **Brand fit** — the design feels made for this brand: its real logo, typefaces, and colors, not a generic template.
- [ ] **Variable manifest** — a `zazz:variables` text layer sits beside the design, every line parses as `Collection/group/name [mode]: value`, and it covers every color, font, spacing, and radius decision the design changed — nothing the design uses is missing from it.
