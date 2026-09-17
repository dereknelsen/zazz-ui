# 36 — Codemod gap rules: *-screen-* classes and --container-* tokens

Type: task
Status: resolved
Blocked by: 26
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md), ticket 26's `## Answer` (the two gaps), `packages/core/migrations/0.5.0.json`, `packages/core/src/migrations.test.ts`, `packages/cli/src/migrate.ts` (rule kinds: `class` = exact class name rewrite inside class attributes; `token` = custom property).

## Files

- `packages/core/migrations/0.5.0.json`
- `packages/core/src/migrations.test.ts`
- `packages/core/CHANGELOG.md` (`### base` tables)

## Task

Ticket 04 shifted the `*-screen-*` utility class suffixes (`w-screen-xs` → `w-screen-sm`, … `xl` → `2xl`, for `w-`, `min-w-`, `max-w-`, `h-`) and ticket 05 shifted `--container-xs…xl` → `--container-sm…2xl`, but neither has a migration rule, so `zazz-ui migrate` would leave user markup pointing at the wrong width.

1. Add `class` rules for all 20 screen classes (`h-screen-{xs..xl}`, `w-screen-{xs..xl}`, `min-w-screen-{xs..xl}`, `max-w-screen-{xs..xl}` → one step up; check `_utilities.css` for the exact current class names and confirm there are exactly these four families). Add `token` rules `--container-{xs,sm,md,lg,xl}` → `--container-{sm,md,lg,xl,2xl}`. Both are chain shifts; the engine applies all rules in one simultaneous pass (ticket 23), so ordering is irrelevant, but keep the per-family disjointness/idempotency tests honest (extend the "chain families" list in the test rather than the "disjoint families" list).
2. Extend `migrations.test.ts` frozen tables for the new rules; keep both drift-guard directions green by adding the matching `| \`from\` | \`to\` |` rows to the CHANGELOG `### base` tables (a new bullet "**BREAKING** `*-screen-*` classes and `--container-*` tokens shift with the breakpoints. Migration: `zazz-ui migrate`." with its table). Replace the prose "manual step" note ticket 26 wrote for these two gaps.
3. `vp test` + `vp check` green in `packages/core`; `vp test` green in `packages/cli` (changelog parsing + migrate unit tests).

## Answer

Added 70 rules to `packages/core/migrations/0.5.0.json` (32 → 102): 65 `class` rules for the `*-screen-*` utilities and 5 `token` rules for `--container-xs…xl` → `--container-sm…2xl`. Both drift-guard directions stay green, and the two "shift by hand" notes ticket 26 left in `CHANGELOG.md` are replaced.

### Not four families: thirteen

The ticket guessed four families (20 names). `src/base/_utilities.css` defines thirteen, each `sm…2xl`: `w` / `inline`, `h` / `block`, `size`, `max-w` / `max-inline`, `max-h` / `max-block`, `min-w` / `min-inline`, `min-h` / `min-block` — the 65 names ticket 26 counted. All thirteen get rules, in the CSS's order. A new test reads `_utilities.css` and asserts the set of `class` rule targets equals the set of `*-screen-<size>` names the kit defines, so a family added or dropped there fails here, and no rule can target a name the kit stopped shipping. No `*-screen-*` class has a responsive (`@sm:`) variant, so exact `class` rules cover every occurrence; the engine's exact-then-prefix order means a prefixed token such as `@sm:flex` still only shifts its prefix.

### Tests (`migrations.test.ts`, 18 → 22)

- Token table gains `...shifted(--container-*)` after `--gap-*`. The "idempotent families disjoint" list is unchanged (`--is-breakpoint-`, `--gap-`); a new "chain families" test covers `--breakpoint-` and `--container-`: five rules each, every target but the last is also a source, the last (`-2xl`) is not.
- New `describe("class rules")`: family-by-family shift table, the `_utilities.css` coverage check above, family preserved per rule, bijection.
- `isRuleShaped` now treats a `<family>-screen-<size>` cell as rule-shaped, so the reverse guard rejects a screen-class row the rules file lacks; band line names (`container-xs-start`) stay non-rule-shaped and may still be tabulated. The sample-parsing test gains a screen row (rule-shaped count 3 → 4).

### CHANGELOG `### base`

- New bullet after the `.container` band table: "**BREAKING** `*-screen-*` classes and `--container-*` tokens shift with the breakpoints … Migration: `zazz-ui migrate` …", followed by the 5-row `--container-*` table and the 65-row class table (generated from the same family list as the rules, so the rows cannot drift from the JSON).
- `--breakpoint-*` bullet: "the `*-screen-*` class suffixes have no rule yet, so shift those by hand" → "rewrites the token reads and the `*-screen-*` class names (tabled with the `--container-*` tokens below)".
- `.container` bullet: "if your own CSS reads `var(--container-xs)` … shift those names one step by hand" → `--container-*` reads are rewritten; only the `container-*-start/end` grid line names remain manual, since line names are bare identifiers and no rule kind covers them.

### Verified end to end

Ran the real rules through `applyToText`: `class="w-screen-sm @sm:flex max-inline-screen-xl w-screen h-screen-xs"` → `"w-screen-md @md:flex max-inline-screen-2xl w-screen h-screen-sm"` (`w-screen` untouched, nothing reported); CSS `.w-screen-xs` → `.w-screen-sm`, `var(--container-md)` → `var(--container-lg)`, `--default-container-grid-column` and `container-md-start` untouched. A second pass shifts again, as every chain does; the `zazz.json` stamp guards that.

- `packages/core`: `vp test` 18 files, 166 passed / 1 skipped (ticket 27's sweep). `vp check` formatted, 0 errors, the pre-existing `generate-sri.mjs` warning only.
- `packages/cli`: `vp test` 12 files, 128 passed, twice in a row. One earlier run had `e2e/init.test.ts` fail at `tmpDir()`/`runInit` while `vp run build` and `vp check` were running in the same worktree (test time 54s vs 10–17s clean); it did not recur and is unrelated to these files.

## Comments
