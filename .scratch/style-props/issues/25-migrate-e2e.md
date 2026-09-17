# 25 — Migrate e2e test

Type: task
Status: claimed
Blocked by: 22, 24
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/cli/e2e/migrate.test.ts`
- `packages/cli/e2e/fixture-kit.ts`

## Task

Read `e2e/global-setup.ts`, `fixture-kit.ts`, `update.test.ts`. Extend the fixture kit's newer version with a `migrations/<ver>.json` (shape from ticket 22) and add `e2e/migrate.test.ts`: a fixture project with a css file, an html file and a jsx file; dry run prints the diff and writes nothing; `--write` rewrites css tokens, html class prefixes (chain-safe) and data-container, reports the jsx `className={}` as unmappable with exit code 2, stamps `zazz.json`; a second run is refused as already migrated.

## Answer

## Comments
