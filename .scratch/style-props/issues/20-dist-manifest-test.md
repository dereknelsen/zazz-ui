# 20 — DIST_CSS in manifest + dist.test.ts

Type: task
Status: claimed
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

## Comments
