# Zazz token reference

A **map** of which token and style utility to reach for and when. Authoritative _values_ live in
`packages/core/src/base/_variables.css` (global tokens), `base/_breakpoints.css`, and each
`packages/core/src/primitives/{name}/{name}.css` (the `--ui-<name>-*` hooks). Utility names live in
`packages/core/src/base/utilities.ts` (`UTILITIES`); the editor completes them from
`packages/core/editor/zazz.css-data.json`. Syntax rules (spelling, tiers, the base requirement)
are in `packages/core/AUTHORING.md` — this file doesn't repeat them.

Two rules govern every choice:

1. **Never hardcode.** Every value is a `var(--…)` token that exists in the kit. Override at one
   of the scopes in `SKILL.md` (global → subtree hook → instance) instead of editing source.
2. **Most semantic that fits.** `var(--space-sm)` → a scale number (`--p: 4`) → `calc(var(--spacing) * 4)`,
   in that order of preference.

---

## 1. Spacing

- **Semantic space (use first):** `--space-xs --space-sm --space-md --space-lg --space-xl`, for
  padding, margin, gap, and inset utilities: `style="--p: var(--space-md); --gap: var(--space-sm)"`.
- **Scale numbers:** spacing, margin, and sizing utilities take a bare number as `n × --spacing`
  (`--px: 6`). `--spacing` is fluid (a `clamp()`).
- **No numeric step scale.** Use a utility number (`--max-w: 96` is 96 × `--spacing`) or `calc(var(--spacing) * N)` in CSS; write `1px` and `100%` directly.
- **Utilities:** padding `--p` `--px` `--py` `--pt` `--pb` `--pl` `--pr`; margin `--m` `--mx` `--my`
  `--mt` `--mb` `--ml` `--mr` (+ `auto`); gap `--gap` `--gap-x` `--gap-y`; inset `--inset` `--top`
  `--bottom` `--left` `--right`.
  Sides are `l`/`t`/`r`/`b`; they set logical properties, so `l` is the right side in RTL.
- **Sizing utilities:** `--w --h --size --min-w --max-w --min-h --max-h` (dual: number or length,
  plus `auto`, `fit-content`, `min-content`, `max-content` — see AUTHORING.md rule 3), `--aspect`
  (raw, `3 / 2`).

## 2. Color — roles (use these; light/dark swaps for free)

Use the `--color-*` roles in utilities and CSS; they are also the **theme inputs** you set on `:root`
(`--color-primary: light-dark(…, …)`). There are no bare names (`--primary`, `--card`).

- **Surfaces & text (paired):** `--color-background`/`--color-foreground`,
  `--color-card`/`--color-card-foreground`, `--color-popover`/`--color-popover-foreground`,
  `--color-input`/`--color-input-foreground`, `--color-border`, `--color-border-foreground`.
- **Dim / fade (paired):** `--color-muted`/`--color-muted-foreground` (darker than its surface),
  `--color-faded`/`--color-faded-foreground` (lighter than its surface).
- **Brand:** `--color-primary` `--color-secondary` `--color-tertiary` (+ `-foreground`).
- **Status:** `--color-info` `--color-success` `--color-warning` `--color-destructive`
  (+ `-foreground`).
- **Utilities:** `--text` (text color), `--bg` (+ `--bg-alpha` for channel alpha), `--border-color` (or the `--border` shorthand, §11).

## 3. Color — scales & overlays (escape hatch only)

- **Scales 50–950:** `--color-primary-50…950` (same for `--color-secondary-*`, `--color-tertiary-*`,
  `--color-neutral-*`), plus `--color-white` / `--color-black`. The light theme binds the brand roles
  at **950** and dark at **800**. Reach a fixed shade in a utility:
  `--bg: var(--color-primary-900)`.
- **Overlays (alpha):** `--color-shade-50…950` / `--color-shade-full` (darken; backdrops — `--color-shade-900` is
  the dialog default) and `--color-tint-50…950` / `--color-tint-full` (lighten). `*-none` = transparent.

## 4. Typography — roles first; never compose a role from parts

- **Roles (size + weight + leading + tracking bundled, all fluid):** native `h1`–`h6`, or
  `data-ui="text-display"`, `text-h1 … text-h6`, `text-xl text-lg text-md text-sm text-xs`,
  `text-eyebrow`, `text-link`. A role stacks with other tokens: `data-ui="badge text-xs"`.
- **Override one property** with a utility: `--font-size`, `--font-weight`, `--font-family`,
  `--font-style`, `--leading`, `--tracking`, `--text-align`, `--text-transform`, `--text-wrap`,
  `--text-decoration`, `--whitespace`, `--line-clamp` (`1` = truncate).
- **Tokens behind them:** `--font-size-*`, `--font-weight-body|heading|strong|eyebrow|mono`,
  `--leading-*`, `--tracking-*`, `--paragraph-spacing-*`, families
  `--font-family-body|heading|mono` (raw `--font-family-body|heading|mono`).
- **Rich text:** `data-ui="prose"` (`--ui-prose-*` hooks).

## 5. Radius

`--radius-none|xs|sm|md|lg|xl|full`, scaled by `--radius-multiplier`. Conventions: **md** =
buttons/inputs, **lg** = cards/dialogs, **sm** = badges, **full** = pills/circles. Utility:
`--rounded` (raw `border-radius`, so per-corner values work:
`--rounded: var(--radius-md) var(--radius-md) 0 0`).

## 6. Shadow & elevation

`--shadow-xs|sm|md|lg|xl` — soft, multi-layer. Surfaces are flat by default; apply elevation
intentionally (**md** ≈ popovers/modals). Utility: `--shadow` (state tiers:
`--shadow: var(--shadow-xs); --shadow--hover: var(--shadow-md)`). A shadow utility never removes a
primitive's focus ring.

## 7. Layout & breakpoints

- **Layout bands:** `data-ui="layout"` (or `<ui-layout>`) makes the element the band grid for
  its children. Bands `2xs xs sm md lg xl 2xl` cap at the breakpoint widths, `full` = minus
  `--gutters`, `bleed` = edge to edge. Children default to **`lg`**; `data-layout-size="md"`
  changes the default; `--col: layout-full` (responsive `--col--md: layout-sm`) places one
  child. A nested layout is a subgrid that keeps the parent's band lines.
- **Reading width:** `--max-w: var(--article-lg); --mx: auto` (`--article-xs` 45ch … `--article-xl`
  75ch), usually on `data-ui="prose"`.
- **Breakpoints:** `--breakpoint-2xs` 24rem · `-xs` 30rem · `-sm` 40rem · `-md` 48rem · `-lg`
  64rem · `-xl` 80rem · `-2xl` 96rem. Breakpoint tiers (`--<utility>--md`) are mobile-first and
  track the `html` container width.
- **Flow utilities:** `--display`, `--flex-direction`, `--flex-wrap`, `--flex`, `--shrink`,
  `--basis`, `--order`, `--items`, `--justify`, `--place`, `--self`.
- **Grid utilities:** `--grid-cols` / `--grid-rows` (integer → equal tracks), `--grid-template-cols`
  / `--grid-template-rows` (raw, incl. `subgrid`), `--grid-fit` (length → auto-fit columns),
  `--grid-flow`, `--auto-cols`, `--auto-rows`, `--col`, `--row` (`span 2`, `layout-md`).
- **Switches:** `data-ui="grid-pile"` (stack children in one cell), `data-ui="sr-only"`.
- **Scroll fade:** `data-ui="scroll-fade"` (+ `data-scroll-fade-axis="x"`), hooks
  `--ui-scroll-fade-size`, `--ui-scroll-fade-reveal`.
- **Box utilities:** `--overflow --overflow-x --overflow-y`, `--object-fit`, `--z`, `--isolation`,
  `--visibility`.

## 8. Focus ring

Set `--color-ring` on `:root` (the base color; defaults to `--color-primary`); the kit reads
`--ring-shadow-color` and `--ring-offset-shadow-color`. Geometry:
`--ring-width` (2px), `--ring-offset-width` (1px), composed as `--ring-offset-shadow` +
`--ring-shadow` (`--shadow-ring`). A same-geometry transparent outline (`--outline-width`,
`--outline-style`, `--outline-offset`) is kept for forced-colors modes. Primitives publish their
ring themselves; on a plain element use the `--ring`, `--ring-color`, `--ring-offset` utilities.

## 9. Motion

`--spring-easing` (natural spring) with `--bezier-easing` fallback; `--spring-duration`
(~0.333s). `--default-transition` bundles the commonly animated properties:
`--transition: var(--default-transition)`. `prefers-reduced-motion: reduce` zeroes the duration
globally — don't fight it. Transform utilities: `--scale`, `--translate`, `--rotate`.

## 10. Opacity & color alpha

Two separate systems — don't confuse them.

- **Element opacity** (whole element + children): `--opacity: 0.75`.
- **Background channel alpha** (only the fill): `--bg: var(--color-primary); --bg-alpha: 0.1`.
  Multiplied into the token's own alpha, so shade/tint tokens keep their translucency.

## 11. Borders

Shorthand: `--border`, `--border-x`, `--border-y`, `--border-{l,t,r,b}` take a color (1px solid in
that color), a number (that many px in `--color-border`), or a length (that width in
`--color-border`). Longhands win over it: `--border-width`, `--border-style`, `--border-color`,
and per side `--border-{l,t,r,b}-width` / `--border-{l,t,r,b}-color`. A one-line divider:
`--border-b: 1`. A divider:
`--border-b-width: 1px; --border-b-color: var(--color-border)`. Separators between items are
`<hr data-ui="separator">`.

## 12. Positioning & interaction

`--position` (`relative`, `absolute`, `sticky`, …) with `--inset --top --bottom --left --right`
(spacing values). `--cursor`, `--pointer-events`, `--outline`.

## 13. State tiers

Color and effects utilities take state tiers: `hover active focus-visible focus-within disabled open
checked`, e.g. `--text: var(--color-muted-foreground); --text--hover: var(--color-foreground)`.
Group tiers react to an ancestor with `data-ui="group"`:
`--opacity: 1; --group-opacity--hover: 0.85`. Pseudo-elements: `--before-content: ''` plus
`--before-<utility>` / `--after-<utility>` for sizing, color, and `--rounded`. On a primitive, prefer
the state hook (`--ui-button-bg--hover`) so its own states stay intact.
