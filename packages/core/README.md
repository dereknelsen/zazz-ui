# @zazz-ui/core

Zazz is a CSS and vanilla JavaScript UI kit that does not require a build step. It uses semantic design tokens, cascade layers, `data-*` variants, and browser APIs such as popover, `<dialog>`, invoker commands, anchor positioning, and view transitions.

Docs: https://zazz.sh (component gallery, tokens, guides)

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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.1.0/dist/zazz.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.1.0/dist/zazz.js"></script>
```

Use an exact version in CDN URLs. Each release includes `dist/sri.json`, which lists the SHA-384 hash for every published file. Use those hashes in `integrity` attributes.

You can also copy files directly. Each primitive has a folder under `src/primitives/<name>/` containing its stylesheet, script, and HTML examples. A `zazz-ui` CLI for copying primitives and their dependencies is planned.

## Usage

```html
<button class="ui-button" data-variant="primary">It works!</button>
```

Primitives use design tokens such as `var(--primary)`, `--radius-md`, and `--gap-*`. Override tokens on `:root` to change the whole kit, use tokens such as `--ui-button-*` to change one primitive, or set them inline for one instance. Variants use `data-*` attributes. Role tokens control light and dark themes.

## Package layout

```
src/
├── index.css        stylesheet entry: @imports base + every primitive in cascade order
├── index.js         script entry: registers every custom element / behavior
├── base/            tokens, reset, typography, utilities, layout + shared runtime
└── primitives/<name>/       one folder per primitive: <name>.css, <name>.js, examples (.html)
dist/
├── zazz.css         flattened single-file bundle (loaded by CDN tags)
├── zazz.js
└── sri.json         sha384 hashes of every published css/js file
```

The package includes readable, unminified `.js` and matching `.d.ts` files compiled from TypeScript.

## Development

This package is part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui) monorepo. `pnpm build` compiles TypeScript beside each `.ts` file, then runs `vp pack`. `pnpm dev` runs the TypeScript compiler in watch mode.

See [CONVENTIONS.styles.md](./CONVENTIONS.styles.md) and [CONVENTIONS.scripts.md](./CONVENTIONS.scripts.md) before contributing.

## License

MIT
