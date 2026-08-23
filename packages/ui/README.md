# @zazz-ui/ui

Zazz — a zero-build UI kit for the modern web. Semantic design tokens, cascade layers, `data-*` variants, and native platform APIs (popover, `<dialog>`, invoker commands, anchor positioning, view transitions) instead of framework abstractions. A lightweight shadcn + Tailwind alternative that runs with **no build step**.

**Docs:** https://zazz.design (component gallery, tokens, guides)

## Install

```bash
pnpm add @zazz-ui/ui
```

```js
import "@zazz-ui/ui/index.css"; // the stylesheet tree (cascade-ordered @imports)
import "@zazz-ui/ui"; // component scripts: custom elements, reveal, toaster…
```

Or from a CDN — two tags, no install:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@zazz-ui/ui/dist/zazz.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@zazz-ui/ui/dist/zazz.js"></script>
```

Or copy the files: every component is one self-contained folder — `src/ui/<name>/` holds its stylesheet, script, and canonical HTML examples. Copy a folder, own the code.

## Usage

```html
<button class="ui-button" data-variant="primary">It works</button>
```

Components read design tokens (`var(--primary)`, `--radius-md`, `--gap-*`) and never hardcode values — restyle globally by overriding tokens on `:root`, per component via its `--ui-button-*` tokens, or per instance inline. Variants are `data-*` attributes, not class soup. Light/dark comes free through role tokens.

## Package layout

```
src/
├── index.css        stylesheet entry — @imports base + every component in cascade order
├── index.js         script entry — registers every custom element / behavior
├── base/            tokens, reset, typography, utilities, layout + shared runtime
└── ui/<name>/       one folder per component: <name>.css, <name>.js, examples (.html)
dist/
├── zazz.css         flattened single-file bundle (what the CDN tags load)
└── zazz.js
```

Scripts are authored in TypeScript and shipped as readable, unminified `.js` with `.d.ts` alongside — what you copy is what runs.

## Development

Part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui). `pnpm build` = tsc emit (in-place, next to each `.ts`) + `vp pack` bundles; `pnpm dev` = tsc watch. Authoring conventions: [CONVENTIONS.styles.md](./CONVENTIONS.styles.md) and [CONVENTIONS.scripts.md](./CONVENTIONS.scripts.md).

## License

MIT
