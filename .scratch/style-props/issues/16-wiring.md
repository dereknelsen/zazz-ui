# 16 — Wiring: index.css imports, head.ts BASE lists, package.json exports, manifest base entries

Type: task
Status: resolved
Blocked by: 09, 10, 11, 12, 13, 14, 15
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/index.css`
- `packages/core/src/head.ts`
- `packages/core/package.json`
- `packages/core/src/manifest.ts`

## Task

1. `src/index.css`: import `./base/_properties.css` right after `_variables.css`; import the seven family files plus `_utilities-spacing-responsive.css` AFTER `_utilities.css` and `_layout.css` (a style prop must beat a class on the same element by source order within `zazz.utilities`). Update the header comment.
2. `src/head.ts`: the base CSS lists (`BASE_CSS_PRE`/`BASE_CSS_POST` or whatever `head.test.ts` "mirrors index.css" checks) gain the same files in the same order; run `vp test` in packages/core and make `head.test.ts`/`manifest.test.ts` pass (add base entries to the manifest if its drift test requires it).
3. `package.json`: add `"./dist/*": "./dist/*"` to exports (ticket 19 fills dist).
4. Regenerate example heads: `vp run heads` (commit the diff — heads embed the base file list).

Acceptance: `vp test` and `vp check` pass in packages/core; `examples/index.html` loads with the new files (check no 404 with agent-browser against a static server).

## Answer

Wired in commit `0aaf481` (`feat(core): wire style-prop families into index.css, head.ts and exports`).

- `src/index.css`: `./base/_properties.css` imports right after `_variables.css` (with a note that it is generated from `src/props.ts`); after `_utilities.css` and `_layout.css` the style-prop block imports, in this order: `_utilities-spacing.css`, `_utilities-spacing-responsive.css`, `_utilities-sizing.css`, `_utilities-grid.css`, `_utilities-flex.css`, `_utilities-color.css`, `_utilities-typography.css`, `_utilities-position.css`. Header comment updated (layers → variables → properties → reset … classes → prop families; a prop beats a class by source order within `zazz.utilities`).
- `src/head.ts`: `BASE_CSS_PRE` gains `base/_properties.css` after `_variables.css`; `BASE_CSS_POST` is `_utilities`, `_layout`, then the eight family files in the same order. The granular CDN head (`buildHead({ cdn: { primitives } })`) therefore emits 16 base links.
- `src/head.test.ts`: the "mirrors index.css" test pins the 16-file list and additionally diffs it against the `@import "./base/_*.css"` lines of `index.css`, so the two can no longer drift silently.
- `src/manifest.ts`: unchanged. Its drift test only checks primitive directories, `CSS_CASCADE_ORDER` vs the `./primitives/` imports, and bare specifiers; base files have no manifest entry today (ticket 20 adds `DIST_CSS`).
- `package.json`: `"./dist/*": "./dist/*"` added to `exports` (after `./sri.json`); ticket 19 fills `dist/`.
- `src/base/_utilities.css`: header gains `@consumedby _utilities-spacing.css, _utilities-spacing-responsive.css, _utilities-sizing.css, _utilities-grid.css, _utilities-flex.css` (they `@requires` it for the `--_gap*` / `--_grid-*` coordination vars) and `@see docs/adr/0012-style-props.md`.
- `vp run heads` after `tsc -p tsconfig.json`: 0 files updated. Local-mode heads link only `index.css`, so the base list does not appear in `examples/*.html`; nothing to commit there.

Verification: `vp run test` in `packages/core` — 18 files, 161 passed, 2 skipped; `vp check` — 0 errors (1 pre-existing warning in `scripts/generate-sri.mjs`). Static server (`python3 -m http.server` at `packages/core`) + agent-browser: `examples/index.html` and `examples/layout.html` both render, all 16 `src/base/_*.css` requests return 200 (`_properties.css` and the eight family files included), console and page errors empty. The only 404 is `/favicon.ico`, pre-existing and unrelated.

Out of scope, noted for a later ticket: `packages/cli/src/plan.ts` keeps its own hard-coded `V1_BASE_CSS` list (7 files) that `init` vendors and `renderIndexCss` emits; it does not yet include `_properties.css` or the family files, so a CLI-vendored 0.5 kit would 404 on them. `packages/cli/src/wiring.test.ts` and `e2e/fixture-kit.ts` mirror that list. No style-props ticket covers this; the codemod ticket (27) or a small CLI ticket should.

## Comments
