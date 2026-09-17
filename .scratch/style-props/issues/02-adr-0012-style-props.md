# 02 — ADR-0012: style props amend ADR-0008; CONTEXT.md term

Type: task
Status: resolved
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

Written: `docs/adr/0012-style-props.md` and a **Style prop** glossary entry in `CONTEXT.md` (after **Slot**, which is untouched).

- **Term + mechanism:** a style prop is `style="--px: 4"` read by `:where([style*="--px:"])` in `@layer zazz.utilities`; registered `@property { syntax: "*"; inherits: false }`; names are Tailwind roots with no prefix, suffix = breakpoint only.
- **ADR-0008 amended, not reversed:** its "adds zero capability" test stands; style props pass it on three counts raw inline style cannot match: responsive suffixes (`--px-md` inside `@container style(--bp-md: true)`), scale multiplication (× `--spacing-interval`), and coordination with private vars (`--gap` → `--_gap` for `.basis-1/N`; `--grid-cols` → `--_grid-cols`, implies `display: grid`). Rung 3 stays legitimate; the ladder becomes class → style prop → `--ui-*` inline → raw inline → CSS file (CONVENTIONS §5 wording is ticket 33).
- **Also recorded:** the value-shape rule from /SPEC.md §1; CSP is the same as rungs 2/3 (the `style` attribute is the thing blocked); the gate matches source text (`--px:` directly before the colon, which is what `setProperty` serializes); primitives never read props (they meet only via `zazz.utilities` ordering after `zazz.components`); adding a prop is a patch, renaming one is breaking (ADR-0010).
- `vp fmt --check` passes on all three files. `vp check` at the root reports 17 pre-existing formatting issues in other tickets' files and `spec.md`; left alone (other owners).
- Not done: no pointer appended to `spec.md` "Decisions so far", to avoid cross-worktree conflicts on that shared file. One line for the integrator: `02: ADR-0012 written; style props amend ADR-0008 (responsive suffixes, scale multiplication, private-var coordination); rung 3 stays.`

## Comments
