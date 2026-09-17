# 32 — Docs prose sweep of existing pages

Type: task
Status: open
Blocked by: 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/foundation/utilities/{index,spacing,sizing,gap-and-basis,grid,flexbox,layout,responsive-design}.mdx`
- `apps/docs/content/docs/foundation/{variables,layers}.mdx`
- `apps/docs/content/docs/core-concepts/{utility-classes,layout}.mdx`
- `apps/docs/content/docs/templates/*.mdx`
- `apps/docs/content/docs/getting-started/llms.mdx`

## Task

Ticket 27 renamed tokens/prefixes mechanically; this ticket fixes the prose: sentences that explain `--gap-*` as the size scale now explain `--space-2xs…2xl` (values via `--step-*`), the breakpoint tables show sm/md/lg/xl/2xl at 40/48/64/80/96rem, `data-container` bands list the new names, each utility family page gets a one-paragraph "Open values: use a style prop" cross-link to `core-concepts/style-props`. Do NOT edit `core-concepts/responsive-design.mdx` (29) or absorb `.scratch/docs-drift/issues/03`. Run `vp run docs#dev` and skim every touched page.

## Answer

## Comments
