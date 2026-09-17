# 22 — migrations/0.5.0.json + files entry + migrations.test.ts

Type: task
Status: resolved
Blocked by: 03, 05, 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/migrations/0.5.0.json`
- `packages/core/package.json`
- `packages/core/src/migrations.test.ts`

## Task

Create `packages/core/migrations/0.5.0.json`: `{ "from": "0.4", "to": "0.5.0", "rules": [ … ] }`, rule = `{ kind, from, to?, note? }`, kind ∈ `token | class-prefix | class | attr-value | manual`. Rules: tokens `--is-breakpoint-{xs,sm,md,lg,xl}` → `--bp-{sm,md,lg,xl,2xl}`; `--breakpoint-{xs..xl}` → `--breakpoint-{sm..2xl}`; `--gap-{xs..xl}` → `--space-{xs..xl}`; class-prefix `@xs:`→`@sm:` … `@xl:`→`@2xl:` and `@max-xs:`…`@max-xl:` likewise; attr-value `data-container` `xs..xl` → `sm..2xl`; manual: `className={` (JSX expression), `[` arbitrary values. Add `"migrations"` to `files` in package.json. `src/migrations.test.ts`: JSON validates (kinds, no self-maps, class-prefix mapping is a bijection over disjoint from/to sets so it is safe as a simultaneous map), and — drift guard — every non-manual rule appears as a `| \`from\` | \`to\` |` table row inside the `## 0.5.0` block of `CHANGELOG.md` and vice-versa (skip that half with a clear message until ticket 26 lands; the merger enables it).

## Answer

Landed `packages/core/migrations/0.5.0.json` (`{ "from": "0.4", "to": "0.5.0", "rules": [32] }`), `"migrations"` in `packages/core/package.json` `files`, and `packages/core/src/migrations.test.ts` (18 tests, 1 skipped). The test imports `loadRules` straight from `../../cli/src/migrate.ts` (core's `tsconfig.test.json` type-checks it fine: the module is fs-free and ES2022-only), so the file is validated by the exact code the command runs, not a mirror. `commands/migrate.ts` resolves `migrations/<kit.version>.json` inside the extracted tarball, so the file name must equal `to`; the test asserts that.

### Rule list (mirror this exactly in CHANGELOG `## 0.5.0`, ticket 26)

| kind | from | to |
| --- | --- | --- |
| token | `--is-breakpoint-xs` | `--bp-sm` |
| token | `--is-breakpoint-sm` | `--bp-md` |
| token | `--is-breakpoint-md` | `--bp-lg` |
| token | `--is-breakpoint-lg` | `--bp-xl` |
| token | `--is-breakpoint-xl` | `--bp-2xl` |
| token | `--breakpoint-xs` | `--breakpoint-sm` |
| token | `--breakpoint-sm` | `--breakpoint-md` |
| token | `--breakpoint-md` | `--breakpoint-lg` |
| token | `--breakpoint-lg` | `--breakpoint-xl` |
| token | `--breakpoint-xl` | `--breakpoint-2xl` |
| token | `--gap-xs` | `--space-xs` |
| token | `--gap-sm` | `--space-sm` |
| token | `--gap-md` | `--space-md` |
| token | `--gap-lg` | `--space-lg` |
| token | `--gap-xl` | `--space-xl` |
| class-prefix | `@xs:` | `@sm:` |
| class-prefix | `@sm:` | `@md:` |
| class-prefix | `@md:` | `@lg:` |
| class-prefix | `@lg:` | `@xl:` |
| class-prefix | `@xl:` | `@2xl:` |
| class-prefix | `@max-xs:` | `@max-sm:` |
| class-prefix | `@max-sm:` | `@max-md:` |
| class-prefix | `@max-md:` | `@max-lg:` |
| class-prefix | `@max-lg:` | `@max-xl:` |
| class-prefix | `@max-xl:` | `@max-2xl:` |
| attr-value | `data-container=xs` | `data-container=sm` |
| attr-value | `data-container=sm` | `data-container=md` |
| attr-value | `data-container=md` | `data-container=lg` |
| attr-value | `data-container=lg` | `data-container=xl` |
| attr-value | `data-container=xl` | `data-container=2xl` |
| manual | `className={` | — (note: JSX className expression; shift the prefixes by hand) |
| manual | `[` | — (note: arbitrary value in a class name; move to the matching style prop by hand) |

No `class` rules in 0.5.0. `--article-*` and `--gutters` are untouched (ticket 05), and no `--space-2xs` / `--space-2xl` / `--screen-*` / `--bp-*`-from rows exist because those are new names with no 0.4 source (write them as `| — | \`--space-2xs\` |` in the changelog; a non-code first cell is not a rename row).

### What the test guards

- Accepted by the CLI `loadRules`; `from`/`to` header; file is in `files` and exists; kinds ∈ the engine's five; manual rules carry a `note` and no `to`; no self-maps; no duplicate `kind:from`.
- Token families exactly as tabled; the two idempotent families (`--is-breakpoint-*`→`--bp-*`, `--gap-*`→`--space-*`) have targets disjoint from their sources; `--article-*` untouched.
- Class-prefix: exactly the ten shifts; bijection (distinct froms, distinct tos, same count); prefix-free froms (no `from` is a prefix of another, so one class token matches at most one rule in the engine's longest-first single pass); min/max families never cross.
- attr-value: exactly the five `data-container` shifts; manual: exactly `className={` and `[`.
- CHANGELOG drift guard on the `## 0.5.0` block: a *rename row* is a table row whose first two cells are each one code span. Forward half (every non-manual rule is a row) is `it.skip` with "Enable after ticket 26". Reverse half is live now (vacuously): every rename row whose first cell is rule-shaped (`--name`, `@prefix:`, `attr=value`) must be a rule; non-rule-shaped rows such as `container-xs-start` line names are ignored, so ticket 26 may tabulate them. A parser self-test pins that reading.

### Note on "disjoint from/to sets"

The ticket asked for the class-prefix map to be a bijection over *disjoint* from/to sets. That cannot hold literally for a chain shift: `@sm:` is both a `from` (→`@md:`) and a `to` (←`@xs:`), by design; the engine's doc says these chains are simultaneous within a run but not idempotent across runs (why ticket 24 stamps `migrated`). The invariants that actually make the map safe for one simultaneous pass are the ones tested: distinct froms, distinct tos, prefix-free froms. Disjointness is asserted for the two token families where it genuinely holds.

Verification: `packages/core` `vp run test` 161 passed / 2 skipped; `vp check` 0 errors (1 pre-existing warning in `scripts/generate-sri.mjs`).

## Comments
