# 07 — tokens.test.ts: guard the new token contract

Type: task
Status: resolved
Blocked by: 03
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/tokens.test.ts`

## Task

Add a vitest file (pattern: existing `src/**/*.test.ts`, node fs reads, see `head.test.ts`). Read `_variables.css` as text and assert: `--space-2xs…2xl` declared; `--gap-xs…xl` declared only as `var(--space-*)` aliases; five `@property --bp-*` and five `@property --screen-*` registrations; width thresholds map to the right flag (40→sm, 48→md, 64→lg, 80→xl, 96→2xl); no `--is-breakpoint`. Read every other `src/**/*.css` and assert no `--is-breakpoint`, no `--gap-(xs|sm|md|lg|xl)` reads, no `@xs` / `@max-xs` — mark the last two assertions `test.todo`/skip with a comment until tickets 04/05/06/27 land, then the merger flips them on.

## Answer

Added only `packages/core/src/base/tokens.test.ts` (node `fs` text reads, same shape as `head.test.ts` / `manifest.test.ts`). 10 tests: 7 live, 3 `it.skip` with a comment naming the ticket that flips each on.

### Live (guard `_variables.css` as merged by ticket 03)

- `--space-2xs…2xl` declared as the spec's step multiples (`--step-1/2/4/6/11/24/40`).
- Every `--gap-*` declaration in the file is exactly `--gap-{xs,sm,md,lg,xl}: var(--space-<same>)` — no other `--gap-` tokens, no literal values (compared as a whole list, so an extra or missing alias fails).
- `--breakpoint-sm…2xl` = 40/48/64/80/96rem; no `--breakpoint-xs`.
- Five `@property --bp-*` and five `@property --screen-*`, each with the exact `syntax: "true | false"; inherits: true; initial-value: false` shape (counted, so a sixth or a missing one fails).
- Width → flag maps compared whole: `@container (width >= N) { :where(body *) { --bp-X: true } }` and `@media (width >= N) { :root { --screen-X: true } }` must yield exactly `{sm:40, md:48, lg:64, xl:80, 2xl:96}` — wrong threshold, wrong selector, or an extra setter all fail.
- No `--is-breakpoint` anywhere in `_variables.css`.

### Skipped until the consumers migrate (the merger flips `it.skip` → `it`)

Each reports offenders as `path:line` (relative to `src/` or `examples/`), so the failure is actionable:

- **no `--is-breakpoint` outside `_variables.css`** — enable after **04** (`_utilities.css`) and **05** (`_layout.css`). Today: 21 hits in `_layout.css`, 12 in `_utilities.css`.
- **no `var(--gap-xs…xl)` reads outside `_variables.css`** — enable after **04**, **05**, **06**. Today: `_reset.css`, `_typography.css`, `_utilities.css` and 11 primitive stylesheets.
- **no `@xs` / `@max-xs` in `src/**/*.{css,html}` or `examples/*.html`** — enable after **27** (the codemod run; 04/05 cover the CSS side). Today: `_utilities.css`, `_layout.css`, `carousel.html`, `responsive-grid.html`, three `examples/` pages.

Verified by temporarily unskipping all three: each fails on the current tree with the lists above, then restored.

### Verification

- `packages/core` `vp run test` (tsc `tsconfig.test.json` + vitest): 16 files, 129 passed, 3 skipped.
- `packages/core` `vp check`: 201 files formatted, 0 lint/type errors. The one warning is pre-existing in `scripts/generate-sri.mjs:42` (untouched).

## Comments
