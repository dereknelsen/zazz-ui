# 19 — build-dist.mjs + lightningcss + vite.config.ts + build order

Type: task
Status: resolved
Blocked by: 16
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/scripts/build-dist.mjs`
- `packages/core/vite.config.ts`
- `packages/core/package.json`
- `pnpm-workspace.yaml`

## Task

Own all CSS output of `dist/`.

1. Add `lightningcss` to the workspace catalog (`pnpm-workspace.yaml`; 1.33.x is already in the lockfile) and as a devDependency of packages/core (`catalog:`).
2. `scripts/build-dist.mjs` (style of `generate-sri.mjs`): read `src/index.css`, parse its plain relative `@import` list (throw on `layer()`/media qualifiers), and emit via `lightningcss.bundle({ minify: true })` (no `targets` — do not let it downlevel `@container style()`, `@property`, `light-dark()`): `dist/layers.css` (the `@layer` order lines only), `dist/base.css` (_variables, _properties, _reset, _typography, _view-transitions), `dist/utilities-core.css` (_utilities + _layout), `dist/utilities-{spacing,sizing,grid,flex,color,typography,position}.css`, `dist/utilities-spacing-responsive.css`, `dist/utilities.css` (all utilities files), `dist/primitives/<name>.css` (one per primitive css), `dist/zazz.css` (everything in index.css order). Prepend the layer-order line to every modular file so `/combine/` order does not matter for layers. No `@import` may remain in any output.
3. `vite.config.ts`: remove the `style` entry and `css` block from `pack` (keep JS). `package.json` build: `tsc … && vp pack && node scripts/build-dist.mjs && node scripts/generate-heads.mjs && node scripts/generate-sri.mjs` (sri after dist so hashes cover the new files).
4. Confirm `dist/zazz.css` size is within a few % of the previous `vp pack` output and that `url()` in src are only `data:` URIs (no rewriting needed).

Acceptance: `vp run build` succeeds; `ls dist` matches the map; `dist/sri.json` lists the new files.

## Answer

`packages/core/scripts/build-dist.mjs` now owns every css file in `dist/`; `vp pack` only emits `dist/zazz.js`. Build order in `package.json`: `tsc → vp pack → build-dist → generate-heads → generate-sri` (`vp run dist` runs the css step alone). `lightningcss ^1.33.0` is in the workspace catalog and a `catalog:` devDependency of `packages/core` (1.33.0 resolved, same as the lockfile already had via vite).

**How it works.** The map is one exported constant, `DIST_CSS` (`dist file → src/-relative sources in order`), built from four small lists (`LAYERS`, `BASE`, `UTILITIES_CORE`, `UTILITY_FAMILIES`, `PRIMITIVES`) so ticket 20 can lift it into `manifest.ts` unchanged. Each output is a synthetic `@import` entry bundled with `lightningcss.bundleAsync({ minify: true })` and an in-memory `resolver.read` for the entry (the sync `bundle()` has no resolver hook, so the async form is used; no temp files in `src/`). No `targets` are passed. `src/index.css` stays the source of truth: the script parses its plain relative `@import` list (throws on `layer()`/`supports()`/media qualifiers or non-`./` specifiers) and refuses to build if `DIST_CSS["zazz.css"]` differs from that list in membership or order. Every modular file (all but `layers.css`/`zazz.css`) is prefixed with the bundled `_layers.css`; a guard throws if any `@import` survives. `url()` in src are `data:` URIs only (checked with grep); nothing is rewritten.

**File map (bytes, 2026-09-17):**

| file | bytes |
| --- | ---: |
| `dist/layers.css` | 159 |
| `dist/base.css` | 48,058 |
| `dist/utilities-core.css` | 125,398 |
| `dist/utilities-spacing.css` | 1,625 |
| `dist/utilities-spacing-responsive.css` | 8,102 |
| `dist/utilities-sizing.css` | 2,875 |
| `dist/utilities-grid.css` | 3,121 |
| `dist/utilities-flex.css` | 1,665 |
| `dist/utilities-color.css` | 1,411 |
| `dist/utilities-typography.css` | 1,609 |
| `dist/utilities-position.css` | 2,407 |
| `dist/utilities.css` | 146,757 |
| `dist/primitives/*.css` (37 files) | 560 (separator) … 11,297 (select); 158,813 total |
| `dist/zazz.css` | 338,792 |
| `dist/zazz.js` (vp pack, unchanged) | 47,295 |

`dist/sri.json` now hashes 132 files (was 83): 51 under `dist/` + the `src/` tree.

**Size comparison.** Previous `vp pack` output from the PR tip: 338,793 B. New: 338,792 B (−1 B, the trailing newline). Feature counts identical in both: `@container style(` ×65, `@property` ×297, `light-dark(` ×28. The only content diff is one rule (`[data-slot~=lightbox-counter]`) whose `inset-block-end` declaration now stays in source order instead of being moved after `pointer-events` by vite's older lightningcss; no semantic change.

**lightningcss caveats.**

- It folds the `@layer` order statement: `@layer variables, reset, vendors, legacy, zazz, overrides;` + the two sublayer blocks become `@layer variables,reset,vendors;@layer legacy{@layer imports,…;}@layer zazz{@layer components,…;}@layer overrides;` (159 B, `layers.css`). In `zazz.css` it additionally drops `variables,reset` from the statement because their `@layer variables{…}`/`@layer reset{…}` blocks open first — the statement lands at byte 71,266 after them. Verified first-appearance order is `variables < reset < vendors < legacy < zazz < overrides` in `zazz.css` (byte-identical layer structure to the vite output) and every modular file opens with the full six-name order. Semantically equivalent; just do not grep the dist for the literal six-name line.
- Without `targets` it does no syntax lowering and no prefixing; it does normalise colours/units and merge adjacent rules, which is why dist is a minifier output and not a concatenation.
- `bundleAsync`'s `read` hook is what allows a virtual entry; if a later ticket needs `resolve` (e.g. bare specifiers), it is on the same `resolver` object.
- Vite's own css pipeline previously ran the same lightningcss with its browserslist default (`last 2 versions, not dead`), which happened not to lower anything the kit uses; the new script removes that dependency on luck.

Verified: `vp run build` (packages/core) succeeds; `ls -R dist` matches the map; `vp test` 162 passed / 1 skipped; `vp check` clean (the one pre-existing warning is in `generate-sri.mjs`). `dist/` stays gitignored. Left for their own tickets: README dist section (21), `DIST_CSS` in `manifest.ts` + `dist.test.ts` (20), `CONVENTIONS.scripts.md`'s "tsc + vp pack" build sentence (33).

## Comments
