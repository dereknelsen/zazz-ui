# Zazz token reference

A **map** of which token and style utility to reach for and when. Authoritative _values_ live in
`packages/core/src/base/_variables.css` (global tokens), `base/_breakpoints.css`, and each
`packages/core/src/primitives/{name}/{name}.css` (the `--ui-<name>-*` hooks). Utility names live in
`packages/core/src/base/utilities.ts` (`UTILITIES`); the editor completes them from
`packages/core/editor/zazz.css-data.json`. The naming rule is Tailwind's names, CSS values (`--justify: space-between`, `--w: 100%`);
the other syntax rules (spelling, tiers, the base requirement) are in `packages/core/AUTHORING.md`,
and this file doesn't repeat them.

Two rules govern every choice:

1. **Never hardcode.** Every value is a `var(--…)` token that exists in the kit. Override at one
   of the scopes in `SKILL.md` (global → subtree hook → instance) instead of editing source.
2. **Most semantic that fits.** For spacing that means a scale number (`--p: 4`, which is
   `calc(var(--spacing) * 4)`), never `var(--space-*)` in `style`.

---

## 1. Spacing

- **The space scale, as numbers (use first):** the `--space-*` tokens are steps of `--spacing`,
  so write the number and skip the `var()`: `2xs` = 1, `xs` = 2, `sm` = 4, `md` = 6, `lg` = 11,
  `xl` = 24, `2xl` = 40 (`style="--p: 6; --gap: 4"` is `--space-md` / `--space-sm`).
  The tokens stay for CSS and hooks.
- **Scale numbers:** spacing, margin, and sizing utilities take a bare number as `n × --spacing`
  (`--px: 6`). `--spacing` is fluid (a `clamp()`).
- **No numeric step scale.** Use a utility number (`--max-w: 96` is 96 × `--spacing`) or `calc(var(--spacing) * N)` in CSS; write `1px` and `100%` directly.
- **Utilities:** padding `--p` `--px` `--py` `--pt` `--pb` `--pl` `--pr`; margin `--m` `--mx` `--my`
  `--mt` `--mb` `--ml` `--mr` (+ `auto`); gap `--gap` `--gap-x` `--gap-y`; inset `--inset` `--inset-x` `--inset-y` `--top`
  `--bottom` `--left` `--right` (the four sides also take `auto`, at any breakpoint).
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
- **Selection:** `--color-selection`/`--color-selection-foreground` (default: the primary pair),
  the text-selection highlight. Set them on `:root` only; a subtree override does nothing.
- **Status:** `--color-info` `--color-success` `--color-warning` `--color-destructive`
  (+ `-foreground` for text on the solid color). The status variants of button, badge, and
  callout are soft: a 10% tint of the role (20% in dark) with the role's hue as text, its
  lightness clamped to hold 4.5:1. For a status surface, use one of those variants rather than
  mixing your own tint and text.
- **Utilities:** `--text` (text color), `--bg` (+ `--bg-alpha` for channel alpha; `none` clears the
  color and any gradient), `--border-color` (or the `--border` shorthand, §11).
- **Gradients:** a type plus stops, built from role tokens: `--bg-linear: to bottom; --bg-stops:
  var(--color-shade-600), transparent 20%` (scrim over a photo); `--bg-radial: circle at top` and
  `--bg-conic: from 45deg` work the same. The type value is the CSS prelude (direction, shape,
  position, `in oklch [longer hue]`); the `--bg` color shows underneath. One gradient per element.

## 3. Color — scales & overlays (escape hatch only)

- **Scales 50–950:** `--color-primary-50…950` (same for `--color-secondary-*`, `--color-tertiary-*`,
  `--color-neutral-*`), plus `--color-white` / `--color-black`. The kit's placeholder scales are
  neutral; it binds the brand roles at **950** (light) and **50** (dark). Reach a fixed shade in a utility:
  `--bg: var(--color-primary-900)`.
- **Overlays (alpha):** `--color-shade-50…950` / `--color-shade-full` (darken; backdrops — `--color-shade-900` is
  the dialog default) and `--color-tint-50…950` / `--color-tint-full` (lighten). `*-none` = transparent.

## 4. Typography — roles first; never compose a role from parts

- **Roles (size + weight + leading + tracking bundled, all fluid):** native `h1`–`h6`, or
  `data-ui="text-display"`, `text-h1 … text-h6`, `text-2xl text-xl text-lg text-md text-sm text-xs
  text-2xs`, `text-eyebrow`, `text-link` (an inline link outside prose). A role stacks with other tokens: `data-ui="badge text-xs"`.
- **Override one property** with a utility: `--font-size`, `--font-weight`, `--font-family`,
  `--font-style`, `--leading`, `--tracking`, `--text-align`, `--text-transform`, `--text-wrap`,
  `--text-decoration` (also takes states: `--text-decoration--hover: underline`), `--white-space`, `--line-clamp` (`1` = truncate).
- **Weights:** `--font-weight: strong` (also `heading`, `body`) reads the role weight token; otherwise
  a number (`500`; standard names like `medium` are not CSS).
- **Tokens behind them:** `--font-size-*`, `--font-weight-body|heading|strong|eyebrow`,
  `--leading-*`, `--tracking-*`, `--paragraph-spacing-*`, families
  `--font-family-body|heading|mono`.
- **Rich text:** `data-ui="prose"` (`--ui-prose-*` hooks); `data-ui="not-prose"` on a wrapper exempts a widget inside it.

## 5. Radius

`--radius-none|2xs|xs|sm|md|lg|xl|2xl|full`, scaled by `--radius-multiplier`. Conventions: **md** =
buttons/inputs/popovers, **lg** = cards/dialogs, **sm** = badges, **full** = pills/circles. Utility:
`--radius` takes a number on the same scale (`--radius: 2.5` is **md**; 0.5 2xs, 1 xs, 1.5 sm, 4.5 lg,
7 xl, 10 2xl), a length, or `full`, at any state or breakpoint. `--radius-t` / `-b` / `-l` / `-r`
round two corners (`--radius-t: 2.5` for a card's media) and take breakpoints only.

## 6. Shadow & elevation

`--shadow-2xs … 2xl`: soft, four layers, drawn with the elevation formula. Surfaces are flat by default (a `floating`
card takes a resting **sm**); apply elevation on purpose (**md** ≈ popovers/modals). Two utilities:
`--elevation: 4` is a height, drawn as a four-layer box-shadow, at any state or breakpoint
(`--elevation: 1.5; --elevation--hover: 4`); it shares the box-shadow with `--ring*`. `--shadow` is the
explicit form: a token (`--shadow: var(--shadow-md)`) or any shadow, and it wins over `--elevation`.
Every layer blurs by at most its distance and pulls in by a negative spread, so nothing shows above or
beside the element. Light: `--color-shadow` and `--default-shadow-angle` on `:root`
set the color and direction of every shadow; `--shadow-tint: var(--color-primary)` and `--shadow-angle`
change them for an element and its subtree (`0deg` down, `90deg` left, `180deg` up; the angle takes
breakpoints, so a bottom sheet can cast up on mobile). A shadow utility never removes a primitive's focus ring.

## 7. Layout & breakpoints

- **Layout bands:** `data-ui="layout"` (or `<ui-layout>`) makes the element the band grid for
  its children. Bands `sm md lg xl 2xl` cap at the `--layout-*` widths (rem), `full` = minus
  `--gutters`, `bleed` = edge to edge. Children default to **`xl`**; `data-layout-size="md"`
  changes the default; `--band: layout-full` (responsive `--band--md: layout-sm`) places one
  child. A nested layout is a subgrid that keeps the parent's band lines.
- **Reading width:** `--max-w: var(--article-lg); --mx: auto` (`--article-xs` 45ch … `--article-xl`
  75ch), usually on `data-ui="prose"`.
- **Breakpoints:** Tailwind's five names in rem, the same scale as the layout widths:
  `sm` 40rem · `md` 48rem · `lg` 64rem · `xl` 80rem · `2xl` 96rem (640/768/1024/1280/1536px;
  `--layout-sm` … `--layout-2xl` for bands and dialogs). Breakpoint tiers (`--<utility>--md`) are mobile-first and
  track the **nearest inline-size container** (the page by default, or the band inside a layout; mark a card, sidebar, or slot
  `data-ui="container"` to make what's inside respond to it; an element never queries itself).
- **Flow utilities:** `--display` (plus `flex-row`, `flex-col`, `-reverse`, and `inline-flex-…`
  shorthands that set the direction; no `--flex-direction`), `--flex-wrap`, `--flex`, `--shrink`,
  `--basis`, `--order`, `--items`, `--justify`, `--self`, and for grids `--place-items`, `--place-content`
  (alignment keywords only: `center`, `start`, `safe end`, `space-between`…).
- **Anchors:** `--anchor-name` / `--position-anchor` (dashed idents) and `--position-area` take states
  and breakpoints. Put `--anchor-name--hover: --block` on each block and this on the toolbar, which then
  sits above the hovered block:
  `--position: absolute; --position-anchor: --block; --position-area: block-start span-inline-end`. For finer placement write `anchor()` in plain CSS (the inset utilities do
  not take it).
- **Grid utilities (Tailwind's set):** `--grid-cols` / `--grid-rows` (integer → equal tracks, or
  `subgrid`; `none` is `--template-cols: none`), `--template-cols` / `--template-rows` (raw track list),
  `--grid-fit` (length → auto-fit columns), `--grid-flow`, `--auto-cols`, `--auto-rows`.
  Placement: `--col-span` / `--row-span` (integer → `span n / span n`), `--col-start`,
  `--col-end`, `--row-start`, `--row-end` (line numbers; `--col-start: 1; --col-end: -1` spans
  every track). `--band: layout-md` places a layout child.
- **Switches:** `data-ui="pile"` (stack children in one cell), `data-ui="container"` (inline-size query container), `data-ui="isolate"` (new stacking
  context; pairs with pile for layered heroes: `data-ui="pile isolate"`), `data-ui="sr-only"`,
  `data-ui="not-prose"` (a prose ancestor skips this subtree),
  `data-ui="truncate"` (one line, overflow ends in an ellipsis; a flex item also needs `--min-w: 0`),
  `data-ui="spin"` / `"ping"` / `"pulse"` / `"bounce"` (Tailwind's looping animations on the default easing; off under reduced motion),
  `data-ui="divide-x"` / `"divide-y"` (a border between direct children; `--divide` on the container sizes or colors it, §11).
- **Scroll fade:** `data-ui="scroll-fade"` (+ `data-scroll-fade-axis="x"`), hooks
  `--ui-scroll-fade-size`, `--ui-scroll-fade-reveal`.
- **Box utilities (no tiers):** `--overflow --overflow-x --overflow-y`, `--object-fit --object-position`, `--z`,
  `--visibility`.

## 8. Focus ring

Set `--color-ring` on `:root` (the base color; defaults to `--color-primary`); the kit reads
`--ring-shadow-color` and `--ring-offset-shadow-color`. Geometry:
`--ring-width` (2px), `--ring-offset-width` (1px), composed as `--ring-offset-shadow` +
`--ring-shadow` (`--shadow-ring`). A same-geometry transparent outline (`--outline-width`,
`--outline-style`, `--outline-offset`) is kept for forced-colors modes. Primitives publish their
ring themselves; on a plain element use the `--ring`, `--ring-color`, `--ring-offset` utilities.
Ring widths are signed pixels at any breakpoint or state: `--ring: 2` (outset), `--ring: -2`
(inset), `--ring: 2; --ring--md: -2`. `--focus-ring` sets a primitive's focus ring (and a plain
element's focus outline) the same way, e.g. `--focus-ring: -2` inside an `overflow: hidden` card;
unset, it is `--ring-width`.

## 9. Motion

`--spring-easing` (natural spring) with `--bezier-easing` fallback; `--spring-duration`
(~0.333s). `--default-transition` bundles the commonly animated properties:
`--transition: var(--default-transition)`. Narrow it with one of its groups:
`--default-transition-colors`, `-transforms`, `-effects` (opacity, filters, shadow) or `-content`
(discrete properties with `allow-discrete`); each has a `--default-transition-property-*` name list.
Retime anything, a primitive included, with `--transition-duration` and `--transition-delay`, which
take states and breakpoints (`--transition-delay--md: 240ms`). `prefers-reduced-motion: reduce`
zeroes the default duration globally, so don't fight it. Transform utilities: `--scale`,
`--translate`, `--rotate`.

## 10. Opacity & color alpha

Two separate systems — don't confuse them.

- **Element opacity** (whole element + children): `--opacity: 0.75`.
- **Background channel alpha** (only the fill): `--bg: var(--color-primary); --bg-alpha: 0.1`.
  Multiplied into the token's own alpha, so shade/tint tokens keep their translucency.

Filters and blending: `--filter` (any filter list: `grayscale(1)`, `blur(2px)`), `--backdrop-filter`
(frosted glass over a translucent `--bg`: `--bg-alpha: 0.6; --backdrop-filter: blur(12px)`), and
`--mix-blend` (`mix-blend-mode`: `multiply`, `screen`, `overlay`). Effects family: they take state
tiers and work tier-only (`--filter--hover: blur(2px)` alone is unfiltered at rest).

## 11. Borders

Shorthand: `--border`, `--border-x`, `--border-y`, `--border-{l,t,r,b}` take a color (1px solid in
that color), a number (that many px in `--color-border`), or a length (that width in
`--color-border`). The all-sides longhands win over it: `--border-width`, `--border-style`,
`--border-color`. A side takes only the shorthand (there is no `--border-b-width`): a one-line
divider is `--border-b: 1`, an accent edge `--border-l: var(--color-primary)`. Borders between
direct children: `data-ui="divide-x"` / `"divide-y"` on the container, 1px `--color-border` by
default, or `--divide: 2` / `--divide: var(--color-primary)` on the container (same grammar).
Separators between items are `<hr data-ui="separator">`.

## 12. Positioning & interaction

`--position` (`relative`, `absolute`, `sticky`, …) with `--inset --top --bottom --left --right`
(spacing values; the four sides also take `auto`, so `--bottom: 0; --bottom--lg: auto` releases a
side at a breakpoint). `--cursor`, `--pointer-events`, `--outline`.

## 13. State tiers

Color utilities also take breakpoint tiers (`--bg--md: var(--color-muted)`; a state still beats
them). Color and effects utilities take state tiers: `hover active focus-visible focus-within disabled open
checked current starting` (`current` is `[aria-current]`, not `"false"`), e.g. `--text: var(--color-muted-foreground); --text--hover: var(--color-foreground)`.
Group tiers react to an ancestor with `data-ui="group"`:
`--opacity: 1; --group-opacity--hover: 0.85`. On a primitive, prefer the state hook
(`--ui-button-bg--hover`) so its own states stay intact.

Pseudo-elements: `--before-content: ''` plus `--before-<utility>` / `--after-<utility>` for
`--position`, `--display`, `--z`, `--inset` `--inset-x` `--inset-y` `--top` `--right` `--bottom` `--left`,
padding, sizing and `--aspect`, `--text`, `--bg` (+ `--bg-alpha`), the border longhands,
`--radius`, `--outline`, `--opacity`, `--filter` `--backdrop-filter` `--mix-blend`, `--visibility`, `--pointer-events`, `--scale` `--translate`
`--rotate`, `--transition` `--transition-duration` `--transition-delay`, `--font-size`, `--font-weight`. They take no tiers. An accent bar:
`--before-content: ''; --before-position: absolute; --before-inset-y: 0; --before-left: 0;
--before-w: 1; --before-bg: var(--color-primary)`.

`--<utility>--starting` is the `@starting-style` value: an element starts there when it first
renders or leaves `display: none`, and a `--transition` animates it in; e.g.
`--opacity--starting: 0; --opacity: 1; --transition: opacity 0.3s` fades in. No group form.

Experimental `--<utility>--stuck` applies while the nearest sticky ancestor is stuck (to its
`--stuck-state` side, default `top`), below every other state, on that element's descendants only:
`<header style="--position: sticky; --top: 0"><div style="--bg--stuck: var(--color-background)">`.
Polyfilled where container scroll-state queries are unsupported.
