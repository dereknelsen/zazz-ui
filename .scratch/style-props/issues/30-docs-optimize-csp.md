# 30 — Docs: optimize.mdx + csp.mdx

Type: task
Status: claimed
Blocked by: 21, 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/foundation/optimize.mdx`
- `apps/docs/content/docs/foundation/meta.json`
- `apps/docs/content/docs/getting-started/csp.mdx`
- `apps/docs/content/docs/getting-started/meta.json`

## Task

`foundation/optimize.mdx` "Optimize your CSS": the dist file map (read `packages/core/src/manifest.ts` DIST_CSS), layers and why order doesn't matter for modular files, jsDelivr `/combine/` recipe from `.scratch/style-props/combine.md`, async loading (`media="print" onload` pattern or `rel=preload`), measuring with DevTools Coverage, and the honest numbers from CHANGELOG. `getting-started/csp.mdx`: strict `style-src` blocks the `style` attribute (props and raw inline alike; rung 2/3 of the ladder), CSSOM `setProperty` is not blocked (React/Vue/Svelte fine), `unsafe-hashes` doesn't help for attributes, options: classes-only, nonce'd `<style>`, the ~20-line `data-*` → `setProperty` script (include it). Insert into both `meta.json` (optimize after file-anatomy; csp after head). You own `getting-started/meta.json`; ticket 31 appends after you.

## Answer

## Comments
