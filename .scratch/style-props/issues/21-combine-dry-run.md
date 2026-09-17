# 21 — /combine/ dry run + README dist section

Type: task
Status: resolved
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

Full write-up: [combine.md](../combine.md). Simulated `/combine/` as local concatenations of the built `dist/` files (build at `723d58d`), loaded in Chromium via `agent-browser` at 1280×800 with a `ui-button` carrying `style="--px: 8"` beside a control, results written to a `<pre>` and read with `get text`.

**It renders and the prop works.** In every variant the probe's `padding-inline` is 32px, equal to the page's own measurement of `calc(8 * var(--spacing-interval))`; `--px` needs only the `@property` registration and `--spacing-interval` (both in `base.css`) plus the `utilities-spacing.css` rule.

**Dependency note.** The ticket's four files (`layers` + `base` + `utilities-spacing` + `primitives/button`) are not enough for a *styled* button: `PRIMITIVES.button.primitives` is `["kbd", "fields"]` and `button.css` defaults every metric to `--ui-field-*` (owned by `fields.css`), so without it the control renders with 0 padding, 0 border, 0 radius and inherited 16px type. Adding `primitives/fields.css` + `primitives/kbd.css` (`resolveClosure(["button"])`) makes the output pixel-identical to `dist/zazz.css` for the same markup (control 66.42×32, probe 144.36×32, 1px border, 10px radius, 12.8px type). The documented URL therefore lists the closure.

**Order is layer-insensitive.** The fully reversed concatenation gives byte-identical computed styles: every modular file starts with the bundled `layers.css`, so the first statement wins and the repeats are no-ops (Chromium counts 312 rules vs 308 for the bundle: only the repeated statements). Source order *within* a layer still applies (`utilities-spacing` after `utilities-core` per ADR-0012; primitives in cascade order), so the docs keep `DIST_CSS` order.

**No relative URLs.** `dist/zazz.css` contains no `url()` at all, no `@font-face`, no `@import`. `font-family: Geist` resolved through the head's Google Fonts link in every variant; nothing in the CSS depends on its own URL.

**Real jsDelivr behaviour (fetched against the published `0.4.1`).** `/combine/` prepends a header comment (`Combined by jsDelivr … Do NOT use SRI with dynamically generated files!`), appends a `sourceMappingURL` trailer, and leaves the body bytes intact (feature counts identical; an unminified `src/` part passes through unminified). So a `/combine/` link carries no `integrity`, the same class as the `/+esm` resources `head.ts` already refuses; pages that need SRI link the `dist/` files individually (`sri.json` hashes all 51). Responses are `immutable`, one-year cached.

**Future URL shape (`0.5.0`, all parts pinned to the same exact version, `DIST_CSS` order):**

```
https://cdn.jsdelivr.net/combine/npm/@zazz-ui/core@0.5.0/dist/layers.css,npm/@zazz-ui/core@0.5.0/dist/base.css,npm/@zazz-ui/core@0.5.0/dist/utilities-spacing.css,npm/@zazz-ui/core@0.5.0/dist/primitives/fields.css,npm/@zazz-ui/core@0.5.0/dist/primitives/kbd.css,npm/@zazz-ui/core@0.5.0/dist/primitives/button.css
```

`layers.css` first is harmless but redundant (the modular files already carry it); it is the file to load when your own stylesheet must precede any kit file.

**README.** `packages/core/README.md` gains a "Load only what you use" section after Install: the `DIST_CSS` map as a table (`zazz.css`, `layers.css`, `base.css`, `utilities-core.css`, `utilities-<family>.css`, `utilities-spacing-responsive.css`, `utilities.css`, `primitives/<name>.css`) with the family and primitive names in prose, the closure rule with the button example, the `/combine/` shape with `<version>` placeholders, the SRI caveat, and the `src/…` per-file grain per ADR-0005. The `0.4.1` CDN snippet and the package version are untouched; the "Package layout" tree gains one line for the modular files.

Verified in `packages/core`: `vp run build` ok (50 css files); `vp check` clean bar the pre-existing `generate-sri.mjs` warning; `vp test` 180 passed / 1 skipped (pre-existing). Follow-ups noted in `combine.md`: a `dist/`-based grain for `head.ts`'s granular CDN mode, and the docs CDN page (ticket 30) teaching the closure rule and the SRI caveat.

## Comments
