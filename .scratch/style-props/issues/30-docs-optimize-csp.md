# 30 — Docs: optimize.mdx + csp.mdx

Type: task
Status: resolved
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

Two new docs pages, each inserted into its section's `meta.json` (`optimize` after `file-anatomy`; `csp` after `head`, before `migrating`, which is where ticket 31 appends `upgrading`).

**`foundation/optimize.mdx` "Optimize your CSS"** (sentence-case headings, `Callout` for the SRI caveat): the `DIST_CSS` file map as a table (file, contents, layers) plus the primitive list in cascade order and the "`base.css` is the floor" rule; why load order cannot break the layers (every modular file is prefixed with the layer statement; the ticket-21 reversed-order result), with the two within-layer order rules that still hold (`utilities-spacing-responsive` after `utilities-spacing`; primitives in cascade order) and the one real use for `layers.css`; the dependency-closure rule with the ticket-21 button table (0px vs 10px padding) and a `resolveClosure` / `DIST_CSS` snippet from `@zazz-ui/core/manifest`; the `/combine/` grammar and recipe (README's `<version>` form), what the response looks like (header comment, no `url()`, immutable cache) and the no-SRI caveat quoting jsDelivr's header; async loading via `media="print" onload` and `rel="preload" as="style"` with `<noscript>`, scoped to below-the-fold primitives, plus the caution that `onload=""` is an inline handler a strict `script-src` refuses (with the `createElement("link")` alternative) and a cross-reference to the head page's "no preload for the blocking sheet"; DevTools Coverage steps with ticket 01's caveat (the panel counts whole `@layer` blocks as used, 1% unused; the changelog figure unions matched style rules only); the changelog measurements table verbatim, 0.5.0 column `tbd` and said so, with the ticket-21 dry-run bytes (64,740 vs 338,792) labelled as a dry run, not a release number.

**`getting-started/csp.mdx` "Content Security Policy"**: the directives the head template touches (`style-src`, `font-src`, `script-src`; import map and theme script are inline and need a nonce/hash); what a strict `style-src` blocks (the `style` attribute entirely, so rungs 2/3 and style props alike, with the three-line example); a callout that a blocked prop is worse than no prop on a primitive (the `[style*="--px:"]` gate still matches, the `calc()` is invalid at computed-value time, `padding-inline` becomes 0); what it does not block (CSSOM `setProperty` / `el.style.x`; `setAttribute("style")` blocked; `cssText` flagged as "Chromium allows, MDN says blocked, use `setProperty`"); framework note (client bindings are CSSOM, server-rendered HTML is an attribute and hydration does not reapply); why `'unsafe-hashes'` does not help open values; the options in order: classes + a stylesheet (with the `calc(8 * var(--spacing-interval))` and `@container style(--bp-md: true)` forms), a nonced `<style>` block (write the real property, a `<style>` rule setting `--px` never trips the attribute gate), and the ~20-line `data-style="--px: 8; --px-md: 12"` → `el.style.setProperty` script (custom properties only, `MutationObserver` for later content) with a warn callout that it needs a nonce/hash inline or must ship as a file, plus the paint-timing and untrusted-value notes; a closing "report-only first" section.

**Verified in a browser, not from memory.** A scratch page under `<meta http-equiv="Content-Security-Policy" content="style-src 'self'; script-src 'self' 'nonce-…'">` loading `src/index.css`, Chromium via `agent-browser`, `.ui-button[data-variant=primary]`:

| button | `padding-inline` | `--px` | gate `[style*="--px:"]` |
| --- | --- | --- | --- |
| control (no prop) | 10px | "" | false |
| `style="--px: 8"` in markup | **0px** | "" | true |
| `el.style.setProperty("--px", "8")` | 32px | "8" | true |
| `el.setAttribute("style", "--px: 8")` | 0px | "" | true |
| `el.style.cssText = "--px: 8"` | 32px | "8" | true |

Same markup with no policy: control 10px, attr prop 32px. So: the attribute is blocked and zeroes the button's padding (the callout's claim), CSSOM `setProperty` works and trips the gate, `setAttribute` is blocked, and `cssText` is *not* blocked in Chromium despite MDN listing it as blocked (the page says so and steers to `setProperty`). CSP3 §8.3 confirms `'unsafe-hashes'` extends to `style` attributes, which is why the page argues "one hash per exact attribute text, useless for open values" rather than "not covered".

**Checks.** `pnpm install`; `vp check` clean on the four files (oxfmt; oxlint has nothing to lint in MDX/JSON); `next dev -p 3456` from `apps/docs`, both pages opened with `agent-browser` (all headings render, sidebar order head → CSP → migrating, no console errors from this server), server stopped.

**Notes for later tickets.** `csp.mdx` links `/docs/core-concepts/style-props`, which ticket 29 creates; it 404s until 29 lands. `optimize.mdx`'s numbers table is copied from `CHANGELOG.md`; ticket 35 fills the 0.5.0 column in both places. The `modern-web-guidance` skill's local `SKILL.md` is out of date (`2026_05_16` vs `2026_09_04`); its security and performance guides were consulted for the report-only rollout and the `preload`/`media="print"` patterns.

## Comments
