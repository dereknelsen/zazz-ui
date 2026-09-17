# 04 — _utilities.css sweep: --gap-→--space-, flags, breakpoint prefix shift

Type: task
Status: claimed
Blocked by: 03
Size: L

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities.css`

## Task

Edit only `_utilities.css` (6758 lines). Names are frozen in `.scratch/style-props/spec.md`.

1. Every `var(--gap-xs|sm|md|lg|xl)` → `var(--space-*)` (same letter). This covers padding/margin setters, `.gap-*`, `.w-*/.h-*/.min-*/.max-*`, inset/top/… utilities. Do not change any value.
2. Responsive blocks: the two groups of five `@container style(--is-breakpoint-X: true)` blocks become `style(--bp-Y: true)` with the shift xs→sm, sm→md, md→lg, lg→xl, xl→2xl, and every escaped class prefix inside shifts the same way (`.\@xs\:hidden` → `.\@sm\:hidden`, …, `.\@xl\:` → `.\@2xl\:`). Apply as ONE simultaneous mapping (write a tiny node script with a single regex alternation; never sequential sed — `@sm:` would shift twice). The 40rem block keeps its rules and becomes `sm`; the 96rem block becomes `2xl`.
3. `.w-screen-*` / any `--breakpoint-xs…xl` reads shift the same way (`--breakpoint-sm` = 40rem now).
4. Update section comments and the file header (`@uses style() queries — read --bp-* flags`).

Acceptance: `grep -c "is-breakpoint\|--gap-\|@xs" _utilities.css` = 0; rule count unchanged (`grep -o "{" | wc -l` before/after); `vp check` passes.

## Answer

## Comments
