# 24 — zazz-ui migrate command + registration + zazz.json stamp + README

Type: task
Status: resolved
Blocked by: 23
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/cli/src/commands/migrate.ts`
- `packages/cli/src/cli.ts`
- `packages/cli/src/config.ts`
- `packages/cli/README.md`

## Task

`packages/cli/src/commands/migrate.ts` following `commands/diff.ts`/`update.ts` patterns (kit resolution via `kit.ts`, output via `ui.ts`, errors via `errors.ts`). Usage: `zazz-ui migrate [paths...] [--to @0.5.0] [--from 0.4.1] [--rules <file>] [--write] [--include <glob>] [--exclude <glob>]`; globals (`--cwd/--silent/--yes/--registry/--offline`) apply. Dry-run is the default and prints a coloured unified diff per file (reuse the renderer approach in `diff.ts`; don't refactor it), per-rule counts, files-changed total, and the unmappable list (`file:line: snippet — note`). `--write` applies; exit 2 if unmappables remain.
Rules source: `--rules <path>` or `migrations/<to>.json` read from the resolved kit tarball exactly the way `CHANGELOG.md` is read in `update.ts`. `from`: `--from`, else `zazz.json` `migrated`, else `zazz.json` kit version, else error. Refuse when `from >= to` ("already migrated"). On `--write` in a vendored project, stamp `"migrated": "<to>"` in `zazz.json` (extend `config.ts` validate/serialize; optional string). Files: `**/*.{css,html,htm,md,mdx,js,jsx,ts,tsx,astro,vue,svelte}` via `fs.globSync`; skip `node_modules`, `dist`, `.git`, and the vendored `config.dir` (vendored files move via `update`). Register in `cli.ts` with the dynamic-import pattern. README: a "migrate" section + "Out of scope: JSX `style={{}}` merging, Vue/Svelte template expressions — those users migrate by hand using the table in the changelog". Recommended order: `migrate` then `update @0.5.0`. Keep the word "slot" out of flags and help text.

## Answer

Landed `packages/cli/src/commands/migrate.ts` (+ `migrate.test.ts` for its pure seams), the `migrate` registration in `cli.ts`, the optional `migrated` field in `config.ts` (validate + serialize, tests in `config.test.ts`), and a "What migrate does" README section. `vp check` and `vp test` green (125 tests incl. e2e). No e2e for migrate yet (ticket 25).

### Usage

```
zazz-ui migrate [paths...] [--to <version>] [--from <version>] [--rules <file>] [--write]
                [--include <glob>]... [--exclude <glob>]...
```

- `paths` — files or directories; default the cwd. Directories are walked for `**/*.{css,html,htm,md,mdx,js,jsx,ts,tsx,astro,vue,svelte}` via `fs.globSync`, never descending into `node_modules`, `dist`, `.git`, or the vendored `config.dir` (matched by absolute path, so a nested `src/zazz/` unrelated to the vendored dir is still scanned). A file named explicitly is taken as-is (if its extension is scanned) — explicit wins, even inside the vendored dir.
- `--to` — kit version, `@0.5.0` or `0.5.0`; default `latest`. Resolves the kit (all globals apply: `--registry`, `--offline`, `--prefer-offline`, `--cwd`, `--silent`, `--yes`) and reads `migrations/<kit.version>.json` from `kit.extractDir`, the way `update` reads `CHANGELOG.md`. A kit without that file fails with `@zazz-ui/core@X ships no migration rules (migrations/X.json)` + hint.
- `--rules <file>` — read the rules locally instead; no network. The file's `to` is the target; `--to` alongside must agree or the run fails.
- `--from` — the version the sources are on. Resolution: `--from` → `zazz.json` `migrated` → `zazz.json` `kit.version` → error (`cannot tell which kit version these sources are on`, hint names `--from`). Refused with `already migrated: this project is at X, the rules target Y` when `from >= to` (`compareVersions`). A warning (not an error) when `from` is outside the rules' `from` line (`0.4` ⊇ `0.4.x`).
- `--include` / `--exclude` — repeatable globs matched with `path.matchesGlob` against the cwd-relative posix path; include narrows, exclude drops.
- `--write` — apply; otherwise dry run.

Output (via `ui.ts`, so `--silent` hides everything but errors): a spinner `Scanned N files (from → to)`; a coloured unified diff per changed file (same `structuredPatch` + chalk rendering as `diff.ts`, copied not refactored); `Rules applied:` with `from → to` and the hit count per rule in declaration order (manual rules shown as `needle (by hand)`); `N of M files changed.`; a warning `Could not map N places — migrate these by hand:` with `file:line: snippet — note` lines. Binary files (NUL byte) are skipped.

### Exit codes

- `0` — done; nothing unmappable.
- `1` — `ZazzError`: no rules file in the kit, unreadable `--rules`, invalid rules, `from` unknown, already migrated, `--to`/`--rules` disagreement, missing positional path, kit resolution failure.
- `2` — completed but unmappables remain. Set in **both** dry run and `--write` (the list is the signal either way; matches `update`'s "needs a human" semantics). Writes still happen under `--write`.

### Stamp semantics (`zazz.json` `migrated`)

- Optional string, serialized right after `kit`, validated as a non-empty string. Absent until the first migrate.
- Written on every `--write` in a vendored project once the run completes — including when zero files changed and when unmappables remain (the automatic rewrites *have* been applied; a second run would double-shift the chain rules, which the engine documents as non-idempotent). Outside a vendored project (no `zazz.json`) nothing is stamped; `--from` is the only guard.
- It is the default `--from`, read ahead of `kit.version`. So: `migrate --write` at kit 0.4.1 stamps `0.5.0`; `update @0.5.0` then moves the vendored files and leaves the stamp; a later `migrate --to @0.5.0` is refused; a future `migrate --to @0.6.0` starts from `0.5.0`. `--from` overrides the stamp when the user knows better.
- `update` does not touch the stamp (not in this ticket's scope).

### Notes for ticket 25 / 27

- The outro after `--write` at a kit older than `to` ends with ``Next: `zazz-ui update @<to>`.``
- `ZAZZ_UI_KIT=file:<tgz>` + `XDG_CACHE_HOME` work as for update/diff; the fixture kit needs `migrations/<V2>.json` in the tarball for the kit path, or the test can pass `--rules`.
- Smoke-tested by hand against a scratch project: dry run/`--write`/second-run refusal/`--to` mismatch, and the packed real kit (0.4.1, no migrations) for the missing-rules error.

## Comments
