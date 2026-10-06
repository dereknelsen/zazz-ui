# 03 Phase 2: site shell

Status: resolved
Type: task
Blocked by: 01

Layout, header (nav, search trigger, GitHub, light/dark/system toggle, mobile menu), footer (nav, acknowledgements, MIT, copyright, GitHub), home page, the three-column Docs/API layout with sidebar and outline, Markdoc tags (`preview`, `callout`) and heading anchors, Shiki dual themes, and the `/zazz/*` endpoint that serves the kit.

## Comments

- 2026-10-06: tests first for the pure pieces — `src/lib/kit.test.ts` (traversal guard, served-file filter, example reads), `src/lib/head.test.ts` (dev links `src/` entry points, production links `dist/` bundles; import map and theme script kept), `src/lib/sidebar.test.ts` (section/link ordering, current page, anchors), `src/lib/preview.test.ts` (script closure from the manifest, iframe document). 16 tests, `vp test run` in `apps/docs`.
- 2026-10-06: the site's `<head>` is the kit's own `buildHead({ base: "/zazz" })`, rewritten to `dist/zazz.css` / `dist/zazz.js` in production (one request each; the bundle keeps bare specifiers, so the import map stays). The kit CSS never passes through Vite's CSS pipeline (the browser harness avoids it for the same reason: minifiers rewrite `@property` / `light-dark()`).
- 2026-10-06: `astro build` renders 3 pages + 103 kit files + Pagefind index; smoke in Chromium via agent-browser at 1280 and 390 px: no horizontal overflow, theme toggle pins `data-ui-theme` and the preview iframe mirrors it, mobile disclosure nav renders. Fixed from the a11y snapshot: the heading anchor's label leaked into the heading name (the text is now its own anchor); heading roles shrunk per Derek's preference (h1 `text-h4`, h2 `text-h6`, h3 `text-lg`).
- 2026-10-06: reviewer pass folded in. High: `data-ui="text-link"` does not exist in the kit (only `AUTHORING.md`, `CONTEXT.md` (`text-lead`), and the skill's `tokens.md` mention it): replaced with `--text`/`--text--hover` utilities; the three docs get fixed in Phase 7. Nested `index` ids (`concepts/index.mdoc`) now route to `/docs/concepts/`. The `/zazz/*` CORS header was dropped by static output: removed; the playground's hosting rule comes with Phase 6. Medium: `siteHead()` throws when `packages/core/dist` is missing in a production build; preview ids are a deterministic counter; one Escape listener for all previews; the outline tracks the set of visible headings. Low: nav label, `inline-flex` for the header nav, heading anchor and callout icon moved to utilities. Kept: `summary data-ui="button"` (the mobile-menu fragment does the same).
- 2026-10-06: `vp run core#build` replayed its `tsc` step from cache while `src/base/utilities.js` was five days stale (missing `col-span`, `inset-x`, `DISPLAY_SHORTHANDS`); `pnpm exec tsc -p tsconfig.json` fixed it. Worth telling Derek: the task cache key does not seem to cover the emitted output.
- 2026-10-06: resolved.
