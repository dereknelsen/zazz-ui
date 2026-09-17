# 06 — Base + primitive token sweep (--gap-*, --breakpoint-*)

Type: task
Status: resolved
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

Swept 14 files, 60 replacements (56 `var(--gap-X)` -> `var(--space-X)`, 4 `--breakpoint-*` shifts). Values unchanged: `--space-xs..xl` resolve to the same `--step-*` as the old `--gap-*`; each breakpoint shift keeps its rem (xs->sm 40rem, sm->md 48rem, md->lg 64rem).

| File | gap->space | breakpoint shift |
| --- | --- | --- |
| `base/_reset.css` | 1 | 0 |
| `base/_typography.css` | 8 | 0 |
| `primitives/alert-dialog/alert-dialog.css` | 1 | 0 |
| `primitives/command/command.css` | 0 | 1 (sm->md) |
| `primitives/dialog/dialog.css` | 13 | 2 (md->lg) |
| `primitives/fields/fields.css` | 2 | 0 |
| `primitives/input-group/input-group.css` | 1 | 0 |
| `primitives/lightbox/lightbox.css` | 11 | 0 |
| `primitives/mobile-menu/mobile-menu.css` | 8 | 0 |
| `primitives/navigation-menu/navigation-menu.css` | 6 | 1 (xs->sm) |
| `primitives/password-group/password-group.css` | 1 | 0 |
| `primitives/table/table.css` | 2 | 0 |
| `primitives/tabs/tabs.css` | 1 | 0 |
| `primitives/tooltip/tooltip.css` | 1 | 0 |

Checklist grep after the sweep: zero `--gap-` hits in `.css`; the only remaining `--breakpoint-` hits in `.css` are the four shifted (new-name) reads, which the literal grep still matches by design. One out-of-scope hit remains in `primitives/navigation-menu/navigation-menu-icon-grid.html:33` (`--breakpoint-sm` / `--gap-md`) -- `.html` is excluded by this ticket; left for the examples ticket (28).

`vp check` passes (one pre-existing lint warning in `scripts/generate-sri.mjs`, unrelated); `vp test` passes (15 files, 122 tests).

## Comments
