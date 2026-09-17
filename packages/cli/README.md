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

## What update does

`update [@version]` moves the whole project to a new kit version (default latest). Because `zazz.json` records the pristine hash of every file at vendor time, update knows exactly which files you've touched: unedited files silently take the new version, files you edited where upstream didn't move stay yours, and non-overlapping changes merge automatically. Only a real conflict asks you anything, with four ways out: write git-style conflict markers to resolve in your editor, keep your version, take theirs, or skip. Skipping rolls back that whole primitive (or the base platform) so a re-run offers the merge again, and the command exits 2 so CI can tell "needs a human" from "broken". Non-interactive runs skip conflicts unless you pass `--keep`, `--theirs`, or `--markers`.

Naming primitives narrows the update (`update @0.2.0 button`): only those move, the base platform stays put, and `zazz.json` records the version skew per primitive. New dependencies a primitive gains are vendored automatically, files removed upstream are cleaned up (or kept, if you edited them), and the relevant slice of the kit's changelog prints before anything happens, breaking changes flagged.

`diff [@version] [name...]` shows all of it read-only: your files against the target version's exact bytes, plus the changelog slice. `--upstream` compares pristine-to-pristine instead, ignoring your edits.

## What migrate does

A kit release that renames things ships its rename rules in the tarball (`migrations/<version>.json`), and `migrate` applies them to your own sources: custom-property names in any file, breakpoint class prefixes inside `class="…"` / `className="…"` literals (and their escaped selector forms in css), and `data-*` attribute values. Every rename in a run happens simultaneously, so a chain like `@xs:` → `@sm:` → `@md:` never double-shifts.

```bash
pnpm dlx zazz-ui migrate                      # dry run against the latest kit
pnpm dlx zazz-ui migrate --to @0.5.0 --write  # apply
pnpm dlx zazz-ui update @0.5.0                # then move the vendored files
```

It scans `**/*.{css,html,htm,md,mdx,js,jsx,ts,tsx,astro,vue,svelte}` under the current directory (or the paths you name), skipping `node_modules`, `dist`, `.git`, and your vendored `zazz/` directory, which `update` owns. `--include <glob>` and `--exclude <glob>` narrow that further. The dry run prints a coloured diff per file, how often each rule fired, the files-changed total, and everything it could not map as `file:line: snippet — note`. `--write` applies the rewrites and stamps `"migrated": "<version>"` in `zazz.json`, so a second run is refused as already migrated; `--from <version>` overrides that stamp (and the kit version it falls back to) when you know better. Whenever something needs a hand, the command exits 2, in a dry run and after a write alike.

Run `migrate` before `update`: the rules target the version you are moving to, and `update` reads the stamp so the sources are never shifted twice. `--rules <file>` reads a rules file from disk instead of the kit, for a project that vendors nothing or a rule set you maintain yourself.

Out of scope: JSX `style={{}}` merging, `className={…}` expressions, template literals that build class strings, and Vue/Svelte template expressions. The dry run points at each of them, and you migrate those by hand using the rename table in the kit's changelog.

## Owning the code

There is no runtime dependency on `@zazz-ui/core`. The files in `zazz/` are yours: edit them, delete what you don't want, commit them like any other source. `zazz.json` is what makes that safe, and `update` is what makes it cheap.

## Requirements

Node 22.22+ (or 24.15+). Works offline once a kit version is cached; respects your `.npmrc` (registries, proxies, auth). `--registry`, `--offline`, and `--prefer-offline` are available on every command.

## License

MIT. Part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui) monorepo.
