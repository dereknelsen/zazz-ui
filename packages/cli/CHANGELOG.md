# Changelog

Notable changes to the `zazz-ui` CLI. The CLI versions independently of `@zazz-ui/core` (ADR-0010); the kit's own changelog is the one `update` and `diff` print.

## Unreleased

- New command: `codemod data-font [@version] [paths...]`. It moves a project to typography roles in `data-font`: `data-ui="text-sm"` becomes `data-font="sm"`, `data-ui="text-link"` becomes `data-ui="link"`, and a quoted `[data-ui~="text-sm"]` selector becomes `[data-font="sm"]`. In a vendored project it first runs `update` when the recorded kit predates `data-font`, then `add` for the primitives the markup uses (`font`, `link`, `prose`). It never rewrites a vendored kit directory. It leaves what it cannot move safely (two roles on one element, template syntax in the value, a role set from script, an unquoted selector, a file that is not UTF-8), lists those places, and exits with code 2. `--dry-run` writes nothing.
- `add` and `update` vendor each primitive's data file (`primitives/<name>/<name>.json`: its hooks, attributes, slots, and states). Kits that predate the files vendor as before.
- A narrowed update (`update tabs`) vendors a shared script that the target version introduced. Before, it read the script from the version the base was recorded at, found nothing, and wrote no file, but still added the import to the entry script, so the page's scripts failed to load. A whole-kit `update` was not affected.
- `update` no longer deletes a script that a skipped primitive or your entry script still imports. Deleting one left the entry script (`index.js`) with a dead import, and then no script on the page loaded. Two cases:
  - A primitive is skipped (a conflict in CI, or "Skip" at the prompt) and the kit moved or removed a shared script it imports. The script stays on disk. The first whole-kit `update` after the primitive moves deletes it.
  - The entry script you end up with still imports a file the update would delete: you kept your version through a conflict, took conflict markers, or the base unit was skipped and the old entry stayed. This covers shared scripts, a script a primitive dropped, and the scripts of a primitive the kit removed. The file stays, and the output names it (`--dry-run` leaves it out of the plan without a note). Remove the import and run a whole-kit `zazz-ui update` to delete it. A commented-out import does not hold a file. If a later kit version ships the file again, its primitive takes it back.
- When the base unit is skipped, `update` still vendors the new shared scripts the updated primitives import, and lists them in its output. They were left out with the rest of the base unit, so the updated primitives imported files that did not exist.
- `zazz.json` has a new optional map, `base.sources`. It names the kit version a base file's recorded copy came from when that is not the base's own version. That happens when `update` or `add` vendors a shared script ahead of the base, when a skipped primitive keeps a script the kit moved, and when your entry still imports a removed file. `update` merges your edits to such a file against that version, and `diff --upstream` reads it from there. Without the record, an edited script could come back as a whole-file conflict. While the map has entries, a whole-kit `update` checks those files again instead of reporting `Already at`. `zazz-ui` 0.3.3 and earlier drop the map when they rewrite `zazz.json`.
- Re-running `update` after it skipped the base unit brings the entries up to date. Before, a narrowed re-run (`update tabs`) printed `Already at` and left `index.css` and the entry script without the updated primitive's imports, and a whole-kit re-run kept an edited entry script as it was, also without them. A skipped base unit now records the primitive versions its entries were generated for, in a new optional `base.entries` map in `zazz.json`. The next `update` sees the map, merges your entry edits against the entries for those versions, and removes the map once the base unit applies. `zazz-ui` 0.3.3 and earlier drop the map when they rewrite `zazz.json`.

## 0.3.3 (2026-11-16)

- An exact version (`update @0.14.1`, `diff @0.14.1`, `init 0.14.1`) resolves right after it is published. The CLI reads an exact version from npm's cache, and when the cached version list predated the release, it reported "No matching version found" until something like `@latest` refreshed the list. A cache miss now asks the registry once. `--offline` still never goes online.
- The README lists `@zazz-ui/core` 0.1 through 0.14 as supported.

## 0.3.2 (2026-10-26)

- `init --ts` vendors the kit's `globals.d.ts`, the ambient types the TypeScript sources check against (`window.Utils`, `Signals`, `Toaster`, `CommandEvent`). A full `update` adds it to an existing `--ts` project and keeps it current. If you copied the file in by hand, delete your copy after updating, or TypeScript reports a duplicate `EmblaCarouselType`.
- The CSP fallback check in the generated `index.js`/`index.ts` reads `style` only after narrowing to `HTMLElement`, so a TypeScript entry (or `checkJs`) no longer flags `el.style` on an `Element`.

## 0.3.1 (2026-10-13)

- `init` vendors the kit's runtime fallbacks (`CORE_FALLBACKS`, from core 0.6.3: the Content Security Policy fallback `base/csp.js` and the `style` parser it imports) and writes their document check into `index.js`, the way the kit's own entry does. A fallback with a gate this CLI does not know is skipped, so a newer kit still vendors.

## 0.3.0 (2026-10-07)

First public release. npm had only a `0.0.0` placeholder before it.

- Works with `@zazz-ui/core` 0.1 through 0.5 (manifest v1–v2). A kit outside that range fails with a message that says whether it is too old or too new.
- `init`, `add`, `update`, and `diff` vendor the kit into your project and record a hash of every file, so `update` merges your edits instead of overwriting them.
- `--legacy <path>` wires an existing stylesheet into `layer(legacy.imports)`.
- `update` from a 0.4.x kit to 0.5 removes the old class and layout base files (`_utilities.css`, `_layout.css`) and vendors the generated utilities layer.
- With a kit that exports its runtime list (0.5 and later), the vendored core runtime includes `base/navigation.js`, which stays inert until a page sets `<html data-ui-navigation="swap">`, and the scroll-state polyfill, which `index.js` loads only where `CSS.supports("container-type", "scroll-state")` is false. Without the polyfill, `--*--stuck` utilities only work in Chromium.
- `zazz.json` no longer carries a `$schema` key. No schema is published, and the CLI drops an existing key the next time it writes the file.
