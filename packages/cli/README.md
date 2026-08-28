# zazz-ui

The CLI for the [Zazz Design Framework](https://zazz.sh). It copies primitives from [`@zazz-ui/core`](https://www.npmjs.com/package/@zazz-ui/core) into your project so you own the code, and it records where every file came from so future updates can merge instead of overwrite.

```bash
pnpm dlx zazz-ui init
pnpm dlx zazz-ui add button combobox
```

(`npx zazz-ui …` works too.)

## What init does

`init` vendors the base platform into `zazz/` (or `--dir <path>`): the css layers (tokens, reset, typography, utilities, layout), the core runtime scripts, an `index.css` and `index.js` entry pair, and a `head.html` snippet to paste into your `<head>` (fonts, import map, polyfills, theme persistence). It also writes `zazz.json`, which records the kit version and a hash of every vendored file's original bytes.

Flags: `--dir <path>`, `--ts` (vendor TypeScript sources instead of compiled js), `--legacy <path>` (wire an existing stylesheet into the `legacy` cascade layer), `--no-fonts`, `--no-theme-script`. Re-running `init` repairs the tree: missing files come back, files you edited are left alone.

## What add does

`add <primitive...>` resolves the primitives you ask for plus everything they depend on (adding `combobox` brings `select`, `fields`, `popover`, `button`, `kbd`, and `badge`), copies the files at your project's recorded kit version, and inserts the entry imports at the right cascade position. Your edits to vendored files are never touched. `--examples` also copies the primitive's example markup.

## Owning the code

There is no runtime dependency on `@zazz-ui/core`. The files in `zazz/` are yours: edit them, delete what you don't want, commit them like any other source. `zazz.json` is what makes that safe; because it records the pristine hash of every file at vendor time, a future `zazz-ui update` can tell your edits apart from upstream changes and do a real three-way merge. (`update` and `diff` ship in the next release.)

## Requirements

Node 22.22+ (or 24.15+). Works offline once a kit version is cached; respects your `.npmrc` (registries, proxies, auth). `--registry`, `--offline`, and `--prefer-offline` are available on every command.

## License

MIT. Part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui) monorepo.
