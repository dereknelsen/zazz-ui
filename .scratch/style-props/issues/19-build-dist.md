# 19 — build-dist.mjs + lightningcss + vite.config.ts + build order

Type: task
Status: claimed
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

## Comments
