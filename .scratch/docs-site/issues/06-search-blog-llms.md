# 06 Phase 5: search, blog, LLM endpoints

Status: resolved
Type: task
Blocked by: 02, 03

## Comments

- 2026-10-06: search — `astro-pagefind` indexes every `data-pagefind-body` article with `data-pagefind-filter="section:Docs|API|Blog"`; `Search.astro` renders results into the kit's command palette (`<ui-command data-command-hotkey="mod+k" data-command-filter="none" data-command-sort="document">`), grouped by section, excerpts from Pagefind. Relies on Phase 1's filter opt-out and item observer. The index is built at `astro build`; `astro dev` serves the last build's.
- 2026-10-06: blog — `blog` collection, `/blog/` index, `/blog/<slug>/` with the outline, `/rss.xml` (`@astrojs/rss`). One post, `zazz-0-5-alpha.mdoc`, `draft: true`: shown in dev, hidden in production builds and the feed.
- 2026-10-06: LLM endpoints — `src/lib/llms.ts` (tested: tag expansion to fenced fragments, tables, blockquotes; unknown tags never leak Markdoc syntax) feeds `/llms.txt` (orientation + every page as a `.md` link, grouped), `/llms-full.txt`, and `index.md` next to every docs, API, and blog page.
- 2026-10-06: review folded in. Blog dates format in UTC (frontmatter dates are UTC midnight; a negative-offset build showed the day before). Search clears its results and placeholder on `zazz:dialog-close` (the palette resets the input itself, so a reopen showed stale results under an empty field) and memoizes the Pagefind import. `Source:` lines in `llms-full.txt` and every `index.md` are absolute. Tag attributes may contain `%` inside quotes. RSS carries `<language>`. Verified by the reviewer: Pagefind escapes excerpt content before adding `<mark>`, so `innerHTML` is safe; slot contract matches `command.html`; `llms.txt` follows llmstxt.org.
- 2026-10-06: resolved.
