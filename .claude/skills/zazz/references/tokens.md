# Zazz token reference

A **map** of which token to reach for and when. Authoritative _values_ live in
`packages/ui/src/base/_variables.css` (global Tiers 1–3) and each
`packages/ui/src/ui/{name}/{name}.css` (component tokens, Tier 4) — read those when you need an
exact number, so this file can't drift.

Two rules govern every choice:

1. **Never hardcode.** Every value is a `var(--…)` hook. Override at one of the three
   surfaces in `SKILL.md` (global → component-default → instance) instead of editing source.
2. **Most semantic that fits.** Reach for the semantic token first; drop to a literal scale
   only when no semantic token can express it. `gap-sm` → `var(--gap-sm)` → `var(--step-4)`,
   in that order of preference.

## Contents

1. Spacing · 2. Color roles · 3. Color scales & overlays · 4. Typography · 5. Radius ·
2. Shadow · 7. Layout & breakpoints · 8. Focus ring · 9. Motion · 10. Opacity & alpha ·
3. Borders · 12. Positioning · 13. Interaction · 14. State variants (hover) ·
4. Transitions

---

## 1. Spacing

- **Semantic gaps (use first):** `--gap-xs --gap-sm --gap-md --gap-lg --gap-xl`. These are
  the default for padding, margins, and `gap`.
- **Step scale (escape hatch):** `--step-0_5 --step-1 … --step-96`, plus `--step-px`,
  `--step-0_5px`, `--step-full`. Half-steps run through `--step-5_5` (escaped dot —
  `var(--step-2_5)` = 2.5×); above that the scale is whole-numbered and sparse. Everything
  derives from `--spacing-interval` (a fluid `clamp()`), so spacing scales with the viewport.
- **Gap utilities:** `.gap-0 .gap-0.5px .gap-px .gap-xs .gap-sm .gap-md .gap-lg .gap-xl`,
  axis-specific `.gap-x-* .gap-y-*` (same sizes). Gap classes also set an internal `--_gap`
  var consumed by the responsive grid (`grid-flow-row`) and `basis-*` utilities.
- **Padding utilities:** `.p-0 .p-xs .p-sm .p-md .p-lg .p-xl`, axis `.px-* .py-*`, physical
  sides `.pt-* .pr-* .pb-* .pl-*` (pt/pb map to block; pl/pr map to inline). Uses a
  composition-variable system — touching one axis leaves the other intact.
- **Margin utilities:** `.m-0 .m-xs .m-sm .m-md .m-lg .m-xl`, axis `.mx-* .my-*` (+ `.mx-auto .my-auto`),
  physical sides `.mt-* .mr-* .mb-* .ml-*` (+ per-side `auto`).
- **Negative margins:** `.-m-xs ..-m-xl`, `.-mx-* .-my-*`, `.-mt-* .-mr-* .-mb-* .-ml-*`
  (same sizes xs–xl). Base classes only — no responsive (`xs:`…) variants.
- **Size utilities:** `.w-0 .w-px .w-auto .w-full .w-xs..xl .w-screen .w-screen-xs..xl`,
  `.h-0 .h-px .h-auto .h-full .h-xs..xl .h-screen .h-screen-xs..xl`,
  `.size-0 .size-auto .size-full .size-xs..xl .size-screen .size-screen-xs..xl`.
- **Min/max size:** `.max-w-0 .max-w-auto .max-w-full .max-w-screen .max-w-screen-xs..xl`,
  `.max-h-0 .max-h-auto .max-h-full .max-h-screen .max-h-screen-xs..xl`,
  `.min-w-0 .min-w-auto .min-w-full .min-w-screen .min-w-screen-xs..xl`,
  `.min-h-0 .min-h-auto .min-h-full .min-h-screen .min-h-screen-xs..xl`.
- **Inset/position offsets:** `.inset-0 .inset-xs..xl`, `.top-xs..xl .right-xs..xl
.bottom-xs..xl .left-xs..xl`.

## 2. Color — theme roles (use these; light/dark swaps for free)

Roles resolve via `light-dark()` and re-declare on `.dark`, so using a **role** (not a scale
step) keeps both modes correct automatically.

- **Surfaces & text (paired):** `--background`/`--foreground`, `--card`/`--card-foreground`,
  `--popover`/`--popover-foreground`, `--input`/`--input-foreground`, `--border`,
  `--border-foreground`.
- **Dim / fade (paired):** `--muted`/`--muted-foreground` (dim — darker than its surface),
  `--faded`/`--faded-foreground` (fade — lighter than its surface).
- **Brand:** `--primary` `--secondary` `--tertiary` (+ `-foreground`).
- **Status:** `--info` `--success` `--warning` `--destructive` (+ `-foreground`).
- **Utilities:** `.text-{role}`, `.bg-{role}`, `.border-{role}`.

## 3. Color — scales & overlays (escape hatch only)

Reach here only when a role can't express it (a specific tint, a backdrop, a fixed accent).

- **Scales 50–950 (tokens only):** `--primary-50…950` (same for `--secondary-*`, `--tertiary-*`,
  `--neutral-*`), plus `--white` / `--black`. Light theme binds primary/secondary at **600**,
  tertiary at **500**; dark shifts lighter. These have **no utility classes** — reach a fixed
  shade via the token in custom CSS or inline (`style="color: var(--primary-600)"`).
- **Overlays (alpha):** `--shade-50…950` / `--shade-full` (darken; from neutral-950 — use for
  backdrops, e.g. `--shade-900`, the dialog's default backdrop) and `--tint-50…950` / `--tint-full`
  (lighten; from white). `*-none` = transparent. Overlays **do** ship `bg-*` utilities (the one
  numeric color scale that does), since dimming a surface is common.
- **Utilities:** `.bg-shade-*`, `.bg-tint-*`, `.text-white`, `.text-black`, `.bg-white`,
  `.bg-black`, `.bg-transparent`, `.bg-none`. (Role tokens — §2 — cover the rest; numeric
  `text-`/`bg-`/`border-` scale classes were removed in favor of the role-first model.)

## 4. Typography — use `text-*` classes; never compose from parts

- **Scale classes (size + weight + leading + tracking bundled):** `.text-display`,
  `.text-h1 … .text-h6`, `.text-xl .text-lg .text-md .text-sm .text-xs`, `.text-eyebrow`.
  All sizes are fluid `clamp()`. This is the primary way to set type.
- **Tokens behind them (only when a class won't do):** `--font-size-*`, `--font-weight-*`
  (`body|heading|strong|eyebrow`), `--tracking-*`, `--leading-*`, `--paragraph-spacing-*`,
  families `--font-family-body|heading` and raw `--font-body|serif|mono`.
- **Weight/family utilities (Tailwind-named):** `.font-thin … .font-black`, plus semantic
  `.font-body .font-heading .font-strong`, families `.font-sans .font-serif .font-mono`.
- **Helpers:** `.text-center|left|right|justify`, `.uppercase .lowercase .capitalize .normal-case`,
  `.text-balance .text-pretty`, `.leading-none`, `.line-clamp-1..6`, `.tabular-nums`, `.text-link`,
  `.text-muted-foreground`. For long-form rich content, wrap in `.ui-prose` (`_typography.css`).

## 5. Radius

`--radius-none|xs|sm|md|lg|xl|full`, scaled by `--radius-multiplier`. Conventions: **md** =
buttons/inputs, **lg** = cards/dialogs, **sm** = badges, **full** = pills/circles.
Utilities: `.rounded-0|xs|sm|md|lg|xl|full`. Per-edge: `.rounded-t-*`, `.rounded-b-*`,
`.rounded-l-*`, `.rounded-r-*`. Individual corners: `.rounded-tl-*`, `.rounded-tr-*`,
`.rounded-br-*`, `.rounded-bl-*`. Uses a composition-variable system — touching one edge
leaves other corners intact (e.g. `rounded-b-0` flattens the bottom only).

## 6. Shadow & elevation

`--shadow-xs|sm|md|lg|xl` — soft, multi-layer. Surfaces are flat by default; apply elevation
intentionally (**md** ≈ popovers/modals). Utilities: `.shadow-none|xs|sm|md|lg|xl`.

## 7. Layout & breakpoints

- **`.container` — subgrid band system.** A `<main>/<header>/<footer>/<section>/<article>` that
  `:has(> .container)` becomes a layout grid with named band lines; the `.container` is a subgrid
  spanning the whole region, and each **direct child** drops into a band. No wrapper div, no fixed
  width — the band caps + centers content fluidly. Bands: `xs sm md lg xl` (cap at the matching
  breakpoint width), `full` (region width minus gutters), `bleed` (edge-to-edge, gutters included).
  **Default band is `md`.**
  - `data-container="xs|sm|md|lg|xl|full|bleed"` on the `.container` resets the default for
    all its children.
  - `data-container="xs|sm|md|lg|xl|full|bleed"` on a **direct child** overrides that one child's band.
  - Responsive variants: `@md:container`, `@max-md:container`, etc. — the element is a band subgrid
    only at/above (min) or below (max) its breakpoint, and a plain block otherwise. (`@max-md:container`
    pairs with a grid that takes over above `md`; see `products.html`.)
- **`.container[data-variant="article"]` — reading width** (replaces the old `.article`). A centered,
  inline-size container; widths from `--article-xs` 45ch, `--article-sm` 50ch, `--article-md` 65ch,
  `--article-lg` 70ch, `--article-xl` 75ch. **Default `lg`.** Pick the width with
  `data-container="xs..xl"`. Responsive `@md:container[data-variant="article"]` / `@max-*`
  variants exist. (full/bleed aren't reading widths — use them on a plain band `.container`.)
- **Gutters:** `--gutters` (= `--gap-md`) — the region's edge padding the band system reserves.
- **Breakpoints** (for `calc()` and **container** queries — not `@media`): `--breakpoint-xs` 40rem,
  `--breakpoint-sm` 48rem, `--breakpoint-md` 64rem, `--breakpoint-lg` 80rem, `--breakpoint-xl` 96rem.
- **Responsive utilities are `@`-prefixed:** `@xs:* @sm:* @md:* @lg:* @xl:*` — author as
  `class="@md:grid-cols-3"`, `class="@lg:flex-row"`. Mobile-first (apply at/above the breakpoint),
  gated on global `--is-breakpoint-*` flags sourced from the **body** container, so they track the
  viewport breakpoint (not the nearest arbitrary container). Available at each breakpoint: display
  (`hidden block flex inline-flex grid grid-cols-subgrid grid-rows-subgrid`), grid-cols, grid-rows,
  flex-direction (`flex-row flex-col`), text-align, items-_, justify-_, col-span, row-span, basis.
  (Less-toggled families — align-self, justify-self, place-items, visibility, negative margins — ship
  only as base classes, not per-breakpoint; apply them outside the responsive layer.)
  - **`@max-*` (below the breakpoint):** the inverse of the min variants — applies only _below_ its
    breakpoint. In utilities this only exists for the **container** family (`@max-md:container` etc.);
    the atomic utilities above (grid-cols, display, …) ship min variants only.
- **Display:** `.hidden .block .inline-block .inline .visible .invisible`.
- **Flexbox:** `.flex .inline-flex`, direction `.flex-row .flex-row-reverse .flex-col
.flex-col-reverse`, shorthand `.flex-1 .flex-auto .flex-initial .flex-none`, alignment
  `.items-start|center|end|stretch`, `.justify-start|center|end|stretch|around|between`,
  `.self-auto|start|end|center|stretch`, `.justify-self-auto|start|end|center|stretch`.
- **Flex basis (gap-aware fractions):** `.basis-0 .basis-auto .basis-full .basis-1\/2
.basis-1\/3 .basis-1\/4 .basis-1\/5 .basis-1\/6`. Fractions subtract gap automatically.
- **Grid:** `.grid`, `.grid-cols-1..12`, `.grid-cols-subgrid .grid-rows-subgrid`,
  `.grid-flow-row .grid-flow-col`, `.col-span-1..12`, `.grid-area-pile` (stacking),
  `.place-items-start|center|end`. `grid-flow-row` + `grid-cols-N` (N > 1) uses `auto-fill`
  with a smart breakpoint formula — items wrap responsively.
- **Order:** `.order-first .order-last .order-none`.
- **Z-index:** `.z-isolate .z-0 .z-10 .z-20 .z-30 .z-40 .z-50`.
- **Aspect ratio:** `.aspect-anamorphic` (2.39:1), `.aspect-univisium` (2:1),
  `.aspect-widescreen` (16:9), `.aspect-landscape` (3:2), `.aspect-portrait` (2:3),
  `.aspect-square` (1:1).
- **Object fit:** `.object-contain .object-cover .object-fill .object-none .object-scale-down`.
- **Overflow:** `.overflow-hidden .overflow-clip .overflow-auto .overflow-y-auto
.overflow-x-auto` / `.scrollbar-none` (hide scrollbars, keep scrolling).
- **Scroll-fade (scroll-aware edge masks):** `.scroll-fade` (= `.scroll-fade-y`, vertical both
  edges), `.scroll-fade-x` (horizontal), per-edge `.scroll-fade-t|b|l|r|s|e`, sizes
  `.scroll-fade-xs..xl` and per-edge `.scroll-fade-{t,b,s,e}-xs..xl`, off via `.scroll-fade-none`.
  Scroll-driven animation eases each edge crisp↔faded as you scroll (static both-edge fade as
  fallback). Arbitrary values via `--scroll-fade-size`, per-edge `--scroll-fade-{t,b,s,e}-size`,
  ease distance `--scroll-fade-reveal`. The mask sits on the scroller, so pair with
  `.scrollbar-none`.
- **Tables:** no table utilities — `table-layout` and `caption-side` are `data-*` attributes on
  the Table component (see `components.md`): `data-layout="fixed"` on `.ui-table`, `data-side="top"`
  on its `<caption>`.
- **Accessibility:** `.sr-only`.

## 8. Focus ring

Tailwind/shadcn-compatible: `--ring` (color, = `--ring-color` at `--ring-opacity`),
`--ring-width` (2px), `--ring-offset-width` (1px), `--ring-offset-color` (= `--background`).
Composed as `--ring-offset-shadow` + `--ring-shadow` (bundled as `--shadow-ring`) for
box-shadow lists, layered with component shadows. A same-geometry transparent outline
(`--outline-width/style/offset`) is kept for forced-colors/high-contrast modes. To recolor,
override **`--ring-color`** (not `--ring` — it recomputes via `color-mix`). `.ring` opts an
element in.

## 9. Motion

`--spring-easing` (natural spring) with `--bezier-easing` fallback; `--spring-duration`
(~0.333s). `--default-transition*` bundles the commonly animated properties.
`prefers-reduced-motion: reduce` zeroes the duration globally — don't fight it. Utilities:
`.transition`, `.transition-all|opacity|transform`.

---

## 10. Opacity & color alpha

Two separate systems — **element opacity** and **channel alpha**. Don't confuse them.

- **Element opacity** (affects the whole element + children): quartile scale
  `.opacity-0 .opacity-25 .opacity-50 .opacity-75 .opacity-100`.
- **Color alpha** (dims only the color channel, not the element): `.bg-opacity-*`,
  `.text-opacity-*`, `.border-opacity-*` — same quartile scale (0/25/50/75/100). Multiplied into the token's own
  alpha, so shade/tint/faded tokens keep their built-in translucency. Compose with any
  `text-`/`bg-`/`border-` color class. Backed by `@property`-registered `--_text-alpha`,
  `--_background-alpha`, `--_border-alpha` vars that don't inherit.

---

## 11. Borders

- **Color:** `.border-primary .border-secondary .border-tertiary .border-muted .border-faded
.border-info .border-success .border-warning .border-destructive`. Default is `--border`.
- **Sides:** `.border` (all), `.border-l .border-t .border-r .border-b`, plus
  `.border-l-none .border-t-none .border-r-none .border-b-none`, `.border-none`.
- **Style:** `.border-dashed .border-dotted .border-double`.
- All borders use oklch with `--_border-alpha` composing (dim via `.border-opacity-*`).

---

## 12. Positioning

`.static .relative .absolute .fixed .sticky`. Inset/offset utilities use `--gap-*` sizes:
`.inset-0 .inset-xs..xl`, `.top-xs..xl .right-xs..xl .bottom-xs..xl .left-xs..xl`.

---

## 13. Interaction

`.pointer-events-none`, `.pointer-cursor` (cursor: pointer), `.pointer-default` (cursor: default).

---

## 14. State variants (hover)

Hover variants for color, opacity, and scale — use the backslash-colon prefix convention.
(There are no `active:` variants; express pressed/active feedback in component CSS via `:active`.)

- **Hover text:** `.hover\:text-{role}` (all theme roles: background, foreground, card,
  input, muted, faded, primary, secondary, tertiary, info, success, warning, destructive +
  foreground variants).
- **Hover background:** `.hover\:bg-{role}` (same roles + `transparent`, `none`).
- **Hover border:** `.hover\:border-{color}` (primary, secondary, tertiary, muted, faded,
  info, success, warning, destructive).
- **Hover opacity:** `.hover\:opacity-{0,25,50,75,100}` (quartile).
- **Hover scale:** `.hover\:scale-{0,50,75,90,95,100,105,110,125,150}`.
- **Hover shadow:** `.hover\:shadow-{none,xs,sm,md,lg,xl}` (raise elevation on hover; pair
  with `.transition` for a smooth lift).

---

## 15. Transitions

`.transition` (default property bundle), `.transition-all`, `.transition-opacity`,
`.transition-transform`. All use `--default-transition-duration` and
`--default-transition-timing-function`.
