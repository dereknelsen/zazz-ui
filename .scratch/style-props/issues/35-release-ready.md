# 35 — Release-ready checklist + after-numbers

Type: task
Status: open
Blocked by: 18, 20, 21, 25, 26, 29, 30, 31, 32, 33, 34, 36, 37
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/CHANGELOG.md`
- `.scratch/style-props/release.md`

## Task

1. `vp run build` in packages/core, re-run `.scratch/style-props/measure.mjs`, fill the "after" column of the measurements table in CHANGELOG.
2. `pnpm pack` in packages/core: confirm the tarball contains `migrations/0.5.0.json`, `dist/primitives/`, the family files, and `CHANGELOG.md`.
3. Build the CLI and run `zazz-ui diff` in a scratch vendored project against the packed tarball: the 0.5.0 slice prints with the BREAKING bullets.
4. `vp check` at root; `vp test` in packages/core, packages/cli (unit + e2e); `vp run docs#build` succeeds.
5. Write `.scratch/style-props/release.md`: the maintainer's manual steps per ADR-0010 and the `zazz-version-bump` skill (bumpp core → 0.5.0, set the changelog date, tag `core-v0.5.0`, publish; then CLI → 0.3.0, tag `cli-v0.3.0`, publish), plus the decision to skip a 0.4.2 README release. Do not bump versions or publish.

## Answer

## Comments
