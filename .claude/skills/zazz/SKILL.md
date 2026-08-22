---
name: zazz
description: >-
  Build, style, and lay out web UI with the Zazz Design Framework — this repo's default design
  system. Use this skill WHENEVER you create or modify any page, component, layout, or styling
  here: buttons, badges, cards, tables, dialogs, dropdowns, tooltips, tabs, accordions,
  carousels/lightboxes, breadcrumbs, forms (inputs, selects, switches, sliders, checkboxes,
  radios), navigation, heroes, sections. Also trigger for theming, dark mode, spacing/typography/color
  decisions, "make it look good / on-brand," or anytime CSS variables, design tokens, or
  semantic utility classes are involved. Zazz is zero-build, modern-web-API, semantic-token +
  data-* driven — reach for it instead of hand-rolling CSS or pulling in Tailwind/shadcn.
---

# Zazz Design Framework

Zazz is the default design system for this project — a zero-build, modern-web CSS/UI kit (a
lightweight shadcn + Tailwind alternative that runs with **no build step**). Build with Zazz
before reaching for any other styling approach.

**Single source of truth:** each component's markup lives once, in
`packages/ui/src/ui/{name}/*.html`, surfaced on the docs site at `/docs/components/{name}`. Never
invent or paste a second copy — read or fetch the real example and adapt it. Component docs
previews also expose the matching CSS and, for web components, the matching JS tab.

## How Zazz thinks (mental model)

- **Cascade layers, not specificity.** Top-level order is `@layer variables, reset, legacy, zazz, migrations`.
  `zazz` is subdivided: `components, utilities`. A utility wins
  over a component rule with no `!important`. Don't fight the cascade with selector tricks.
- **Tokens are hooks.** Components read `var(--token)` and never hardcode; variants just
  reassign tokens (see `packages/ui/src/ui/button/button.css`). You restyle by overriding tokens, not
  editing rules.
- **`data-*` for variants** (shadcn-familiar): `data-variant`, `data-size`, `data-side`,
  `data-align`, `data-orientation`, `data-animation`, `data-layout`, `data-state`. The
  **default** variant is the _absence_ of the attribute. Write
  `class="button" data-variant="primary"` — never `.button-primary`.
- **Modern APIs do the work** (Popover, native `<dialog>`, Invoker Commands, anchor
  positioning, View Transitions, `<details>`). Polyfills are already loaded — preserve them.
- **Composition variables** (`--_` prefix, `@property`-registered with `inherits: false`).
  Padding, margin, and radius utilities use an internal "composing rule + setter" pattern:
  one rule reads `--_padding-inline-start` etc. and the utility class just sets the var.
  This means touching one axis/edge leaves others intact (e.g. `p-md pl-0` only zeros the
  left). Color utilities use `--_text-alpha`, `--_background-alpha`, `--_border-alpha` for
  per-channel opacity that doesn't bleed to children.
- **State variants.** `hover\:` prefix for text/bg/border colors, opacity, scale, and shadow
  (e.g. `hover\:bg-primary`, `hover\:opacity-75`, `hover\:shadow-md`). No JS needed. For
  pressed/`:active` feedback, write it in the component's own CSS — there are no `active\:`
  utilities.

## The golden rule: semantic first, specific as escape hatch

Start at the most semantic layer; get specific only when nothing semantic fits. This is what
keeps designs consistent and reusable — you compose from a shared vocabulary instead of
writing net-new CSS every time.

- **Spacing** → `--gap-*` (or `.gap-* .p-* .py-*` utilities) first; `--step-*` only when no
  gap fits. Never a raw px/rem.
- **Color** → theme **role** tokens (`--background`, `--foreground`, `--muted-foreground`,
  `--primary`, `--border`, `--destructive`…) so light/dark swap for free; literal scales
  (`--primary-600`, `--neutral-100`, `--shade-800`) only as a last resort.
- **Type** → `text-*` classes (`text-h1`…`text-xs`, `text-eyebrow`). Never compose type from
  separate size/weight/leading utilities.
- **Reuse over new CSS.** Prefer an existing utility or primitive. Reaching for a brand-new
  rule is a signal you skipped a semantic option — check `references/tokens.md` first.

Full token map → **`references/tokens.md`**.

## Design with intention

The token discipline above is what lets you be bold without the result turning to mush. Before
building anything past a single component, commit to a clear aesthetic direction — then execute
it precisely. Refined minimalism and expressive maximalism both win; **intentionality, not
intensity, is the bar.** Zazz supplies the vocabulary; you supply the point of view.

- **Frame it first.** Who uses this, to do what? Which archetype fits — Industrial Distributor,
  Lifestyle Brand, or Editorial Studio (see `DESIGN.md`)? What's the one thing a visitor will
  remember? Let those answers set density, imagery, and rhythm before you place a section.
- **Distinctive type is Zazz's signature move.** Pair Geist with a classic serif _italic_
  (Playfair Display, Cormorant Garamond) on emphasis words — "the art of _quality_" — for
  editorial cadence. Use the full scale for real hierarchy: a genuine `text-display`/`text-h1`
  moment against calm body copy, not five near-identical sizes. Matching a brand? Adopt its real
  typefaces — never fall back to generic system fonts as a default.
- **Commit to the palette.** A dominant surface with sharp brand accents reads as _designed_;
  timid, evenly-distributed grays read as slop. Route everything through role tokens so dark
  mode comes free, and don't treat the default blue-violet as a neutral — when there's a brand,
  make its colors the point.
- **Compose with tension.** Break the centered stack. The `.container` band system is built for
  it: play `bleed`/`full` imagery against capped `lg`/`article` text, use the left-label layout,
  overlap layers with `grid-area-pile`, and let `gap-xl` open real negative space. Asymmetry and
  whitespace are choices, not accidents.
- **Build atmosphere, not flat fills.** Layer depth from tokens — gradient washes across a brand
  scale (`--primary-600` → `--primary-900`), `shade`/`tint` transparencies, subtle noise/grain,
  decorative `--border` rules. (Keep surfaces flat and reserve `--shadow-*` for genuine
  elevation; atmosphere lives in the background, not on every card.)
- **Spend motion where it counts.** One orchestrated page-load — staggered reveals via
  `data-reveal`/`data-reveal-each` on the hero — delights more than scattered micro-interactions.
  Use scroll reveals for narrative pacing and `--spring-easing` for confident, unhurried
  movement. `prefers-reduced-motion` is already respected (Zazz zeroes the duration).

Never ship generic AI aesthetics: overused system/`Inter`-style fonts, the lazy
violet-gradient-on-white centered hero, predictable layouts, cookie-cutter cards. Make choices
that feel designed for _this_ brand.

## Customizing without editing source

Tokens resolve lazily, so you can intervene at three scopes — pick the narrowest that works.
**Do not edit the `@zazzdesign/ui` package source (`packages/ui/src/`)** unless explicitly asked.

1. **Global** — redefine a semantic token on `:root` (`--radius-md: 0` squares every medium
   radius across the system).
2. **Component default** — redefine a component token (`--button-radius: var(--radius-full)` →
   all buttons go pill-shaped).
3. **Instance** — set the token inline or via a `data-*` variant
   (`style="--button-background: var(--secondary)"`).

## Building with components

1. Find the primitive in **`references/components.md`** (selector + `data-*` values + what
   powers it + docs link).
2. Get the real markup — fetch `/docs/components/{name}` or read
   `packages/ui/src/ui/{name}/*.html`. Adapt it; don't reinvent.
3. Apply variants via `data-*`; set spacing/color/type via semantic tokens & `text-*` classes.
4. Compose pages from the `.container` band system (`data-container` sets the band — on the
   container for its default, on a child to override that one; `data-variant="article"` for
   reading width) + flex/grid utilities. Responsive utilities are `@`-prefixed
   (`@md:grid-cols-2`); see `references/tokens.md` §7.

Forms share `--field-*` tokens and validate via `:user-invalid` (after blur/submit, never
while typing). Cards and avatars are composition patterns (utilities + theme tokens), not
dedicated CSS files. Tables are one `.table` class on a semantic `<table>` — variants
(`alternating`, `grid`), `data-layout="fixed"`, and caption `data-side="top"` are attributes;
every setting is a `--table-*` token.

## Modern APIs & JS behaviors

Author behavior in **HTML**; scripts enhance markup with light-DOM custom elements and
data-attribute hooks. Use `<ui-carousel>` for component carousels, `<ui-lightbox>` for
lightboxes, `<ui-password>` for password visibility toggles, `<ui-tabs>` for
orientation-aware tab keyboard navigation, and `<ui-toaster>` for toast notifications
(fired via `command="--toast"` or `window.Toaster`). Legacy lower-level Embla markup still uses
`data-carousel="root"`; scroll reveals use `data-reveal-*`. Tooltips (`interestfor`), dialogs
(`command`/`commandfor`), and popovers (`popovertarget`) use native invoker/popover APIs with
polyfills already loaded.

- Zazz hooks, custom elements, and the `data-carousel-*` / `data-reveal-*` catalogs →
  **`references/apis.md`**.
- How an API works + browser-support/fallbacks → the **`modern-web-guidance`** skill (first
  stop for any new HTML/CSS/JS API question; training data on these goes stale fast).

## Brand & design system

**`DESIGN.md`** is the brand layer: color roles, the fluid type scale, the three site
archetypes (Industrial Distributor / Lifestyle Brand / Editorial Studio), motion, and the
"fetch a brand URL → update tokens" customization workflow. Read it when establishing or
matching a brand. Page-level structure, the **sentence-case** house rule, and composition
patterns live in `PATTERNS.md`.

## Do / Don't

- **Do** commit to one bold, cohesive aesthetic direction and execute it precisely. **Don't**
  default to a timid centered stack of evenly-distributed grays.
- **Do** create atmosphere and real hierarchy (editorial serif-italic accents, band-system
  asymmetry, a staggered page-load reveal). **Don't** ship generic AI slop.
- **Do** write all UI text in **sentence case** — headings, buttons, links, labels, nav.
  **Don't** Title-Case or UPPERCASE unless asked (the eyebrow's caps come from `.text-eyebrow`).
- **Do** use `var(--token)` and semantic utilities. **Don't** hardcode colors, spacing, radii,
  or type.
- **Do** write `data-variant="primary"`. **Don't** invent `.button-primary` classes.
- **Do** let role tokens handle dark mode. **Don't** hand-write `.dark` overrides for
  token-handled values.
- **Do** reuse utilities/primitives. **Don't** add net-new CSS until you've ruled out a
  semantic option.
- **Do** preserve the loaded polyfills and modern-API markup. **Don't** edit the
  `@zazzdesign/ui` package source (`packages/ui/src/`) unless asked.

## Reference index

| Read                                                            | When                                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `references/tokens.md`                                          | Choosing spacing, color, type, radius, shadow, or layout tokens/utilities                                   |
| `references/components.md`                                      | Picking a component and its `data-*` API + docs link                                                        |
| `references/apis.md`                                            | Wiring custom elements, popovers/dialogs/tooltips, carousels (`data-carousel-*`), reveals (`data-reveal-*`) |
| `DESIGN.md`                                                     | Brand colors, type scale, archetypes, motion, brand customization                                           |
| `PATTERNS.md`                                                   | Page structure, the sentence-case rule, heading-group + CTA composition                                     |
| `modern-web-guidance` skill                                     | How a modern web API works + browser-support/fallbacks                                                      |
| `/docs/components/{name}` or `packages/ui/src/ui/{name}/*.html` | The canonical example markup (single source)                                                                |
