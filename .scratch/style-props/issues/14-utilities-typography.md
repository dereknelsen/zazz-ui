# 14 — _utilities-typography.css style props

Type: task
Status: claimed
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

## Comments
