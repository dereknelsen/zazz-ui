# 16 — Wiring: index.css imports, head.ts BASE lists, package.json exports, manifest base entries

Type: task
Status: open
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

## Comments
