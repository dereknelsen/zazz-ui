# 11 — _utilities-grid.css style props

Type: task
Status: open
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-grid.css`

## Task

Hand-write the grid style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: grid-cols grid-rows col-span row-span.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). `--grid-cols` implies `display: grid`, sets `--_grid-cols: var(--grid-cols)` and `grid-template-columns: repeat(var(--_grid-cols), minmax(0, 1fr))`; `--grid-rows` → `grid-template-rows: repeat(var(--grid-rows), minmax(0, auto))` (check how `.grid-rows-N` does it today and mirror). `--col-span` → `grid-column: span min(var(--col-span), var(--_grid-cols, 1))` mirroring `_utilities.css` ~l.3026; `--row-span` → `grid-row: span var(--row-span)`. Responsive blocks in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

## Comments
