# 12 — _utilities-flex.css style props

Type: task
Status: resolved
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-flex.css`

## Task

Hand-write the flex style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: basis grow shrink order.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Raw values: basis → flex-basis, grow → flex-grow, shrink → flex-shrink, order → order. Responsive blocks in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Added `packages/core/src/base/_utilities-flex.css` (not yet wired into `index.css`/`head.ts`; ticket 16). Everything sits in `@layer zazz.utilities`:

- Base rules, one per prop, gated on the attribute text with zero specificity: `:where([style*="--basis:"]) { flex-basis: var(--basis); }`, likewise `--grow` → `flex-grow`, `--shrink` → `flex-shrink`, `--order` → `order`. Names and target properties match `src/props.ts` (flex family, kind `raw`, no multiplication).
- Five responsive blocks in source order sm, md, lg, xl, 2xl, each `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … var(--<name>-<bp>) } }`, so a larger suffix on the same element wins by source order (mobile-first).
- CSSDoc header documents the gate contract (prop name immediately followed by the colon, `--basis : x` does not match, `setProperty` serializes to the matching form, `--basis:` does not match `--basis-md:`), that unset props never apply (no rule matches, no `var()` fallback, no fight with a primitive's own declaration), `inherits: false` scoping, and that the flags are container flags, not viewport.

Verification: `vp check` passes (one pre-existing warning in `scripts/generate-sri.mjs`, unrelated); `vp test` 144 passed. Chrome via `agent-browser` on an uncommitted scratch page (`index.css` + `_properties.css` + `_utilities-flex.css`), reading `getComputedStyle` at 600 / 1200 / 1400 px:

| element | inline | 600px | 1200px (lg) | 1400px (xl) |
| --- | --- | --- | --- | --- |
| `--basis: 12rem` | flex-basis | 192px | 192px | 192px |
| its child (no prop) | flex-basis | auto | auto | auto |
| `--grow: 1; --grow-lg: 3` | flex-grow | 1 | 3 | 3 |
| `--shrink: 0` | flex-shrink | 0 | 0 | 0 |
| `--order: -1; --order-xl: 5` | order | -1 | -1 | 5 |
| no props | all | defaults | defaults | defaults |
| `--basis : 12rem` (space before colon) | flex-basis | auto | auto | auto |
| `ui-button` with `--grow: 2` | flex-grow | 2 | 2 | 2 |

The last row confirms the ADR-0012 cascade contract: `zazz.utilities` beats the button's `zazz.components` rule.

## Comments
