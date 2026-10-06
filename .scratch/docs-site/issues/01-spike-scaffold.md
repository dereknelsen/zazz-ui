# 01 Phase 0: spike and scaffold the Astro docs site

Status: resolved
Type: task

Plan: `~/.claude/plans/review-the-current-state-enumerated-hanrahan.md`. Replaces the Next.js + fumadocs app in `apps/docs` with Astro 7.3 + Markdoc + Pagefind, keeping the workspace name `docs`. Supersedes `.scratch/docs-drift/` (all five issues: the pages they audit are being rewritten).

## Comments

- 2026-10-06: old app copied to the session scratchpad (`old-docs/`) for reference; git history keeps it too. Kept in the repo: `public/*.png` favicons, `README.md` (to rewrite), `.gitignore` (rewritten for Astro).
- 2026-10-06: risk 1 (the catalog override `vite: npm:@voidzero-dev/vite-plus-core@0.2.4` vs Astro 7.3.6's `vite ^8.3.1`) — `astro build` resolves `vite` to vite-plus-core 0.2.4 (bundles Vite 8.1.3) and builds the spike cleanly, Pagefind index included. Not scoping the override unless a later phase (Monaco workers) breaks.
- 2026-10-06: risk 2 (`vp check` on `.astro`) — Oxfmt and Oxlint skip `.astro` files ("All matched files may have been excluded"), so `astro check` is the type/template check for the site; `vp check` still covers its `.ts`/`.mjs`.
- 2026-10-06: `astro check` refuses TypeScript 7 ("install TypeScript 6 instead"; its successor `@astrojs/ts-content-mapper` wants 7.1+, the catalog has 7.0.2). Dropped `@astrojs/check`; the docs `check` script is `tsc --noEmit` over the `.ts` sources, and `.astro` templates are verified by `astro build` plus the browser smoke pass.
- 2026-10-06: `packages/ui/` (75 tracked compiled files, no package.json, leftover from the ui→core rename) deleted per Derek; it was also the source of 4 type errors and 11 warnings in `vp check`. The remaining pre-existing `vp check` error is `packages/core/test/browser.ts` (`import.meta.glob` typing), untouched by this effort.
- 2026-10-06: resolved. Scaffold: `apps/docs/{package.json,astro.config.ts,markdoc.config.mjs,tsconfig.json,src/content.config.ts}`, catalog entries for astro 7.3.6, @astrojs/markdoc 2.0.10, astro-pagefind 2.0.1, @astrojs/rss 4.0.19, @lucide/astro 1.52.0, monaco-editor 0.57.0.
