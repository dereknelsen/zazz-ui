# zazz-ui

The CLI for the [Zazz Design Framework](https://zazz.sh). It copies primitives from [`@zazz-ui/core`](https://www.npmjs.com/package/@zazz-ui/core) into your project so you own the code, and it records where every file came from so future updates can merge instead of overwrite.

```bash
pnpm dlx zazz-ui init
pnpm dlx zazz-ui add button combobox
```

(`npx zazz-ui …` works too.)

## What init does

`init` vendors the base platform into `zazz/` (or `--dir <path>`): the css layers (tokens, reset, typography, generated utilities), the core runtime scripts (plus the scroll-state polyfill, which `index.js` loads only in browsers without container scroll-state queries), an `index.css` and `index.js` entry pair, and a `head.html` snippet to paste into your `<head>` (fonts, import map, polyfills, theme persistence). It also writes `zazz.json`, which records the kit version and a hash of every vendored file's original bytes.

Flags: `--dir <path>`, `--ts` (vendor TypeScript sources instead of compiled js, plus the kit's ambient `globals.d.ts`), `--legacy <path>` (wire an existing stylesheet into the `legacy.imports` cascade sublayer), `--no-fonts`, `--no-theme-script`. Re-running `init` repairs the tree: missing files come back, files you edited are left alone.

## What add does

`add <primitive...>` resolves the primitives you ask for plus everything they depend on (adding `combobox` brings `select`, `fields`, `popover`, `button`, `kbd`, and `badge`), copies the files at your project's recorded kit version (with each primitive's data file, `primitives/<name>/<name>.json`, from kits that ship one), and inserts the entry imports at the right cascade position. Your edits to vendored files are never touched. `--examples` also copies the primitive's example markup.

## What update does

`update [@version]` moves the whole project to a new kit version (default latest). Because `zazz.json` records the pristine hash of every file at vendor time, update knows exactly which files you've touched: unedited files silently take the new version, files you edited where upstream didn't move stay yours, and non-overlapping changes merge automatically. Only a real conflict asks you anything, with four ways out: write git-style conflict markers to resolve in your editor, keep your version, take theirs, or skip. Skipping rolls back that whole primitive (or the base platform) so a re-run offers the merge again, and the command exits 2 so CI can tell "needs a human" from "broken". Non-interactive runs skip conflicts unless you pass `--keep`, `--theirs`, or `--markers`.

Naming primitives narrows the update (`update @0.5.0 button`): only those move, the base platform stays put, and `zazz.json` records the version skew per primitive. New dependencies a primitive gains are vendored automatically, files removed upstream are cleaned up (or kept, if you edited them), and the relevant slice of the kit's changelog prints before anything happens, breaking changes flagged.

`diff [@version] [name...]` shows all of it read-only: your files against the target version's exact bytes, plus the changelog slice. `--upstream` compares pristine-to-pristine instead, ignoring your edits.

## What codemod does

`codemod data-font [@version] [paths...]` moves a project to typography roles in `data-font`. It rewrites `data-ui="text-sm"` to `data-font="sm"` and `data-ui="text-link"` to `data-ui="link"`, keeps any identity that shared the attribute (`data-ui="badge text-xs"` becomes `data-ui="badge" data-font="xs"`), and rewrites quoted selectors (`[data-ui~="text-sm"]` becomes `[data-font="sm"]`).

It reads markup, templates, scripts, and stylesheets under the project root, or under the paths you name. It skips every vendored kit directory, `node_modules` and other dependency and build folders, dot-directories, a top-level `vendor` or `tmp`, minified files, and plain Markdown. Name a file to rewrite it anyway; a vendored kit file is never rewritten.

In a vendored project it handles the kit as well. If the recorded kit predates `data-font`, it runs `update` first, to latest or to the `@version` you pass. That update brings the new `_variables.css` and `_typography.css`, and `--keep`, `--theirs`, and `--markers` answer its conflicts. Then it runs `add` for the primitives your markup uses: `font`, and `link` and `prose` where they appear. Without a `zazz.json` it rewrites the markup and leaves the kit to you.

It only moves what it can move safely. It leaves these as written, lists the ones it finds, and exits with code 2:

- an element with two roles, or one that already has `data-font`
- a value with template syntax among its tokens (`data-ui="text-sm {{ extra }}"`)
- a role set from script (`el.setAttribute("data-ui", "text-xs")`, `data-ui={…}`)
- an unquoted selector (`[data-ui~=text-sm]`)
- a file that is not UTF-8 or is over 2 MB

The list covers the common ways a role is set, not every one; search for `text-` afterward if your templates build `data-ui` in unusual ways. `--dry-run` prints the files and counts and writes nothing. A second run changes nothing.

### small-sizes

`codemod small-sizes [paths...]` handles the small control sizes the kit removed: `data-button-size` and `data-toggle-size` no longer take `"sm"` or `"icon-sm"`. It asks what to do; removing them is the default, and it is the answer under `-y` or without a terminal.

- **Remove**: rewrites the markup. `"sm"` is dropped and `"icon-sm"` becomes `"icon"`, quoted or not, with or without spaces around `=`. A selector (`[data-button-size="sm"]`), a size set from script, or a template value is listed for review, left as written, and the command exits with code 2.
- **Keep** (`--restore`, or pick it at the prompt): leaves the markup alone and adds the removed rules back. In a vendored project they go at the end of the vendored `button.css` and `toggle.css`, where `update` merges them like any edit of yours. Without a `zazz.json`, and for button or toggle when it isn't vendored, they go in `zazz-small-sizes.css` at the project root (added to the end if the file exists), which you load after the kit's stylesheet. It recognizes its own rules by their header, so running it again adds nothing twice, and on a vendored kit old enough to still have the sizes it adds them anyway, so the next `update` can't drop them. Inside an input group or a password group a small size wins over the size the group gives its buttons.

Fields never had a small size and are not touched. `--dry-run` writes nothing.

## Owning the code

There is no runtime dependency on `@zazz-ui/core`. The files in `zazz/` are yours: edit them, delete what you don't want, commit them like any other source. `zazz.json` is what makes that safe, and `update` is what makes it cheap.

## Requirements

Node 22.22+ (or 24.15+). Works with `@zazz-ui/core` 0.1 through 0.15 (manifest v1–v2); given a newer kit, the CLI tells you to upgrade it. Works offline once a kit version is cached; respects your `.npmrc` (registries, proxies, auth). `--registry`, `--offline`, and `--prefer-offline` are available on every command.

## License

MIT. Part of the [zazz-ui](https://github.com/dereknelsen/zazz-ui) monorepo.
