# Zazz docs

The documentation site for the [Zazz Design Framework](../../packages/core): Astro 7, Markdoc content, Pagefind search, styled with Zazz itself.

## How it fits together

- **Content** is `.mdoc` under `src/content/`: `docs/` (guides), `api/` (reference), `blog/`. Frontmatter `section` / `order` / `sectionOrder` drive the sidebars (`src/lib/sidebar.ts`).
- **The API reference is generated.** `src/lib/api/*` reads the kit's own data — the utility table (`@zazz-ui/core/base/utilities.js`), the manifest, the editor JSON (`editor/*.json`), and each script's header — and the Markdoc tags `{% utilities %}`, `{% attributes %}`, `{% hooks %}`, `{% examples %}`, `{% behavior %}`, `{% tokens %}`, `{% switches %}`, `{% roles %}`, `{% globals %}` render it. Tests fail when a utility or primitive has no page or a hook lands nowhere.
- **Previews** (`{% preview src="button/button" /%}`) render a kit fragment in an isolated iframe and show the same string as code; the iframe's head is the kit's `buildHead()`.
- **`/zazz/*`** (`src/pages/zazz/[...path].ts`) serves the installed kit's `src/` and `dist/`; the site's own `<head>` is `buildHead()` too (`src/lib/head.ts`).
- **Playground** (`/playground/`): Monaco over a sandboxed iframe, code in the URL hash.
- **LLM endpoints**: `/llms.txt`, `/llms-full.txt`, and an `index.md` twin next to every page (`src/lib/llms.ts`).

## Development

From the repo root, after `vp install` and `vp run core#build` (the site links `packages/core/dist` in production builds and the kit's `src/` in dev):

```bash
vp run docs#dev      # astro dev at localhost:4321 (search uses the last build's index)
vp run docs#build    # static site in dist/
vp run docs#preview
vp run docs#test     # the lib unit tests and the content coverage tests
vp run docs#links    # broken internal links in dist/
vp run docs#check    # tsc --noEmit (astro check does not support TypeScript 7)
```

Hosting needs one header: `Access-Control-Allow-Origin: *` on `/zazz/*`, because the playground's sandboxed iframe loads the kit's module scripts cross-origin. `vercel.json` sets it for Vercel; `astro.config.ts` sets it for dev and preview.
