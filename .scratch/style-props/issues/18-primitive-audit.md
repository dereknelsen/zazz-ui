# 18 — Primitive audit: --step-* in component rules → --ui-* per ADR-0008

Type: task
Status: claimed
Blocked by: 17
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/primitives/**/<name>.css (as found)`
- `.scratch/style-props/audit.md`

## Task

For every primitive css: list `var(--step-*)` and literal lengths used directly inside `@layer zazz.components` rules (not in the `:root` token block). For each, apply ADR-0008's four-part test (out of reach / design value / no existing fan-out / demand proof). Promote only passing cases to a `--ui-<name>-*` hook declared on `:root` in `@layer variables` (logical naming per CONVENTIONS §5; additive = non-breaking). Everything else stays; record the reason. Also confirm per primitive that a style prop on the root overrides the component's padding/size (layer order) — spot-check 5 with the page from ticket 17. Write `.scratch/style-props/audit.md` with the table. Do not rename any existing token.

## Answer

## Comments
