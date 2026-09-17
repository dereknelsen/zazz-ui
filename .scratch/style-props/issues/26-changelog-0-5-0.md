# 26 — CHANGELOG 0.5.0 entry

Type: task
Status: resolved
Blocked by: 01, 22
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/CHANGELOG.md`

## Task

Write the `## 0.5.0 (unreleased)` block (ticket 01 created the header + measurements table; keep it). Contract: see `packages/cli/src/changelog.ts` and the intro paragraph of CHANGELOG.md — `### <scope>` only for primitives or `base` (a `### Measurements` heading would become a scope: keep measurements in the preamble). Preamble ≤ 12 lines: theme sentence ("open values move to style props, tokens collapse to one space scale, breakpoints take Tailwind's names — ADR-0012"), "run `zazz-ui migrate` (do not sed: the breakpoint shift is a chain)", the measurements table. `### base`: **BREAKING** bullets each ending with `Migration: …`: flags rename (table `| 0.4 | 0.5 |` for `--is-breakpoint-*`), prefix shift (table), `--breakpoint-*` shift (table), `--gap-*` → `--space-*` with new 2xs/2xl and aliases kept until 0.6.0 (table), `data-container` values (table), band line names; then non-breaking "New" bullets: style props (44 props × 6, `@property` registrations, `_properties.css`), `--screen-*`, dist file map, README "load only what you use". Every non-manual rule in `migrations/0.5.0.json` must appear as a table row (ticket 22's test checks both directions) — read the JSON and mirror it exactly.

## Answer

Wrote the `## 0.5.0 (unreleased)` block in `packages/core/CHANGELOG.md` and enabled the forward half of the drift guard in `packages/core/src/migrations.test.ts` (`it.skip` → `it`), so both directions now run. No other file touched; the measurements table is unchanged.

### Shape of the block

- Preamble (2 paragraphs + the existing measurements table): theme sentence (open values → style props, one space scale, Tailwind breakpoint names — ADR-0012), "run `zazz-ui migrate`, do not sed: the breakpoint shift is a chain", pointer to `migrations/0.5.0.json` as the source the tables mirror. No `### Measurements` heading, so the CLI's parser sees one scope only.
- `### base`, five **BREAKING** bullets each ending in `Migration: …`, each followed by a `| 0.4 | 0.5 |` table: `--is-breakpoint-*` → `--bp-*` (5 rows), class prefixes `@*:` and `@max-*:` (10 rows), `--breakpoint-*` shift (5 rows), `--gap-*` → `--space-*` (5 rule rows plus `| — | \`--space-2xs\` |` and `| — | \`--space-2xl\` |`, non-code first cell so they are not rename rows), `data-container` values (5 rows) plus a band table whose first cell is prose (`xs → sm`) so the `container-*-start` line names and `--container-*` ranges are described without tripping the reverse guard. Every one of the 30 non-manual rules is a row; the two manual needles are covered in prose (JSX `className={…}` reported not rewritten; arbitrary values moved to props by hand).
- "New" bullets: style props (44 × 6 = 264, families and the resolved names including the four collision renames `border-color` / `text-size` / `line-height` / `letter-spacing`, gate, `@container style(--bp-*)`, `--_gap` / `--_grid-cols`, utilities-above-components, not a CSP workaround, `src/props.ts` + `vp run properties`); `--screen-*` viewport flags; the modular dist file map with "load only what you use, see _Optimize your CSS_" and no byte numbers promised; the ladder rung in `CONVENTIONS.styles.md` §5.
- `--gap-*` is stated as removed with **no aliases** (the ticket text still said "aliases kept until 0.6.0"; spec.md's amendment and ticket 08's resolution supersede that).

### Two manual migrations the codemod does not cover (flagged in the bullets)

1. `*-screen-*` utility class suffixes (`w-screen-xs` → `w-screen-sm` … `w-screen-xl` → `w-screen-2xl`, plus `h-`, `size-`, `min-`/`max-`, `inline-`/`block-` aliases): ticket 04 shifted them by rem, so an untouched `w-screen-sm` silently drops from 48rem to 40rem. There is no `class` rule in `migrations/0.5.0.json`. Candidate for a follow-up rule (kind `class`, 65 names) before release.
2. `--container-xs` … `--container-xl` line-range variables and `container-xs-start` … `container-xl-end` line names in consumer CSS (ticket 05). Not tabulated as rename rows because `--container-*` is rule-shaped and would fail the reverse guard without a matching rule; a `token` rule family for `--container-*` would be the clean fix.

### Verification

- `packages/core`: `vp test` 18 files, 162 passed / 1 skipped (the ticket-27 prefix sweep); `migrations.test.ts` 18/18 including "lists every non-manual rule" and "tabulates no rule-shaped rename the rules file lacks". `vp check` 0 errors (1 pre-existing warning in `scripts/generate-sri.mjs`).
- `packages/cli`: `vp test` 11 files, 125 passed (needs `vp run build` in `packages/core` first; the e2e global setup checks for `src/manifest.js`).

## Comments
