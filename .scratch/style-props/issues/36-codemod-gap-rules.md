# 36 — Codemod gap rules: *-screen-* classes and --container-* tokens

Type: task
Status: claimed
Blocked by: 26
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md), ticket 26's `## Answer` (the two gaps), `packages/core/migrations/0.5.0.json`, `packages/core/src/migrations.test.ts`, `packages/cli/src/migrate.ts` (rule kinds: `class` = exact class name rewrite inside class attributes; `token` = custom property).

## Files

- `packages/core/migrations/0.5.0.json`
- `packages/core/src/migrations.test.ts`
- `packages/core/CHANGELOG.md` (`### base` tables)

## Task

Ticket 04 shifted the `*-screen-*` utility class suffixes (`w-screen-xs` → `w-screen-sm`, … `xl` → `2xl`, for `w-`, `min-w-`, `max-w-`, `h-`) and ticket 05 shifted `--container-xs…xl` → `--container-sm…2xl`, but neither has a migration rule, so `zazz-ui migrate` would leave user markup pointing at the wrong width.

1. Add `class` rules for all 20 screen classes (`h-screen-{xs..xl}`, `w-screen-{xs..xl}`, `min-w-screen-{xs..xl}`, `max-w-screen-{xs..xl}` → one step up; check `_utilities.css` for the exact current class names and confirm there are exactly these four families). Add `token` rules `--container-{xs,sm,md,lg,xl}` → `--container-{sm,md,lg,xl,2xl}`. Both are chain shifts; the engine applies all rules in one simultaneous pass (ticket 23), so ordering is irrelevant, but keep the per-family disjointness/idempotency tests honest (extend the "chain families" list in the test rather than the "disjoint families" list).
2. Extend `migrations.test.ts` frozen tables for the new rules; keep both drift-guard directions green by adding the matching `| \`from\` | \`to\` |` rows to the CHANGELOG `### base` tables (a new bullet "**BREAKING** `*-screen-*` classes and `--container-*` tokens shift with the breakpoints. Migration: `zazz-ui migrate`." with its table). Replace the prose "manual step" note ticket 26 wrote for these two gaps.
3. `vp test` + `vp check` green in `packages/core`; `vp test` green in `packages/cli` (changelog parsing + migrate unit tests).

## Answer

## Comments
