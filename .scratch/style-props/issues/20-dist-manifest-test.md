# 20 — DIST_CSS in manifest + dist.test.ts

Type: task
Status: resolved
Blocked by: 19
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/manifest.ts`
- `packages/core/src/manifest.test.ts`
- `packages/core/src/dist.test.ts`

## Task

Add `export const DIST_CSS` to `src/manifest.ts` describing the dist file map (path → source files), and make `build-dist.mjs` import it (compiled `src/manifest.js`) instead of hard-coding the list — or the reverse: keep the list in the script and have the manifest re-export it; pick one source of truth and say which. `src/dist.test.ts`: every `DIST_CSS` path exists under `dist/` (skip with a clear message if `dist/` is absent), each modular file starts with `@layer variables,`, contains no `@import`, and `zazz.css` rule count equals the sum of the parts (`{` count). Extend `manifest.test.ts` so every primitive with css has a `dist/primitives/<name>.css` entry. Root `ready` script already builds before tests.

## Answer

**Source of truth: `src/manifest.ts`.** `DIST_CSS: Record<string, string[]>` (`dist/`-relative file → `src/`-relative sources, in order) now lives in the published manifest next to `PRIMITIVES`, with `DIST_LAYERS_CSS = "layers.css"` and `DIST_BUNDLE_CSS = "zazz.css"` naming the two non-modular files. The primitive entries derive from `CSS_CASCADE_ORDER` + `PRIMITIVES[name].css`, so the script's 37-name list is gone (one list fewer to drift). The fileoverview documents it as the distribution map the CLI/docs can read; the JSDoc states the build contract (every file except `layers.css`/`zazz.css` is prefixed with the bundled `layers.css`; `utilities.css` = core + families; `zazz.css` = everything).

`scripts/build-dist.mjs` imports `{ DIST_CSS, DIST_LAYERS_CSS, DIST_BUNDLE_CSS }` from the compiled `../src/manifest.js` (same guard as `generate-properties.mjs`: `ERR_MODULE_NOT_FOUND` → `src/manifest.js is missing — run \`tsc -p tsconfig.json\` first`, verified by deleting the file). The `index.css` drift check is unchanged. Output is byte-identical to ticket 19 (`zazz.css` 338,792 B, 50 files, `sri.json` 132 hashes).

**`src/dist.test.ts`** (9 tests; `describe.skip` named `dist css (skipped: dist/ is absent — run \`vp run build\` first)` when there is no `dist/`, verified by moving it away):

- the `.css` files under `dist/` are exactly `Object.keys(DIST_CSS)` (nothing extra, nothing missing); none empty; no `@import` in any.
- `layers.css` begins with `@layer`, is statements only, and the top-level names (parsed from `_layers.css`'s order statement, not hard-coded) are first mentioned in order — lightningcss folds the statement into `@layer variables,reset,vendors;@layer legacy{…}@layer zazz{…}@layer overrides;`, so the test never greps for the six-name line. Whole-name matching: `zazz.components{` is not a mention of `zazz`.
- every modular file `startsWith(dist/layers.css)` verbatim (the build's actual contract, stronger than "starts with `@layer variables,`").
- `zazz.css` begins with `@layer` and mentions the top-level layers in order (there lightningcss drops `variables,reset` from the statement because their blocks open first).
- the parts `[base.css, primitives/*.css (cascade order), utilities.css]` have sources that concatenate to exactly `DIST_CSS["zazz.css"]` minus `_layers.css`.
- **the `{` invariant.** Naive `braces(zazz) === Σ braces(part) − duplicated prefixes` does not hold (2767 vs 2883): when lightningcss bundles all of `index.css` it merges *adjacent blocks with an identical prelude* across file boundaries. In this kit that is exactly the `@layer` wrappers (each source opens its own `@layer variables{}`, `@layer reset{}`, `@layer zazz.components{}`, `@layer zazz.utilities{}`: 84 openers in the parts → 6 in the bundle) and the `:root` token blocks inside them (46 → 10). Every other opener — style rules, `@property`, `@media`, `@container`, `@keyframes` — is one-for-one (verified by tallying every prelude in the bundle against the parts: those five are the only differences). So the asserted invariant is `stable(zazz) === Σ stable(part − prefix)` with `stable = braces − @layer{ openers − :root{ openers` (2751 = 2751 today), plus: the merged kinds only collapse (`0 < layerBlocks(zazz) ≤ Σ`, `0 < rootBlocks(zazz) ≤ Σ`) and every `@layer <name>{` a part opens is opened in the bundle. Same invariant for `utilities.css` vs `utilities-core.css` + the eight families. A new adjacent-identical prelude at a file boundary (say two consecutive primitives both ending/starting with the same `@media`) would fail the count; the merge itself is benign, so the fix is to confirm it with the prelude tally and add that kind to `stableBlocks`'s exclusions.

**`manifest.test.ts`** (+5 tests, "distribution css map"): the `dist/primitives/<name>.css` keys are exactly the primitives whose `css` is non-empty and each maps to `PRIMITIVES[name].css`; the keys follow `CSS_CASCADE_ORDER`; `DIST_CSS["zazz.css"]` equals `index.css`'s `@import` list (comments stripped) in order; `layers.css` is `_layers.css` alone and `utilities.css` is core + families; no file repeats a source and every source exists in `src/`.

Verified in `packages/core`: `vp run build` ok; `vp test` 180 passed / 1 skipped (pre-existing `tokens.test.ts`); `vp check` clean bar the pre-existing `generate-sri.mjs` warning. `packages/cli` `vp test` 140 passed (it loads the compiled `manifest.js`, still dependency-free ESM). Not done here: README dist section (21), CONVENTIONS build sentence (33).

## Comments
