# 34 — Regression: examples-migrated.test.ts + computed-style comparison vs 0.4.1

Type: task
Status: resolved
Blocked by: 27, 28
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/examples-migrated.test.ts`
- `.scratch/style-props/regression.md`

## Task

`src/examples-migrated.test.ts`: no rule `from` string of `migrations/0.5.0.json` remains in `examples/*.html` or `src/primitives/**/*.html`. Runtime check: `git worktree add /tmp/zazz-0.4.1 core-v0.4.1` (or `origin/main`), serve both trees statically, and with agent-browser at 600/900/1300px `eval getComputedStyle` on ~6 stable selectors per page (grid-template-columns, padding, gap, inline-size) for `layout.html`, `responsive.html`, `products.html`; record a side-by-side table in `.scratch/style-props/regression.md` and explain every difference (expected: none except ticket 28's intentional demos). Remove the temporary worktree.

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

## Answer

Two artefacts: `packages/core/src/examples-migrated.test.ts` (static sweep) and `.scratch/style-props/regression.md` (runtime comparison, tables + verdict), plus the probe that produced it, `.scratch/style-props/probe-computed.mjs`.

### Static sweep (`examples-migrated.test.ts`)

Loads `migrations/0.5.0.json` through the CLI's own `loadRules` and scans `examples/*.html` plus `src/primitives/**/*.html` (96 demo files). The rules cannot be applied literally as "no `from` may remain": most families are chain shifts, so a `from` such as `data-container=sm`, `@md:` or `--breakpoint-lg` is also another rule's `to` and is valid 0.5 markup (`layout.html` carries `data-container="sm"` today, as the migrated `xs`). Textual scanning cannot tell a migrated `xs` from an unmigrated `sm`, so the test splits the 100 mechanical rules (102 minus the two `manual` needles) into *retired* names (`from` of a rule, `to` of none, 28 of them: 5 `--is-breakpoint-*`, 5 `--gap-*`, `--breakpoint-xs`, `--container-xs`, `@xs:`, `@max-xs:`, 13 `*-screen-xs` classes, `data-container=xs`) and *live* names (the other 72), pins the retired count, and asserts every retired name is absent: tokens word/dash-bounded anywhere in the text, `data-container="xs"` literally, class names and prefixes inside `class="…"` (attribute-aware, multi-line), and a looser pass for the class names/prefixes in prose, comments and `<code>`. Offenders are reported as `path:line`.

One trap the first run caught: `--gap-lg` matched `responsive.html:303/308`, which is the `--gap` style prop's lg form in ticket 28's demo, not the retired size token. A retired token that is also a registered style prop (`propNames()` from `src/props.ts`) is therefore only matched as a `var(--gap-lg)` read, the same distinction `tokens.test.ts` draws for `_utilities-spacing-responsive.css`. 9 tests, all green.

### Runtime comparison (`regression.md`)

`git worktree add /tmp/zazz-0.4.1 aff8707` (origin/main, the 0.4.1 source; removed afterwards with `git worktree remove --force`), both trees compiled in place with `tsc -p tsconfig.json` so the pages' `../src/index.js` resolves, each served statically from its `packages/core` (its own `../src/index.css`, never `dist/`) by a Node http server, and driven over CDP in headless Chrome 153 the way `measure.mjs` does (`agent-browser eval` is blocked in this harness, so the probe injects `getComputedStyle` through `Runtime.evaluate` instead). Viewports 600/900/1300 × 900; 11 selectors on `layout.html`, 10 on `responsive.html`, 7 on `products.html`, all structural (`nth-of-type`, `.grid`, `.flex`, `:last-of-type`) so each row is the same element in both trees; properties `inline-size`, `grid-template-columns`, `grid-column-*`, `column-gap`/`row-gap`, `padding-*`, `display`, `flex-direction`, `flex-basis`, `justify-content`, `text-align`, plus body width and `scrollWidth`.

**Verdict: no regression.** Every resolved layout value is identical between 0.4.1 and 0.5.0 at all three widths, to the fourth decimal on the fluid steps (e.g. band widths 555.703 / 854.062 / 1024 px, gaps 14.7624 / 15.3084 / 16 px, the grid-columns demo 1 → 3 → 6 tracks, `basis-1/3` at `calc(33.3333% - 10.6667px)`); no horizontal scroll and no console errors or warnings anywhere. Exactly two kinds of cells differ, both intentional:

1. `grid-column-start/end` on band children read the *renamed* line names (`container-xs-*` → `container-sm-*`, `md` → `lg`, `xl` → `2xl`; 6 elements on `layout.html`, 2 on `products.html`), the ticket 05 line-name shift seen from the resolved style. The `inline-size` of each such element is identical, so the child sits on the same line under its new name.
2. The "Style props" block on `responsive.html` (ticket 28) has no 0.4.1 counterpart (`—` on the old side); on the new side it is `display: grid` from `--grid-cols` alone, 4 → 8 → 16 tracks, gap 3.69 / 3.83 / 12 px (`--gap: 1` → `--gap-lg: 3`). The `:last-of-type` alignment block after it is identical on both sides, so the insertion moved nothing.

Not covered: the other four example pages (changed only by the same codemod), Firefox/Safari.

### Verification

`packages/core`: `vp run test` (tsc + vitest) 19 files, 181 passed, 9 skipped; `vp check` 0 errors, the one pre-existing `generate-sri.mjs` warning. Temporary worktree removed (`git worktree list` no longer shows it).

Noted for later: the pre-commit hook's `vp check --fix` backs up to the shared stash on every commit (lint-staged); harmless but it touches the stash stack the worktree rules warn about.

## Comments
