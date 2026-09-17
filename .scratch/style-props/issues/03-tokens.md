# 03 — Tokens: --space-*, --gap-* aliases, --bp-*, --screen-*, --breakpoint-* shift

Type: task
Status: open
Blocked by: —
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_variables.css`

## Task

Edit only `_variables.css`. Read the frozen design in `.scratch/style-props/spec.md` first.

1. Spacing (§6 of the file): add `--space-2xs: var(--step-1); --space-xs: var(--step-2); --space-sm: var(--step-4); --space-md: var(--step-6); --space-lg: var(--step-11); --space-xl: var(--step-24); --space-2xl: var(--step-40);`. Rewrite `--gap-xs…xl` as deprecated aliases `--gap-md: var(--space-md)` etc. with a comment "deprecated 0.5.0, removed 0.6.0". `--gutters: var(--space-md)`.
2. Breakpoints: rename length tokens to `--breakpoint-sm: 40rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem; --breakpoint-2xl: 96rem`.
3. Flags: replace the five `@property --is-breakpoint-*` registrations with `@property --bp-{sm,md,lg,xl,2xl}` (same syntax "true | false", inherits: true, initial-value: false) and the five `@container (width >= N)` blocks set `--bp-sm` at 40rem … `--bp-2xl` at 96rem. Fix the comment: the container-query subject is the nearest size container (unnamed query), not "the body container".
4. Viewport flags: add `@property --screen-{sm,md,lg,xl,2xl}` (same shape) and five `@media (width >= N) { :root { --screen-X: true; } }` blocks next to the container blocks.
5. Update the file header (`@requires _properties.css` stays — ticket 08 creates it).

Do NOT touch other files (04/05/06 own them). Acceptance: no `--is-breakpoint` string remains in this file; `grep -c "bp-" ` shows 5 registrations + 5 setters; `vp check` passes.

## Answer

## Comments
