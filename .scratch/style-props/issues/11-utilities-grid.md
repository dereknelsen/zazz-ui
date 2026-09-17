# 11 — _utilities-grid.css style props

Type: task
Status: resolved
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

Delivered `packages/core/src/base/_utilities-grid.css`: one file, everything in `@layer zazz.utilities`, four base rules then five `@container style(--bp-<bp>: true)` blocks in order sm, md, lg, xl, 2xl (24 rules). `index.css` and `head.ts` untouched (ticket 16 wires the import and should add this file to `_utilities.css`'s `@consumedby`). Names and target properties match `src/props.ts` exactly.

| prop | rule |
| --- | --- |
| `--grid-cols` | `--_grid-cols: var(--grid-cols); display: grid; grid-template-columns: repeat(var(--_grid-cols), minmax(0, 1fr))` |
| `--grid-rows` | `--_grid-rows: var(--grid-rows); grid-template-rows: repeat(var(--_grid-rows), auto)` |
| `--col-span` | `grid-column: span min(var(--col-span), var(--_grid-cols, 1))` |
| `--row-span` | `grid-row: span min(var(--row-span), var(--_grid-rows, var(--row-span)))` |

Two places mirror the class system rather than the ticket's literal text, on purpose: `--grid-rows` uses `auto` tracks and sets `--_grid-rows` exactly as `.grid-rows-N` does (the ticket's `minmax(0, auto)` would have diverged from the classes it coordinates with), and `--row-span` carries the same `min(N, var(--_grid-rows, N))` clamp as `.row-span-N` so a span never creates implicit rows when the parent declared a row count; with no `--_grid-rows` the fallback makes it plain `span N`, which is the ticket's shape. `--col-span` clamps to `var(--_grid-cols, 1)` as `_utilities.css` l.3028 does, so a child of a grid whose columns came from raw `grid-template-columns` spans 1, same as `.col-span-N`.

The header documents the contract: no space before the colon (`--grid-cols: 3` matches, `--grid-cols : 3` does not; `setProperty` serializes to the matching form), unset props never apply (attribute gate; `_properties.css` registrations carry no `initial-value`), responsive forms gate on the nearest size container and win by source order, values are integers, and `--grid-cols` sets `display: grid` after the class utilities so it beats `.hidden` on the same element (use `--grid-cols-md` for a grid that appears at a breakpoint).

Verified: `vp check` passes (one pre-existing warning in `scripts/generate-sri.mjs`); `vp run test` passes. Chrome via `agent-browser` on an uncommitted scratch page (linking `index.css` + `_properties.css` + `_utilities-grid.css` directly), read back with `getComputedStyle`: `--grid-cols: 3` → `display: grid`, three equal tracks, `--_grid-cols: 3` on the children; child `--col-span: 2` → `grid-column: span 2`; `--col-span: 5` in that grid → `span 3`; `--grid-cols: 2; --grid-cols-md: 4` in a 60rem container → four tracks, child `--col-span-md: 3` → `span 3`; `--grid-rows: 3` + child `--row-span: 5` → `span 3`; a `--col-span: 2` child of a `.grid.grid-cols-4` class parent → `span 2` (shared `--_grid-cols`); an element with no prop has no grid declarations; `--grid-cols : 3` matches nothing.

## Comments
