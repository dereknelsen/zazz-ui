# 06 — Base + primitive token sweep (--gap-*, --breakpoint-*)

Type: task
Status: claimed
Blocked by: 03
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_reset.css`
- `packages/core/src/base/_typography.css`
- `packages/core/src/primitives/{dialog,lightbox,mobile-menu,navigation-menu,table,fields,tabs,tooltip,input-group,password-group,alert-dialog,command}/*.css`

## Task

Replace every `var(--gap-X)` with `var(--space-X)` and every `--breakpoint-xs…xl` read with the shifted name (xs→sm … xl→2xl; same rem value) in the listed files. `git grep -n -e "--gap-" -e "--breakpoint-" packages/core/src/base/_reset.css packages/core/src/base/_typography.css packages/core/src/primitives` is the checklist. Values must not change. Do not touch `_utilities.css`, `_layout.css`, `_variables.css`, or any `.html`.

Acceptance: that grep returns 0 lines; `vp check` passes.

## Answer

## Comments
