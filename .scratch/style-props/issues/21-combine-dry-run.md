# 21 — /combine/ dry run + README dist section

Type: task
Status: claimed
Blocked by: 19, 20
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/README.md`
- `.scratch/style-props/combine.md`

## Task

Simulate jsDelivr `/combine/` locally: concatenate `dist/layers.css` + `dist/base.css` + `dist/utilities-spacing.css` + `dist/primitives/button.css` in that order, load it in a scratch page with a `ui-button` carrying `style="--px: 8"`, and verify with agent-browser that it renders (fonts: the head loads Geist separately — note whether anything in the CSS references a relative URL; expected none). Write the findings and the exact future combine URL shape (`https://cdn.jsdelivr.net/combine/npm/@zazz-ui/core@0.5.0/dist/layers.css,npm/@zazz-ui/core@0.5.0/dist/base.css,…`) to `.scratch/style-props/combine.md`, and add a short "Load only what you use" section to `packages/core/README.md` listing the dist files (keep the existing CDN snippet; do not change versions).

## Answer

## Comments
