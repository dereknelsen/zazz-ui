# `/combine/` dry run (ticket 21)

Date: 2026-09-17. Build: `vp run build` in `packages/core` at `723d58d` (dist from ticket 19/20: 50 css files, `sri.json` hashes 51 `dist/` files + the `src/` tree). Browser: Chromium via `agent-browser`, viewport 1280×800, root font size 16px. Scratch pages, concatenations, and screenshots lived in the session scratchpad (`combine/`), not in the repo.

## What was simulated

jsDelivr's `/combine/` is a plain concatenation of the listed files in URL order (see "Real jsDelivr behaviour" for what it adds around them). Four local stand-ins, each loaded as the page's only stylesheet, with the head's Google Fonts link for Geist mirrored from `head.ts` (`fontsBlock`):

| variant | files (in order) | bytes |
| --- | --- | ---: |
| A `a-ticket` | `layers.css` + `base.css` + `utilities-spacing.css` + `primitives/button.css` (the ticket's list) | 57,977 |
| B `b-closure` | A + `primitives/fields.css` + `primitives/kbd.css` (button's manifest closure) | 64,740 |
| C `c-reversed` | B in reverse file order (`button, kbd, fields, utilities-spacing, base, layers`) | 64,740 |
| D `d-bundle` | `zazz.css` (reference) | 338,792 |

Markup: `<button class="ui-button" data-variant="primary" style="--px: 8">` (probe) beside the same button without the prop (control). A script wrote computed styles into a `<pre>` (read with `agent-browser get text "#out"`); the page also measured `calc(8 * var(--spacing-interval))` directly to get the expected padding.

## Findings

**1. It renders, and the style prop works in every variant.** Probe `padding-inline` = 32px in A, B, C, and D, equal to the measured `8 * --spacing-interval` (4px at 1280px). `--px` needs only three things and all three are in the ticket's list: the `@property --px` registration (`base.css` ← `_properties.css`), `--spacing-interval` (`base.css` ← `_variables.css`), and the `:where([style*="--px:"])` rule (`utilities-spacing.css`).

**2. Dependency note: the button needs `fields.css` (and `kbd.css`).** `PRIMITIVES.button.primitives` is `["kbd", "fields"]`; `resolveClosure(["button"])` → `["fields", "kbd", "button"]`. `button.css` defaults every metric to the `--ui-field-*` family that `fields.css` owns (`--ui-button-padding: var(--ui-field-padding)`, likewise font size, line height, border width/style, ring colour). Variant A therefore renders a button with the prop applied but otherwise unsized:

| | A (no fields) | B / C (closure) | D (bundle) |
| --- | --- | --- | --- |
| control `padding-inline` | 0px | 10px | 10px |
| `font-size` / `line-height` | 16px / 25.6px (inherited) | 12.8px / 12.8px | 12.8px / 12.8px |
| `border-width` / `border-radius` | 0px / 0px | 1px / 10px | 1px / 10px |
| control box | 55.52 × 25.59 | 66.42 × 32.00 | 66.42 × 32.00 |
| probe box | 161.94 × 25.59 | 144.36 × 32.00 | 144.36 × 32.00 |

B is pixel-identical to the bundle for this markup. `kbd.css` only matters when a `<kbd>` sits inside the button (`--ui-kbd-*`), but it is in the closure, so the documented URL should carry it: a `/combine/` list is a dependency closure, not a wish list. The manifest (`resolveClosure`) is the tool for computing it; the CLI and `head.ts`'s granular mode already do.

**3. File order is layer-insensitive.** C (fully reversed) produced byte-for-byte the same computed styles as B. Every modular `dist/` file is prefixed with the bundled `layers.css` (ticket 19's build contract), so whichever file comes first establishes `variables < reset < vendors < legacy < zazz < overrides` and the later copies are no-ops; every rule sits inside a named layer, so nothing depends on which file opens a layer. The browser sees the statement six times (Chromium reports 312 `cssRules` for B versus 308 for D: the extra are the repeated statements). Caveat: order *within* a layer is still source order. ADR-0012's "a prop beats a class" relies on `utilities-spacing.css` following `utilities-core.css`, and primitives follow `CSS_CASCADE_ORDER`. So the documented order stays the `DIST_CSS` key order (which is `zazz.css` order); the finding is that a mistake there degrades gracefully instead of breaking the cascade.

**4. No `url()` at all in `dist/`.** `grep -o "url(" dist/zazz.css` matches nothing (ticket 19 said `data:` only; the current build has none of either). No `@font-face`, no `@import` (the build guards against the latter). Fonts are the head's job: the kit sets `font-family: Geist, ui-sans-serif, …` and the computed `font-family` resolved to Geist through the Google Fonts link in every variant. Nothing in the CSS is relative to its own URL, so `/combine/` (whose response URL is `/combine/…`, not the package path) cannot break a reference.

**5. Real jsDelivr `/combine/` behaviour, verified against the published `0.4.1`.** Fetched `npm/@zazz-ui/core@0.4.1/dist/zazz.css` three ways:

| URL | bytes | notes |
| --- | ---: | --- |
| `/npm/…/dist/zazz.css` | 304,258 | `x-jsd-version: 0.4.1`, `cache-control: immutable` |
| `/combine/npm/…/dist/zazz.css` | 304,577 | +319 B: a header comment and a `/*# sourceMappingURL=/sm/<sha256>.map */` trailer; the body is byte-identical (28 `light-dark(`, 28 `@property`, 10 `@layer` in both) |
| `/combine/…/dist/zazz.css,…/src/base/_layers.css` | 305,381 | the unminified `src/` file is appended as-is, comments included: `/combine/` does not minify unless you ask for `.min.css` |

The header reads: `Combined by jsDelivr. Original files: … Do NOT use SRI with dynamically generated files!` (https://www.jsdelivr.com/using-sri-with-dynamic-files). So a `/combine/` link carries **no `integrity` attribute**. This is the same class of resource `head.ts` already refuses for `/+esm` (regenerated by jsDelivr's toolchain, so a pinned hash can rot). `dist/sri.json` hashes all 51 `dist/` files individually, so a page that wants SRI loads the same files as separate `<link>`s (one request each, each with `integrity` + `crossorigin`). Responses are `cache-control: public, max-age=31536000, immutable`, so exact-version pins get permanent caching either way. The docs note in the README says both.

**6. Scripts are not part of this.** `dist/zazz.js` is the only `dist/` script; per-primitive behaviour loads from `src/` (relative imports resolve natively on jsDelivr), which is what `head.ts`'s granular CDN mode emits. `/combine/` for JS is possible but not documented; it would also lose SRI and the import-map `integrity` section.

## The future URL shape

For a page using `button` with the spacing style props, once `0.5.0` is published (all parts pinned to the same exact version, `DIST_CSS` order):

```
https://cdn.jsdelivr.net/combine/npm/@zazz-ui/core@0.5.0/dist/layers.css,npm/@zazz-ui/core@0.5.0/dist/base.css,npm/@zazz-ui/core@0.5.0/dist/utilities-spacing.css,npm/@zazz-ui/core@0.5.0/dist/primitives/fields.css,npm/@zazz-ui/core@0.5.0/dist/primitives/kbd.css,npm/@zazz-ui/core@0.5.0/dist/primitives/button.css
```

Grammar: `https://cdn.jsdelivr.net/combine/` + comma-separated `npm/@zazz-ui/core@<exact>/dist/<file>` entries, where `<file>` is a `DIST_CSS` key. `dist/layers.css` first is harmless but redundant (every modular file already begins with it); it is the file to load when your *own* stylesheet must precede any kit file. `utilities-spacing-responsive.css` must follow `utilities-spacing.css`; `utilities.css` replaces `utilities-core.css` plus all families. Each URL is one request, permanently cached, without SRI.

## Done in this ticket

- `packages/core/README.md`: new "Load only what you use" section listing the `DIST_CSS` map (bundle, base, utilities core/families, `primitives/<name>.css`, `layers.css`), the closure rule with the button example, the `/combine/` shape, the SRI caveat, and the `src/…` per-file grain (ADR-0005). The `0.4.1` CDN snippet is untouched.
- This file.

## Not done / follow-ups

- The head builder's granular CDN mode still emits one `<link>` per `src/` file. A `dist/`-based grain (per-file `dist/` links with SRI, or one `/combine/` link without) would be a `head.ts` change with its own ticket; the manifest already has everything it needs (`DIST_CSS` + `resolveClosure`).
- The docs site's CDN page (ticket 30) should teach the closure rule and the SRI caveat from this file rather than the four-file list in the ticket text.
