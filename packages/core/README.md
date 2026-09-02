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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.3.0/dist/zazz.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.3.0/dist/zazz.js"></script>
```

Use an exact version in CDN URLs. Each release includes `dist/sri.json`, which lists the SHA-384 hash for every published file. Use those hashes in `integrity` attributes.

You can also copy files directly. Each primitive has a folder under `src/primitives/<name>/` containing its stylesheet, script, and HTML examples. A `zazz-ui` CLI for copying primitives and their dependencies is planned.

## Usage

```html
<button class="ui-button" data-variant="primary">It works!</button>
```

Components are classes (`.ui-button`, `.ui-dialog`, `.ui-field`), and variants are `data-*` attributes (`data-variant`, `data-size`) rather than modifier classes.

## Theming

Every value in the kit resolves from a CSS custom property, which gives you three override surfaces:

```css
/* 1. Global tokens move the whole system */
:root {
  --primary: oklch(0.6 0.2 145);
  --radius-md: 0;
}

/* 2. Component hooks (--ui-*) restyle one primitive everywhere */
:root {
  --ui-button-radius: var(--radius-full);
}
```

```html
<!-- 3. The same hooks set inline restyle one instance -->
<button class="ui-button" style="--ui-button-background: var(--secondary)">One-off</button>
```

Color roles resolve through `light-dark()`, so light and dark themes work out of the box and follow the OS preference (pin one with a `.dark` class on `<html>`). Styles live in cascade layers, so your own CSS can override anything without `!important` or specificity fights. The [extending guide](https://zazz.sh/docs/core-concepts/extending) covers adding your own tokens, utilities, and variants.

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

## Browser support

Zazz targets the latest Chrome, Firefox, and Safari, two versions back. Features below that floor are feature-detected with a polyfill or a graceful fallback where practical. The kit leans on modern CSS (cascade layers, container style queries, subgrid, `light-dark()`), so older browsers get a degraded but functional experience rather than a pixel-perfect one.

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
