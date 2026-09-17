# 05 — _layout.css: flags, band names, data-container, @max-*, new 2xl

Type: task
Status: claimed
Blocked by: 03
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_layout.css`

## Task

Edit only `_layout.css`. The whole breakpoint vocabulary shifts one step (xs→sm … xl→2xl; user decision).

1. Flags: `style(--is-breakpoint-X: true|false)` → `style(--bp-Y: …)` with the shift; `.\@xs\:container` → `.\@sm\:container`, `@max-xs:` → `@max-sm:`, …, xl → 2xl.
2. Band grid: rename line names `container-xs-start/end` → `container-sm-start/end` … `xl` → `2xl`; `--breakpoint-*` reads follow ticket 03's names (`--breakpoint-sm` = 40rem). Keep the clamp math identical per band width.
3. `data-container="xs|sm|md|lg|xl"` selectors shift to `sm|md|lg|xl|2xl`; `full`/`bleed` unchanged. `--article-*` (ch scale) unchanged.
4. `--gutters` untouched (03 repoints it). Header comment updated.

Acceptance: no `is-breakpoint`, `@xs`, `container-xs`, `="xs"` strings; `vp check` passes; explain in the ticket Answer which band now maps to which rem.

## Answer

## Comments
