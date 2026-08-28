# @zazz-ui/core

Zazz: a zero-build UI kit for the modern web. Semantic design tokens, cascade layers, `data-*` variants, and native platform APIs (popover, `<dialog>`, invoker commands, anchor positioning, view transitions) instead of framework abstractions. A lightweight alternative to shadcn and Tailwind.

**Docs:** https://zazz.design (component gallery, tokens, guides)

## Install

```bash
pnpm add @zazz-ui/core
```

```js
import "@zazz-ui/core/index.css"; // the stylesheet tree (cascade-ordered @imports)
import "@zazz-ui/core"; // component scripts: custom elements, reveal, toaster...
```

Or from a CDN with two tags and no installation step:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.1.0/dist/zazz.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.1.0/dist/zazz.js"></script>
```

Always pin an exact version in CDN URLs. Each release ships `dist/sri.json` with sha384 hashes for every published file if you want `integrity` attributes on those tags.

Or copy the files directly: every component is one self-contained folder under `src/primitives/<name>/` containing its stylesheet, script, and canonical HTML examples. Copy a folder and own the code. (A `zazz-ui` CLI that vendors components and their dependencies for you is in the works.)

## Usage

```html
<button class="ui-button" data-variant="primary">It works</button>
```

Components read design tokens (`var(--primary)`, `--radius-md`, `--gap-*`) and never hardcode values. Restyle globally by overriding tokens on `:root`, per component via its `--ui-button-*` tokens, or per instance inline. Variants are `data-*` attributes rather than class soup. Light and dark modes work out of the box through role tokens.

## Package layout

```
src/
├── index.css        stylesheet entry: @imports base + every component in cascade order
├── index.js         script entry: registers every custom element / behavior
├── base/            tokens, reset, typography, utilities, layout + shared runtime
└── primitives/<name>/       one folder per component: <name>.css, <name>.js, examples (.html)
dist/
├── zazz.css         flattened single-file bundle (loaded by CDN tags)
├── zazz.js
└── sri.json         sha384 hashes of every published css/js file
```

Scripts are authored in TypeScript and shipped as readable, unminified `.js` with `.d.ts` alongside: what you copy is what runs.

## Development

Part of [zazz-ui](https://github.com/dereknelsen/zazz-ui). `pnpm build` runs tsc emit (in-place, next to each `.ts`) and `vp pack` bundles; `pnpm dev` runs tsc watch. Authoring conventions: [CONVENTIONS.styles.md](./CONVENTIONS.styles.md) and [CONVENTIONS.scripts.md](./CONVENTIONS.scripts.md).

## License

MIT
