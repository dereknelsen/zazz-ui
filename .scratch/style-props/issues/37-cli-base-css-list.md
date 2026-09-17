# 37 — CLI: vendor the 0.5 base css list (properties + prop families)

Type: task
Status: resolved
Blocked by: 16
Size: S

## Context

Read first: [spec.md](../spec.md), ticket 16's `## Answer`, `packages/cli/src/plan.ts` (`V1_BASE_CSS`, `renderIndexCss`), `packages/cli/src/wiring.ts` + `wiring.test.ts`, `packages/cli/e2e/fixture-kit.ts`, `packages/core/src/index.css` and `packages/core/src/head.ts` (`BASE_CSS_PRE`/`BASE_CSS_POST` — the authoritative order), ADR-0006/0009/0010.

## Files

- `packages/cli/src/plan.ts`
- `packages/cli/src/wiring.ts` (if the emitted `index.css` order lives there)
- `packages/cli/src/wiring.test.ts`, `packages/cli/e2e/fixture-kit.ts`, relevant e2e tests
- `packages/cli/README.md` (only if the vendored file list is documented there)

## Task

`zazz-ui init` vendors a hard-coded list of seven base css files and emits an `index.css` from it. A 0.5 kit adds `src/base/_properties.css` (after `_variables.css`) and the eight `_utilities-*.css` family files (after `_utilities.css`/`_layout.css`).

1. Preferred: derive the base css list from the kit itself so the CLI never needs a per-version table — the kit's `src/head.js` exports `BASE_CSS_PRE`/`BASE_CSS_POST` (check the exact export names and whether the tarball ships the compiled `.js`; the CLI already loads `src/manifest.js` from the extracted kit, so mirror that). Fall back to the hard-coded 0.4 list when the export is absent (older kits). Keep the `--legacy` cascade slot and comments `renderIndexCss` emits.
2. If deriving is impractical, add a `V2_BASE_CSS` list (16 files, order as in `packages/core/src/index.css`) selected by kit `manifestVersion`/version, and say why in the Answer.
3. Update `wiring.test.ts`, the fixture kit (its newer version should ship the extra files so the e2e proves the vendoring), and any `init`/`update` e2e expectations. `vp test` + `vp check` green in `packages/cli` (run `vp run core#build` first if the e2e setup needs it).

## Answer

Derived, not tabled — but from `src/index.css`, not from `head.js`. Checked the preferred path first: the tarball does ship the compiled `src/head.js` (the CLI already imports it for `buildHead`), but `BASE_CSS_PRE`/`BASE_CSS_POST` are module-private in `packages/core/src/head.ts` (its `export` line is `ESM_DEPENDENCIES, POLYFILLS, cdnUrl` only), and this ticket is `packages/cli/**`-only, so there is no export to read. The kit's `src/index.css` is in the tarball (`files: src`) and is what core's own `head.test.ts` diffs the head lists against, so it is the authoritative order; the CLI now reads it.

- `packages/cli/src/plan.ts`: new pure `parseBaseCss(indexCss)` — strips block comments (so the commented-out legacy/vendors slots are ignored), collects every live `@import "./base/_*.css"` line in file order, and splits it at the first `@import "./primitives/…"` into `{ pre, post }`. Returns `null` (→ fallback) when there are no primitive imports or no base imports on either side. `V1_BASE_CSS` stays as the documented fallback, now shaped `{ pre: [5], post: [2] }`; `baseCssLists()` returns the split, `baseCss()`/`baseFiles()` flatten it.
- `packages/cli/src/kit.ts`: `loadKitFromDir` reads `src/index.css` from the extract (when present) and attaches the parsed lists as `manifest.baseCss` (type `BaseCssLists`, replacing the never-produced flat `BASE_CSS` manifest-export read). `CORE_RUNTIME` handling unchanged.
- `packages/cli/src/wiring.ts`: `renderIndexCss` emits `pre` before the legacy slot and `post` after the primitives marker from the kit's lists instead of slicing a flat list by the pinned counts 5/2. Legacy slot, primitives marker and comments kept; the two comments now read "utilities, layout, and style props" so they are true for 0.4 and 0.5 kits. `add`'s insertion anchors (`Zazz primitives` marker, then `base/_utilities.css`) are unchanged and still land primitives before the whole post block.
- Result for a 0.5 kit: `init` vendors 16 base css (properties after variables; `_utilities-spacing.css` … `_utilities-position.css` after `_layout.css`) + runtime; `update` from a 0.4-shaped kit vendors the nine added base files and regenerates `index.css` in the target's order; a narrowed `update <name>` leaves the base platform (and the new files) alone. 0.4.x published kits also derive (their `index.css` has the same shape, 7 files); only a kit with no/unrecognized `index.css` hits the fallback.
- Tests: `src/plan.test.ts` (new; parser against the workspace `packages/core/src/index.css`, a 0.4 shape, comment/`layer()` handling, null cases, fallback counts), `src/kit.test.ts` (derived vs absent vs unrecognized `index.css`), `src/wiring.test.ts` (0.4 fallback = 7 imports; 0.5 lists in order around legacy + primitives = 16; `add` anchors on a 0.5 entry). E2e: `e2e/fixture-kit.ts` v1 ships no `index.css` (fallback), v2 ships a 0.5-shaped one plus `_properties.css` and the eight family stubs (`V2_PRE_BASE_ADDED`/`V2_POST_BASE_ADDED`); `e2e/update.test.ts` asserts they are vendored + recorded and `index.css` is ordered, and that the narrowed update excludes them; `e2e/init.test.ts` expects 27 recorded base files (16 css + 8 runtime + 3 generated) and the full order against the packed kit.
- `packages/cli/README.md`: the `init` sentence's parenthetical now lists style-prop registrations/families and says the list follows the kit version's `index.css`.

Verification in `packages/cli`: `vp test` — 13 files, 140 passed (after `pnpm install` and `vp run core#build`); `vp check` — all files formatted, no lint or type errors.

If a later core ticket exports the lists from `head.js`, `loadKitFromDir` is the one place to prefer them over the `index.css` parse.

## Comments
