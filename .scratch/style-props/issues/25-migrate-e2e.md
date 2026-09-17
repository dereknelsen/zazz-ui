# 25 — Migrate e2e test

Type: task
Status: resolved
Blocked by: 22, 24
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/cli/e2e/migrate.test.ts`
- `packages/cli/e2e/fixture-kit.ts`

## Task

Read `e2e/global-setup.ts`, `fixture-kit.ts`, `update.test.ts`. Extend the fixture kit's newer version with a `migrations/<ver>.json` (shape from ticket 22) and add `e2e/migrate.test.ts`: a fixture project with a css file, an html file and a jsx file; dry run prints the diff and writes nothing; `--write` rewrites css tokens, html class prefixes (chain-safe) and data-container, reports the jsx `className={}` as unmappable with exit code 2, stamps `zazz.json`; a second run is refused as already migrated.

## Answer

Landed `packages/cli/e2e/migrate.test.ts` (3 tests) and extended `packages/cli/e2e/fixture-kit.ts`. `vp check` and `vp test` green in `packages/cli` (128 tests).

### Fixture kit

- New export `V2_MIGRATION`, shipped in the v2 tarball as `migrations/0.9.1.json` (v1 ships none). Shape mirrors `packages/core/migrations/0.5.0.json`: `from: "0.9"`, `to: "0.9.1"`, then a three-step `--breakpoint-*` token chain, the one-to-one `--gap-*→--space-*` family, a three-step `@xs:→@sm:→@md:→@lg:` class-prefix chain, a three-step `data-container=*` attr-value chain, and the two manual rules (`className={`, `[`). Every chain `to` is another rule's `from`, so the fixture would expose a chaining engine.
- Rules are read through the kit path (`ZAZZ_UI_KIT=file:…/kit-{version}.tgz` → `kit.extractDir/migrations/<to>.json`), not `--rules`, so the e2e covers resolution too.

### Test project

`runInit @0.9.0` (dir `zazz`) plus three sources: `src/styles.css` (`var(--gap-md)`, `var(--breakpoint-xs)` and `var(--breakpoint-sm)` side by side, an escaped `.\@xs\:grid` selector, `[data-container="xs"]`), `src/page.html` (`data-container="xs"`, `class="stack @xs:grid @sm:flex"`), `src/App.jsx` (`className={wide ? "@xs:grid" : "stack"}`). Output is captured from the non-interactive console path (log + warn) and ANSI-stripped, as in `diff.test.ts`.

### Covered

- **Dry run** — `Scanned 3 files (0.9.0 → 0.9.1)`, per-file unified diff with `-`/`+` lines for css and html, `Rules applied:` (`--gap-md → --space-md`, `className={ (by hand)`), `2 of 3 files changed.`, `Could not map 1 place` naming `src/App.jsx:2`, `Dry run — nothing written.`; sources and `zazz.json` byte-identical afterwards; `process.exitCode === 2`.
- **`--write`** — css becomes `--space-md` / `--breakpoint-sm` / `--breakpoint-md` (no `--breakpoint-lg`: chain-safe), `.\@sm\:grid`, `[data-container="sm"]`; html becomes `data-container="sm"` and `@sm:grid @md:flex` (no `@lg:`); jsx untouched and reported; exit 2; `zazz.json` has `migrated: 0.9.1` with `kit.version` still `0.9.0`; outro says `Rewrote 2 files … Next: \`zazz-ui update @0.9.1\`.`; the vendored `zazz/index.css` is not rewritten.
- **Second run** — rejects with `already migrated: this project is at 0.9.1, the rules target 0.9.1`; sources and `zazz.json` unchanged (a second pass would have shifted `@sm:` on to `@md:`).

### Notes

- Exit code 2 is asserted in the dry run as well, per ticket 24's semantics (the unmappable list is the signal either way).
- `--rules <file>`, `--include`/`--exclude`, and the missing-rules error are not exercised here; ticket 24's unit tests own the pure seams and the kit-without-rules path was smoke-tested by hand there.

## Comments
