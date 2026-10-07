# @zazz-ui/core

Zazz is a CSS and vanilla JavaScript UI kit that does not require a build step. It uses semantic design tokens, cascade layers, `data-*` variants, and browser APIs such as popover, `<dialog>`, invoker commands, anchor positioning, and view transitions.

Docs: <https://zazz.sh> (guides, a [quick start](https://zazz.sh/docs/quick-start/), and an [API reference](https://zazz.sh/api/) generated from this package's data).

**0.5 is an alpha.** The markup contract can change in any release before 1.0, and 0.5 is not compatible with 0.4; see [`CHANGELOG.md`](./CHANGELOG.md) for every breaking change and its migration note.

## Install

```bash
pnpm add @zazz-ui/core
```

```js
import "@zazz-ui/core/index.css"; // all styles, imported in cascade order
import "@zazz-ui/core"; // custom elements and shared behaviors
```

From a CDN, the script needs an import map for its dependencies and the Interest Invokers polyfill:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.5.1/dist/zazz.css" />
<script type="importmap">
  {
    "imports": {
      "signal-polyfill": "https://cdn.jsdelivr.net/npm/signal-polyfill@0.2.2/dist/index.js",
      "embla-carousel": "https://cdn.jsdelivr.net/npm/embla-carousel@8.6.0/esm/embla-carousel.esm.js",
      "embla-carousel-autoplay": "https://cdn.jsdelivr.net/npm/embla-carousel-autoplay@8.6.0/esm/embla-carousel-autoplay.esm.js",
      "embla-carousel-auto-scroll": "https://cdn.jsdelivr.net/npm/embla-carousel-auto-scroll@8.6.0/esm/embla-carousel-auto-scroll.esm.js",
      "embla-carousel-class-names": "https://cdn.jsdelivr.net/npm/embla-carousel-class-names@8.6.0/esm/embla-carousel-class-names.esm.js"
    }
  }
</script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/invokers@2.2.2/dist/esm/production/interest.js"
></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.5.1/dist/zazz.js"></script>
```

Use an exact version in CDN URLs. The [installation guide](https://zazz.sh/docs/install/installation/) has the complete `<head>`, with fonts, the theme script, a per-primitive variant, and integrity hashes on every URL; `buildHead({ cdn: { version } })` from `@zazz-ui/core/head` returns the same markup. Each release also includes `dist/sri.json` with the SHA-384 hash of every published file.

Or own the files: the [`zazz-ui`](https://www.npmjs.com/package/zazz-ui) CLI vendors the base platform and any primitives (with their dependencies) into your project and merges later updates against the recorded originals.

```bash
pnpm dlx zazz-ui init
pnpm dlx zazz-ui add button card dialog
```

Each primitive is a folder under `src/primitives/<name>/` with its stylesheet, script, and HTML examples, so copying by hand works too.

## Usage

```html
<button data-ui="button" data-button-variant="primary">It works!</button>
```

Components are identified by `data-ui` tokens (`data-ui="button"`, `data-ui="field"`), presets are scoped attributes (`data-button-variant`, `data-button-size`), and values are style utilities set in `style` (`style="--px: 4; --w--md: fit-content"`) rather than utility classes.

## Theming

Every value in the kit resolves from a CSS custom property, which gives you three override surfaces:

```css
/* 1. Global tokens move the whole system */
:root {
  --color-primary: oklch(0.6 0.2 145);
  --radius-md: 0;
}

/* 2. Component hooks (--ui-*) restyle one primitive everywhere */
:root {
  --ui-button-rounded: var(--radius-full);
}
```

```html
<!-- 3. The same hooks set inline restyle one instance -->
<button data-ui="button" style="--ui-button-bg: var(--color-secondary)">One-off</button>
```

Color roles resolve through `light-dark()`, so light and dark themes work out of the box and follow the OS preference (pin one with `data-ui-theme="dark"` on `<html>`). Styles live in cascade layers, so your own CSS can override anything without `!important` or specificity fights. The [theming guide](https://zazz.sh/docs/theming/customization/) covers tokens, hooks, dark mode, and brand blocks.

## Layout

`data-ui="layout"` (or `<ui-layout>`) turns an element into a grid of named width bands for its own children. Each child sits in the default band (`xl`, changed with `data-layout-size`) unless a `--band` utility places it elsewhere, so measured text and full-bleed media are siblings in one flow:

```html
<main data-ui="layout">
  <h2>Sits in the default band</h2>
  <figure style="--band: layout-bleed">
    <img src="/wide.jpg" alt="" />
  </figure>
  <p style="--band: layout-md; --band--lg: layout-lg">Measured text, wider from lg up.</p>
</main>
```

See [layout](https://zazz.sh/api/foundations/layout/) for the band model and [breakpoints](https://zazz.sh/api/foundations/breakpoints/) for how tiers read the nearest container.

## Tests

`vp test` runs two projects: `unit` (happy-dom) and `browser` (Vitest browser mode, Chromium via Playwright, the SPEC claims register). Once per machine:

```sh
pnpm exec playwright install chromium
```

`vp test --project unit` is the fast loop. `ZAZZ_BROWSERS=webkit,firefox vp test --project "browser*"` runs the other engines after `pnpm exec playwright install webkit firefox`. `ZAZZ_SKIP_BROWSER=1` omits the browser project and says so.

## Browser support

Zazz targets the latest Chrome, Firefox, and Safari, two versions back. Features below that floor are feature-detected with a polyfill or a graceful fallback where practical. The kit leans on modern CSS (cascade layers, container style queries, subgrid, `light-dark()`), so older browsers get a degraded but functional experience rather than a pixel-perfect one.

The head loads exactly one polyfill: `invokers/interest`, for Interest Invokers (`interestfor`), which is Chromium-only and drives tooltip triggers. Everything else the kit builds on — the Popover API, Invoker Commands, native `<dialog>`, `<details>` — is native across the floor. CSS anchor positioning is below the floor and is gated behind `@supports` with a UA-centered fallback.

## Package layout

```text
src/
├── index.css        stylesheet entry: @imports base + every primitive in cascade order
├── index.js         script entry: registers every custom element / behavior
├── base/            tokens, reset, typography, utilities, layout + shared runtime
└── primitives/<name>/       one folder per primitive: <name>.css, <name>.ts, examples (.html)
dist/
├── zazz.css         flattened single-file bundle (loaded by CDN tags)
├── zazz.js
└── sri.json         sha384 hashes of every published css/js file
```

The package includes readable, unminified `.js` and matching `.d.ts` files compiled from TypeScript. Component scripts are optional: the CSS works on its own, and the scripts add behaviors (typeahead, carousels, command menus, hotkeys) as custom elements and small helpers.

## Development

This package is part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui) monorepo. `pnpm build` compiles TypeScript beside each `.ts` file, then runs `vp pack`. `pnpm dev` runs the TypeScript compiler in watch mode.

See [CONVENTIONS.styles.md](./CONVENTIONS.styles.md) and [CONVENTIONS.scripts.md](./CONVENTIONS.scripts.md) before contributing.

## License

MIT
