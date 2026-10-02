# @zazz-ui/core

Zazz is a CSS and vanilla JavaScript UI kit that does not require a build step. It uses semantic design tokens, cascade layers, `data-*` variants, and browser APIs such as popover, `<dialog>`, invoker commands, anchor positioning, and view transitions.

Docs: <https://zazz.sh> (component gallery, tokens, guides, and a [build-your-first-page tutorial](https://zazz.sh/docs/getting-started/first-page))

## Install

```bash
pnpm add @zazz-ui/core
```

```js
import "@zazz-ui/core/index.css"; // all styles, imported in cascade order
import "@zazz-ui/core"; // custom elements and shared behaviors
```

From a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.4.1/dist/zazz.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.4.1/dist/zazz.js"></script>
```

Use an exact version in CDN URLs. Each release includes `dist/sri.json`, which lists the SHA-384 hash for every published file. Use those hashes in `integrity` attributes.

You can also copy files directly. Each primitive has a folder under `src/primitives/<name>/` containing its stylesheet, script, and HTML examples. A `zazz-ui` CLI for copying primitives and their dependencies is planned.

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

Color roles resolve through `light-dark()`, so light and dark themes work out of the box and follow the OS preference (pin one with `data-ui-theme="dark"` on `<html>`). Styles live in cascade layers, so your own CSS can override anything without `!important` or specificity fights. The [extending guide](https://zazz.sh/docs/core-concepts/extending) covers adding your own tokens, utilities, and variants.

## Layout

The `.container` is not a fixed-width box. A region (`main`, `header`, `footer`, `section`, `article`) holding a `.container` becomes a grid of named width bands, and each direct child of the container picks its band. Measured text and full-bleed media can be siblings in the same flow:

```html
<section>
  <div class="container">
    <h2>Sits in the default md band</h2>
    <figure data-container="bleed">
      <img src="/wide.jpg" alt="" />
    </figure>
    <p>Back to the md band.</p>
  </div>
</section>
```

See [layout and containers](https://zazz.sh/docs/core-concepts/layout) for the band model, the article reading-measure variant, and responsive container variants.

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
