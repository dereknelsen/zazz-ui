# 32 — Docs prose sweep of existing pages

Type: task
Status: resolved
Blocked by: 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/foundation/utilities/{index,spacing,sizing,gap-and-basis,grid,flexbox,layout,responsive-design}.mdx`
- `apps/docs/content/docs/foundation/{variables,layers}.mdx`
- `apps/docs/content/docs/core-concepts/{utility-classes,layout}.mdx`
- `apps/docs/content/docs/templates/*.mdx`
- `apps/docs/content/docs/getting-started/llms.mdx`

## Task

Ticket 27 renamed tokens/prefixes mechanically; this ticket fixes the prose: sentences that explain `--gap-*` as the size scale now explain `--space-2xs…2xl` (values via `--step-*`), the breakpoint tables show sm/md/lg/xl/2xl at 40/48/64/80/96rem, `data-container` bands list the new names, each utility family page gets a one-paragraph "Open values: use a style prop" cross-link to `core-concepts/style-props`. Do NOT edit `core-concepts/responsive-design.mdx` (29) or absorb `.scratch/docs-drift/issues/03`. Run `vp run docs#dev` and skim every touched page.

## Answer

Prose-only sweep of 16 pages; no `meta.json`, no `core-concepts/responsive-design.mdx` (ticket 29), nothing from `docs-drift/03` absorbed. Every "Open values" paragraph links to `/docs/core-concepts/style-props` (ticket 29's page). Values come from `_variables.css` (`--space-2xs…2xl` = `--step-1/2/4/6/11/24/40`, `--spacing-interval` ≈ 3.6–4px; breakpoints 40/48/64/80/96rem) and `src/props.ts` (44 props × 6 forms).

### Page → what changed

- `foundation/utilities/index.mdx` — "Open values: use a style prop" paragraph after the family table (props read the same tokens, same `-sm…-2xl` suffixes, same layer, win by source order); coordination table now lists `--gap`/`--gap-x`/`--gap-y`/`--grid-cols`/`--grid-rows` as setters; prefix paragraph names the 40–96rem thresholds, the nearest-size-container `--bp-*` flags, and the prop suffixes.
- `foundation/utilities/spacing.mdx` — intro no longer says "gap tokens `--space-xs…xl`"; new "The scale" section explains `--space-2xs…2xl` as step multiples of `--spacing-interval` with a token/step/multiplier/px table, and that classes cover the middle five (`xs…xl`); "Open values" paragraph: the 17 spacing props, `--px: 6` == `px-md`, negative steps, the two limits (`--px: 1rem` invalid, `auto` stays a class).
- `foundation/utilities/sizing.mdx` — sentence mapping `sm…xl` → `--space-*` and `screen-*` → `--breakpoint-sm…2xl` (40–96rem); "Open values" paragraph for the 7 sizing props (raw values, suffixes); example caption fixed from "sm breakpoint" to "md breakpoint (48rem)" to match `max-w-screen-md`.
- `foundation/utilities/gap-and-basis.mdx` — sentence placing `gap-xs…xl` inside the `2xs…2xl` scale; "Open values" paragraph (`--gap: 6` == `gap-md`, suffixes, `--gap` feeds `--_gap` so fractions work); callout and coordination table mention `--gap`/`--gap-x`/`--gap-y`.
- `foundation/utilities/grid.mdx` — "Open values" paragraph (`--grid-cols` implies `display: grid`, sets `--_grid-cols`; `--grid-rows`/`--col-span`/`--row-span` mirror their classes; suffixes); coordination table lists the props as setters.
- `foundation/utilities/flexbox.mdx` — "Open values" paragraph for `--basis`/`--grow`/`--shrink`/`--order` (raw, suffixes; gap-aware fractions stay classes).
- `foundation/utilities/layout.mdx` — container intro says bands are the breakpoint scale `sm…2xl` (40–96rem), default `lg`; responsive-variant sentence names 48rem and the five prefixes; "Open values" paragraph after the insets table for the 6 position props (raw, logical insets, suffixes, don't set `position`).
- `foundation/utilities/responsive-design.mdx` — "How breakpoints work" rewritten: `--breakpoint-*` lengths + typed `--bp-*`/`--screen-*` flags; flags set by unnamed `@container` queries on `body *` from the nearest size container (body/main/section/article…), not the viewport, `--screen-*` via `@media` on `:root`; `@max-*` reads `style(--bp-*: false)`; mobile-first note; base-only section now says the *class prefixes* stop at the listed families while props take suffixes, with an "Open values" paragraph (every prop takes `-sm…-2xl`, incl. spacing/sizing/color/typography; `_utilities-spacing-responsive.css` is opt-in). Covers the coordinator's follow-up from ticket 29.
- `foundation/variables.mdx` — tier table adds `--bp-*`/`--screen-*`; instance-override section notes style props use the same inline mechanism; Spacing family bullet explains `--spacing-interval` → `--step-*` → `--space-2xs…2xl` (steps 1, 2, 4, 6, 11, 24, 40); Layout bullet gives 40/48/64/80/96rem and the two flag families; source-files paragraph says `_properties.css` (generated from `src/props.ts`) registers the props as `syntax: "*"; inherits: false` and they are not tokens.
- `foundation/layers.mdx` — import order sentence lists the bundle in `index.css` order: `_variables.css`, `_properties.css`, `_reset.css`, `_typography.css`, `_view-transitions.css`, primitives, `_utilities.css`, `_layout.css`, then `_utilities-spacing.css`, `_utilities-spacing-responsive.css`, `_utilities-sizing.css`, `_utilities-grid.css`, `_utilities-flex.css`, `_utilities-color.css`, `_utilities-typography.css`, `_utilities-position.css`; `zazz.utilities` row lists `_layout.css` and `_utilities-<family>.css`; new paragraph: family files load last so a prop beats a class, and `_properties.css` belongs to no layer.
- `core-concepts/utility-classes.mdx` — spacing escape hatch now points to a style prop instead of `--step-*` in custom CSS; shared-scale intro notes `--space-*` runs `2xs…2xl` and breakpoints `sm…2xl` (40–96rem); finer-steps sentence mentions `--p: 5`; new "Open values: use a style prop" section (44 props by family, step vs raw, suffixes).
- `core-concepts/layout.mdx` — three prose/example mismatches the codemod could not see: "caption comes back to md" → `lg`, "defaults to lg" under `data-container="xl"` → `xl`, "md, the default" → `lg`; band paragraph names the scale (`sm` 40rem … `2xl` 96rem, default `lg`); tuning paragraph gives the five values and says the `--bp-*` flags gate both prefixes and prop suffixes.
- `templates/index.mdx` — "four" → "five" system references; adds the Style props template entry (links `/docs/templates/style-props` and the concept page).
- `templates/layout.mdx` — "every band from `xs` to `bleed`" → `sm`.
- `templates/responsive.mdx` — "flags on `body`" → `--bp-*` flags from the nearest size container; mentions prop suffixes and the style-props template.
- `getting-started/llms.mdx` — core rules gain the new vocabulary: `--space-2xs…2xl` as step multiples (classes cover `xs…xl`); style props (`style="--px: 5; --w-md: 22rem"`, `--px: 6` is `px-md`); `@sm:…@2xl:` prefixes and `-sm…-2xl` suffixes at 40/48/64/80/96rem on `--bp-*` (`--screen-*` for viewport); `data-container` shares the names, default `lg`.
- Untouched on purpose: `templates/{about,components,forms,products}.mdx` (nothing stale; products already says the `sm` band, matching `products.html`).

### Verification

- `pnpm install` clean; `vp check --fix` re-aligned the widened tables; `vp check apps/docs/content/docs` → all 102 files formatted (oxlint reports "no files to lint" for `.mdx`, as before).
- `next dev` (after `tsc -p packages/core/tsconfig.json`, which the docs `dev` script runs first — without it `@zazz-ui/core/head` and `/manifest` fail to resolve): all 16 pages opened in agent-browser, no Build Error / runtime overlay, each new section present in the accessibility snapshot. Server stopped afterwards.

## Comments
