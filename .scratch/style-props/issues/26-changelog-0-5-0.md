# 26 — CHANGELOG 0.5.0 entry

Type: task
Status: claimed
Blocked by: 01, 22
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/CHANGELOG.md`

## Task

Write the `## 0.5.0 (unreleased)` block (ticket 01 created the header + measurements table; keep it). Contract: see `packages/cli/src/changelog.ts` and the intro paragraph of CHANGELOG.md — `### <scope>` only for primitives or `base` (a `### Measurements` heading would become a scope: keep measurements in the preamble). Preamble ≤ 12 lines: theme sentence ("open values move to style props, tokens collapse to one space scale, breakpoints take Tailwind's names — ADR-0012"), "run `zazz-ui migrate` (do not sed: the breakpoint shift is a chain)", the measurements table. `### base`: **BREAKING** bullets each ending with `Migration: …`: flags rename (table `| 0.4 | 0.5 |` for `--is-breakpoint-*`), prefix shift (table), `--breakpoint-*` shift (table), `--gap-*` → `--space-*` with new 2xs/2xl and aliases kept until 0.6.0 (table), `data-container` values (table), band line names; then non-breaking "New" bullets: style props (44 props × 6, `@property` registrations, `_properties.css`), `--screen-*`, dist file map, README "load only what you use". Every non-manual rule in `migrations/0.5.0.json` must appear as a table row (ticket 22's test checks both directions) — read the JSON and mirror it exactly.

## Answer

## Comments
