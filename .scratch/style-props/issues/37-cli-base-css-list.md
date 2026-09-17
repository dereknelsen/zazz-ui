# 37 — CLI: vendor the 0.5 base css list (properties + prop families)

Type: task
Status: claimed
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

## Comments
