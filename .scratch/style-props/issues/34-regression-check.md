# 34 — Regression: examples-migrated.test.ts + computed-style comparison vs 0.4.1

Type: task
Status: claimed
Blocked by: 27, 28
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/examples-migrated.test.ts`
- `.scratch/style-props/regression.md`

## Task

`src/examples-migrated.test.ts`: no rule `from` string of `migrations/0.5.0.json` remains in `examples/*.html` or `src/primitives/**/*.html`. Runtime check: `git worktree add /tmp/zazz-0.4.1 core-v0.4.1` (or `origin/main`), serve both trees statically, and with agent-browser at 600/900/1300px `eval getComputedStyle` on ~6 stable selectors per page (grid-template-columns, padding, gap, inline-size) for `layout.html`, `responsive.html`, `products.html`; record a side-by-side table in `.scratch/style-props/regression.md` and explain every difference (expected: none except ticket 28's intentional demos). Remove the temporary worktree.

## Answer

## Comments
