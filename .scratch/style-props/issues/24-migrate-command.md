# 24 — zazz-ui migrate command + registration + zazz.json stamp + README

Type: task
Status: claimed
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

## Comments
