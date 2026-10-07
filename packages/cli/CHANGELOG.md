# Changelog

Notable changes to the `zazz-ui` CLI. The CLI versions independently of `@zazz-ui/core` (ADR-0010); the kit's own changelog is the one `update` and `diff` print.

## 0.3.0 (2026-10-07)

First public release. npm had only a `0.0.0` placeholder before it.

- Works with `@zazz-ui/core` 0.1 through 0.5 (manifest v1–v2). A kit outside that range fails with a message that says whether it is too old or too new.
- `init`, `add`, `update`, and `diff` vendor the kit into your project and record a hash of every file, so `update` merges your edits instead of overwriting them.
- `--legacy <path>` wires an existing stylesheet into `layer(legacy.imports)`.
- `update` from a 0.4.x kit to 0.5 removes the old class and layout base files (`_utilities.css`, `_layout.css`) and vendors the generated utilities layer.
- With a kit that exports its runtime list (0.5 and later), the vendored core runtime includes `base/navigation.js`, which stays inert until a page sets `<html data-ui-navigation="swap">`, and the scroll-state polyfill, which `index.js` loads only where `CSS.supports("container-type", "scroll-state")` is false. Without the polyfill, `--*--stuck` utilities only work in Chromium.
- `zazz.json` no longer carries a `$schema` key. No schema is published, and the CLI drops an existing key the next time it writes the file.
