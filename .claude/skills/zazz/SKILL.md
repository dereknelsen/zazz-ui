---
name: zazz
description: >-
  Build, style, and lay out web UI with the Zazz Design Framework — this repo's default design
  system. Use this skill WHENEVER you create or modify any page, component, layout, or styling
  here: buttons, badges, cards, tables, dialogs, menus, tooltips, tabs, accordions,
  carousels/lightboxes, breadcrumbs, forms (inputs, selects, switches, sliders, checkboxes,
  radios), navigation, heroes, sections. Also trigger for theming, dark mode, spacing/typography/color
  decisions, "make it look good / on-brand," or anytime CSS variables, design tokens, `data-ui`
  attributes, presets, or style utilities (`style="--p: 4"`) are involved. Zazz is zero-build,
  modern-web-API, token + data-attribute + utility driven — reach for it instead of hand-rolling CSS
  or pulling in Tailwind/shadcn.
---

# Zazz Design Framework

Zazz is the default design system for this project — a zero-build, modern-web CSS/UI kit (a
lightweight shadcn + Tailwind alternative that runs with **no build step**). Build with Zazz
before reaching for any other styling approach. This skill targets **Zazz 0.5** markup.

**Read `packages/core/AUTHORING.md` before writing markup.** It is the one-page source for the
syntax rules (identity, presets, slots, utilities, modifiers, hooks, layout, typography, theme).
This skill gives the mental model and design guidance; it does not restate those rules. The
full contract is `SPEC.md` at the repo root.

**Single source of truth for anatomy:** each component's markup lives once, in
`packages/core/src/primitives/{name}/*.html`, surfaced on the docs site at
`/docs/components/{name}`. Never invent or paste a second copy — read the real fragment and
adapt it. Never invent slot names or presets.

## How Zazz thinks (mental model)

Zazz markup has **no classes**. Every styling decision is one of four channels:

- **Identity** — what it is: `data-ui="button"` (space-separated tokens: `data-ui="card group"`),
  or a tag form where the wrapper would be a plain div (`<ui-tabs>`, `<ui-layout>`). Natives keep
  their tag: `<button data-ui="button">`, `<dialog data-ui="dialog">`.
- **Preset** — a named variant: `data-<identity>-<key>` (`data-button-variant="primary"`). The
  default is the _absence_ of the attribute.
- **Slot** — a part inside it: `data-<identity>-slot` (`<header data-dialog-slot="header">`).
- **Utility** — one value, in `style`: `style="--px: 6; --bg: var(--color-muted)"`. Spelling is
  exact (one space after each colon). Breakpoint tiers (`--grid-cols--md: 3`) on layout
  families; state tiers (`--bg--hover: …`) on color/effects. A tier needs a base unless the utility
  is on the tier-only list — see AUTHORING.md "Rules that bite".

Behind that:

- **Cascade layers, not specificity.** `@layer variables, reset, vendors, legacy, zazz, overrides`
  (`zazz` nests `components, plugins, utilities`). Utilities live in `zazz.utilities` at zero
  specificity and beat component rules; typography roles sit in `reset`. Don't fight the
  cascade with selector tricks.
- **Hooks theme primitives.** Every primitive reads `--ui-<identity>-<utility>` hooks (inheriting,
  same modifier grammar). Prefer: preset → hook on a subtree → utility on the one element. A utility on
  a primitive flattens its states; a hook keeps them.
- **Kit JS writes state** (`data-<identity>-state`, `data-ui-theme`). Read it in selectors; never
  author it.
- **Modern APIs do the work** (Popover, native `<dialog>`, Invoker Commands, anchor
  positioning, View Transitions, `<details>`) — native across the support floor. The head
  loads one polyfill, for Interest Invokers (`interestfor`) — preserve it.

## The golden rule: semantic first, specific as escape hatch

Start at the most semantic layer; get specific only when nothing semantic fits.

- **Spacing** → `var(--space-2xs … 2xl)` first; a scale number (`--p: 4`, × `--spacing`) or
  `--step-*` only when no space token fits. Never a raw px/rem.
- **Color** → `var(--color-<role>)` (`--color-foreground`, `--color-muted-foreground`,
  `--color-primary`, `--color-border`, `--color-destructive`…) so light/dark swap for free;
  literal scales (`--color-primary-600`, `--color-neutral-100`, `--color-shade-800`) only as a last resort.
- **Type** → a role: native `h1`–`h6`, or `data-ui="text-h3"`, `text-display`, `text-eyebrow`,
  `text-xs … text-xl`. Override one property with a utility; never rebuild a role from utilities.
- **Reuse over new CSS.** A preset, hook, or utility almost always exists. Reaching for a `<style>`
  block or a class is a signal you skipped one — check `references/tokens.md` first.

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
  timid, evenly-distributed grays read as slop. Route everything through `--color-*` roles so
  dark mode comes free, and don't treat the default blue-violet as a neutral.
- **Compose with tension.** Break the centered stack. The layout band system is built for it:
  play `--col: layout-bleed`/`layout-full` imagery against capped `lg`/reading-width text, use
  the left-label layout, overlap layers with `data-ui="grid-pile"`, and let `var(--space-xl)` open
  real negative space. Asymmetry and whitespace are choices, not accidents.
- **Build atmosphere, not flat fills.** Layer depth from tokens — gradient washes across a brand
  scale (`--color-primary-600` → `--color-primary-900`), `shade`/`tint` transparencies, subtle noise/grain,
  decorative `--color-border` rules. Keep surfaces flat and reserve `--shadow-*` for genuine
  elevation.
- **Spend motion where it counts.** One orchestrated page-load — staggered reveals via
  `data-reveal`/`data-reveal-each` on the hero — delights more than scattered micro-interactions.
  Use `--spring-easing` for confident movement. `prefers-reduced-motion` is already respected.

Never ship generic AI aesthetics: overused system/`Inter`-style fonts, the lazy
violet-gradient-on-white centered hero, predictable layouts, cookie-cutter cards.

## Customizing without editing source

Pick the narrowest scope that works. **Do not edit `packages/core/src/`** unless asked.

1. **Global** — redefine a token on `:root` (`--radius-md: 0` squares every medium radius; the
   theme inputs `--primary`, `--background`, … are set here and read through `--color-*`).
2. **Subtree** — set a hook on a region: `<nav style="--ui-button-px: 2">` or in a stylesheet
   (`.sidebar { --ui-button-rounded: var(--radius-full) }`). The shared `--ui-field-*` family is
   the widest lever: inputs/selects/textareas read it directly and button, toggle, tabs,
   checkbox/radio, and badge metrics default to it.
3. **Instance** — a preset, an inline hook (keeps states), or a utility (flattens states).

## Building with components

1. Find the primitive in **`references/components.md`** (identity, presets, slots, docs link).
2. Read the real fragment `packages/core/src/primitives/{name}/*.html`. Adapt it; don't reinvent.
3. Apply presets; set spacing, color, and type with utilities over tokens.
4. Compose pages from `data-ui="layout"` bands (`data-layout-size` sets the default band;
   `--col: layout-md` places one child) plus flex/grid utilities. See `PATTERNS.md` and the
   layout fragment `packages/core/src/primitives/layout/layout.html`.

Forms share `--ui-field-*` hooks and validate via `:user-invalid` (after blur/submit, never while
typing). Card is `data-ui="card"`; avatars and breadcrumbs are utility compositions (copy the
fragments). Tables are `data-ui="table"` on a semantic `<table>`.

## Modern APIs & JS behaviors

Author behavior in **HTML**; scripts enhance light-DOM markup. `<ui-carousel>`, `<ui-lightbox>`,
`<ui-password>`, `<ui-tabs>`, `<ui-toaster>` (fired via `command="--toast"` or
`window.Toaster`) and friends; parts are slots (`data-carousel-slot="viewport"`). Tooltips
(`interestfor`), dialogs (`command`/`commandfor`), and popovers (`popovertarget`) use native
invoker/popover APIs; only `interestfor` is polyfilled.

- Custom elements and the `data-carousel-*` / `data-reveal-*` catalogs → **`references/apis.md`**.
- How an API works + browser support → the **`modern-web-guidance`** skill.
- In development, add `<ui-debug data-debug-domains="localhost">` to catch unknown utilities, tiers
  without a base, flattened states, and misplaced presets.

## Brand & design system

**`DESIGN.md`** is the brand layer: color roles, the fluid type scale, the three site
archetypes, motion, and the "fetch a brand URL → update tokens" workflow. Page structure, the
**sentence-case** house rule, and composition patterns live in `PATTERNS.md`. Style overlays
live in `design-styles/`.

## Do / Don't

- **Do** commit to one bold, cohesive aesthetic direction. **Don't** default to a timid centered
  stack of evenly-distributed grays.
- **Do** write all UI text in **sentence case**. **Don't** Title-Case or UPPERCASE unless asked
  (the eyebrow's caps come from the `text-eyebrow` role).
- **Do** use `var(--token)` in utilities. **Don't** hardcode colors, spacing, radii, or type, or
  invent tokens — every `var(--…)` must exist in the kit.
- **Do** write `data-ui="button" data-button-variant="primary"`. **Don't** write classes,
  `data-variant`, `data-slot`, utility classes, or `class="dark"` (all 0.4).
- **Do** let `--color-*` roles handle dark mode; pin a scheme with `data-ui-theme`. **Don't**
  hand-write dark overrides for token-handled values.
- **Do** preserve the loaded polyfill and modern-API markup. **Don't** edit `packages/core/src/`
  unless asked.

## Reference index

| Read                                         | When                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/core/AUTHORING.md`                 | The markup rules: identity, presets, slots, utilities, modifiers, hooks       |
| `references/tokens.md`                       | Choosing spacing, color, type, radius, shadow, or layout tokens and utilities |
| `references/components.md`                   | Picking a component: identity, presets, slots, docs link                      |
| `references/apis.md`                         | Custom elements, popovers/dialogs/tooltips, carousels, reveals                |
| `DESIGN.md`                                  | Brand colors, type scale, archetypes, motion, brand customization             |
| `PATTERNS.md`                                | Page structure, sentence case, heading group + CTA composition                |
| `packages/core/src/primitives/{name}/*.html` | The canonical example markup (single source)                                  |
| `SPEC.md`                                    | The full contract, when AUTHORING.md doesn't settle a question                |
