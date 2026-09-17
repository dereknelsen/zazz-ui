# 31 — Docs: Upgrading to 0.5

Type: task
Status: claimed
Blocked by: 24, 26, 30
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/getting-started/upgrading.mdx`
- `apps/docs/content/docs/getting-started/meta.json`
- `apps/docs/content/docs/getting-started/migrating.mdx`
- `apps/docs/content/docs/getting-started/installation.mdx`

## Task

New `getting-started/upgrading.mdx` "Upgrading to 0.5": what changed (link changelog), `zazz-ui migrate` walkthrough (dry-run → review → `--write` → `update @0.5.0` for vendored projects; CDN users: bump the pinned version then run migrate on their own files), the before→after tables (copy from CHANGELOG, they're guarded there), the chain warning, manual cases (JSX expressions, Vue/Svelte templates). `migrating.mdx` is about migrating legacy CSS to Zazz — add a callout at its top pointing to upgrading.mdx. Link from `installation.mdx`. Append `upgrading` after `migrating` in `meta.json` (ticket 30 already edited this file; rebase on it).

## Answer

## Comments
