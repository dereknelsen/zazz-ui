# The docs site runs on Astro + Markdoc and generates its API reference from the kit

Status: accepted (2026-10-06). Replaces the Next.js + fumadocs app that documented 0.4.

## Context

- The 0.4 docs taught utility classes on 70 of 85 pages after the kit moved to 0.5; every API table was hand-written, so nothing stopped it drifting. The kit meanwhile grew machine-readable descriptions of itself: `base/utilities.ts` (the utility table), `manifest.ts`, `editor/zazz.{html,css,language,lint}-data.json`, and CSSDoc headers, all consumed by the language server and ESLint plugin.
- The old app rendered pages with React and Tailwind around iframes that were the only place Zazz CSS ran. A design-system site that does not use its own system cannot catch its own rough edges.
- The site needs search, a blog, a code playground, and plain-text endpoints for LLMs, all static.

## Decision

- **Astro 7 (static output) with Markdoc content.** Pages that are one-offs (home, playground, blog index) are `.astro`; content pages are `.mdoc` in content collections (`docs`, `api`, `blog`). Markdoc tags map to Astro components.
- **The API reference is generated at build.** `apps/docs/src/lib/api/*` reads the kit's data and the Markdoc tags (`utilities`, `attributes`, `hooks`, `examples`, `behavior`, `tokens`, `switches`, `roles`, `globals`) render tables from it. Tests fail the build when a utility in the table has no section, a primitive has no page, or a hook or attribute lands on no page. Prose stays hand-written; facts do not.
- **The site is styled with Zazz.** Its `<head>` is the kit's `buildHead()`; its markup follows `AUTHORING.md`. In development it links the kit's `src/` entry points, in production the `dist/` bundles.
- **Previews and the playground isolate the kit.** Preview iframes are same-origin `srcdoc` documents built from `buildHead()` around a fragment; the playground iframe is sandboxed (opaque origin), so user HTML cannot touch the site, which is why `/zazz/*` needs `Access-Control-Allow-Origin: *`.
- **Search is Pagefind inside the kit's command palette.** This needed one core change: `data-<prefix>-filter="none"` on the typeahead family, plus re-ranking when items are added or removed.
- **LLM surface is static:** `/llms.txt`, `/llms-full.txt`, and an `index.md` next to every page, produced by expanding the same Markdoc tags to Markdown. No chat endpoint.

## Considered options

- **Keep Next.js + fumadocs and rewrite the content**: rejected; the tables would still be hand-maintained, and the site would still not run Zazz.
- **Starlight**: rejected; its theme and components would compete with Zazz for the page.
- **Render Markdoc to Markdown for LLMs through the Astro container API**: rejected for now in favor of regex tag expansion over the Markdoc source, which is simpler and tested; revisit if the content needs richer conversion.

## Consequences

- `vp run core#build` must precede a production docs build (`siteHead()` throws otherwise).
- `astro check` does not support TypeScript 7; `.ts` is checked by `tsc --noEmit`, `.astro` templates by the build and the browser smoke pass.
- The `vite` catalog override (Vite+ core) satisfies Astro's `vite` dependency in practice; if a later Astro needs a newer Vite, scope the override.
- Hosting must set the CORS header on `/zazz/*` (`apps/docs/vercel.json` for Vercel).
