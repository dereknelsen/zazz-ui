# 07 — tokens.test.ts: guard the new token contract

Type: task
Status: open
Blocked by: 03
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/tokens.test.ts`

## Task

Add a vitest file (pattern: existing `src/**/*.test.ts`, node fs reads, see `head.test.ts`). Read `_variables.css` as text and assert: `--space-2xs…2xl` declared; `--gap-xs…xl` declared only as `var(--space-*)` aliases; five `@property --bp-*` and five `@property --screen-*` registrations; width thresholds map to the right flag (40→sm, 48→md, 64→lg, 80→xl, 96→2xl); no `--is-breakpoint`. Read every other `src/**/*.css` and assert no `--is-breakpoint`, no `--gap-(xs|sm|md|lg|xl)` reads, no `@xs` / `@max-xs` — mark the last two assertions `test.todo`/skip with a comment until tickets 04/05/06/27 land, then the merger flips them on.

## Answer

## Comments
