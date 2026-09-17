# 14 — _utilities-typography.css style props

Type: task
Status: resolved
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-typography.css`

## Task

Hand-write the typography style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: text-size line-height letter-spacing.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Raw values: text-size → font-size, line-height → line-height, letter-spacing → letter-spacing. Responsive blocks in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Added `packages/core/src/base/_utilities-typography.css` (18 rules, all in `@layer zazz.utilities`, nothing else touched — `index.css`/`head.ts` wiring is ticket 16).

- Base: `:where([style*="--text-size:"]) { font-size: var(--text-size) }`, likewise `--line-height` → `line-height`, `--letter-spacing` → `letter-spacing`. Raw values, no multiplication.
- Responsive: five `@container style(--bp-<bp>: true)` blocks in order sm, md, lg, xl, 2xl, each gating the three `-<bp>` forms — mobile-first by source order, same shape as `_layout.css`.
- Header documents: raw value mapping, the no-space-before-the-colon contract (`--text-size : 1rem` never matches the gate; `setProperty` serializes to the matching form), that unset props never apply (`syntax: "*"` with no `initial-value` + the attribute gate, so no `var()` fallback), that `inherits: false` scopes the prop while the resulting property still inherits, and that `--text-size:` does not match `--text-size-md:`.
- `modern-web-guidance` (`design-token-reactivity`, `usage-aware-component-variations`) confirmed: style queries need no `container-type`, and are Baseline Newly available (Chrome 111, Safari 18, Firefox 151) — inside the repo's browser policy, and already the mechanism `_layout.css`/`_utilities.css` rely on, so no fallback.
- Verified in Chrome via an uncommitted scratch page (`index.css` + `_properties.css` + this file) using `agent-browser get text` on a self-reporting `<pre>`: at 1200px `--text-size: var(--font-size-lg)` → `19.8188px` (identical to the resolved token), `--line-height: 2` → `32px`, `--letter-spacing: 0.25em` → `4px`, `--text-size : …` (space) stays `16px`, `--text-size: 10px; --text-size-md: 30px` → `30px` with `--bp-md: true`; at 500px the same element reads `10px` with `--bp-md: false` and the lg token tracks the fluid clamp (`18.2277px`).
- `vp check` passes in `packages/core`.

## Comments
