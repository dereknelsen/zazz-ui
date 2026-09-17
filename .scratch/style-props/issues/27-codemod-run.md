# 27 — Repo-wide codemod run (serial, sole owner)

Type: task
Status: open
Blocked by: 04, 05, 06, 16, 22, 24, 36
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/examples/*.html`
- `packages/core/src/primitives/**/*.html`
- `packages/core/src/primitives/**/*.css (remaining --breakpoint reads)`
- `apps/docs/content/**/*.mdx`
- `apps/docs/lib/*.ts`
- `.claude/skills/**/*.md`
- `packages/core/*.md`
- `README.md`
- `AGENTS.md`

## Task

This is the codemod's first real run and the only ticket allowed to touch these files broadly. Build the CLI (`vp run build` in packages/cli, or run via `node --experimental-strip-types src/cli.ts` if that's how e2e runs it) and execute from the repo root: `zazz-ui migrate --rules packages/core/migrations/0.5.0.json --from 0.4.1 --to 0.5.0 --write --exclude 'packages/core/CHANGELOG.md' --exclude 'packages/core/migrations/**' --exclude 'docs/adr/**' --exclude 'apps/docs/content/docs/getting-started/upgrading.mdx' --exclude '**/node_modules/**' --exclude '**/dist/**' --exclude '.scratch/**'` (add `--exclude 'packages/core/src/base/**'` since 03–06 already did those by hand). Review the diff file by file; fix anything the codemod could not map by hand (report list) and record those cases in this ticket's Answer — they are the codemod's known gaps. Then `vp run heads` in packages/core, `vp check` at root, `vp test` in packages/core. Enable the skipped assertions in `tokens.test.ts` (ticket 07) and confirm `git grep -n -e "is-breakpoint" -e "@xs:" -e "@max-xs" -e 'data-container="xs"' -e "--gap-"` returns only CHANGELOG/migrations/ADR/upgrading hits.

## Answer

## Comments
