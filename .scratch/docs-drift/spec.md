# Docs drift audit — 2026-09-02

Full audit of `apps/docs/content/docs/**` against `packages/core/src/**`, run with four
parallel comparisons (utilities docs, concepts/foundation/getting-started/motion,
components A–M, components N–Z + scripts + templates).

## Fixed in the first pass (2026-09-02)

**CSS source bugs** (recorded in `packages/core/CHANGELOG.md` → Unreleased):

- `z-isolate` declared invalid `z-index: isolate` → now `isolation: isolate`
- `--ui-prose-figcaption-gap` consumed but undeclared → declared `0px` in `_typography.css`
- `global-view-transition--old` keyframes read the `--new` opacity token → now read `--old`
- Article `data-container="full"|"bleed"` referenced undeclared `--article-full/bleed` →
  now implement band semantics (full keeps gutters, bleed edge-to-edge) in `_layout.css`

**High-impact doc corrections**:

- `foundation/utilities/sizing.mdx` — named size values corrected (`--step-3`, `--gap-*`)
- `foundation/utilities/layout.mdx` — `no-scrollbar` → `scrollbar-none`; `top/bottom-0` rows
- `foundation/utilities/effects.mdx` + `hover.mdx` — scale sets corrected (no 95/105; added
  25/98/99/101/102); `shadow-none` semantics; role-coverage claims tightened
- `foundation/utilities/index.mdx` — `--_radius-*` logical names; composing-rule snippet;
  Managed-by lists include the logical aliases
- `core-concepts/colors.mdx`, `core-concepts/utility-classes.mdx` — phantom `border-border`
  and `size-8` removed; `border-{role}` coverage stated precisely
- Flat `--primary:` overrides → `light-dark()` pairs in colors, variables, extending,
  overview, installation
- Typography claims corrected in `core-concepts/typography.mdx`, `foundation/typography.mdx`,
  `getting-started/overview.mdx` (three tokens per step; heading vs body utility behavior;
  weight-only `.font-body/heading/strong`; `.font-serif` → `--font-heading`; figcaption-gap
  row added)
- `core-concepts/dark-mode.mdx` — theme-toggle example aligned to the head snippet's
  `theme` localStorage key; pins `.light` as well as `.dark`
- `core-concepts/responsive-design.mdx` — phantom `table-layout`/`caption-side` families
  removed; fractional `basis-*` marked base-only
- `getting-started/llms.mdx` — five-layer cascade; `--ui-` token prefix
- `getting-started/overview.mdx` — seven base stylesheets, not four
- `scripts/scripting.mdx` — export names, eleven custom elements, imports column,
  hotkeys/typeahead/command-score rows added
- `components/progress.mdx` — `height` → `block-size` token name

## Open issues

See `issues/`. One file per ticket, `Status:` line at top.
