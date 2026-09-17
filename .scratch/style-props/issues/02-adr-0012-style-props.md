# 02 — ADR-0012: style props amend ADR-0008; CONTEXT.md term

Type: task
Status: open
Blocked by: —
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `docs/adr/0012-style-props.md`
- `CONTEXT.md`

## Task

Write `docs/adr/0012-style-props.md` in the house ADR style (read 0008, 0010). Content: a **style prop** is an inline custom property (`style="--px: 4"`) read by a zero-specificity rule in `zazz.utilities` gated on `[style*="--px:"]`. It amends ADR-0008's "same-element hook variables add nothing" by naming exactly what raw inline style cannot do: (1) responsive suffixes (`--px-md` inside `@container style(--bp-md: true)`), (2) scale multiplication (numeric spacing × `--spacing-interval`), (3) coordination with private vars (`--_gap` → `.basis-1/N`, `--_grid-cols`). Rung 3 (raw inline style) stays legitimate. Record the CSP consequence (same as rung 2/3), the "value shape decides the mechanism" rule from /SPEC.md §1, and the naming rule: prop names are Tailwind roots without prefix; suffix = breakpoint.

`CONTEXT.md`: add a **Style prop** glossary entry (Avoid: slot, hook variable, inline token) and leave the existing **Slot** entry untouched. Keep the file's format.

## Answer

## Comments
