# Changelog

Notable changes to `@zazz-ui/core`, grouped by primitive or base scope under each version. The grouping is load-bearing: the `zazz-ui` CLI's `update` and `diff` print only the slice that touches the files you've vendored. Breaking entries are flagged **BREAKING** with a one-line migration note. During 0.x, a minor bump means at least one breaking entry (ADR-0010 has the full definition of "breaking").

## 0.1.0 (unreleased)

First public release. One package, consumed three ways: the `dist/zazz.css` + `dist/zazz.js` bundles for a two-tag CDN drop-in, per-file CDN URLs into the readable `src/` tree, or copying the code into your project and owning it.

### base

- Cascade-layer architecture: `_layers`, `_variables`, `_reset`, `_typography`, `_view-transitions`, then primitives, then `_utilities` and `_layout`. A `layer(legacy)` slot lets a migrating stylesheet ride below the kit.
- Core runtime (`utils`, `signals`, `zazz-element`, `dialog-lifecycle`), opt-in page behaviors (`reveal`, `navigation`), and the shared engines behind the typeahead family (`typeahead`, `command-score`, `hotkeys`) and the Embla carousel adapter.
- `head.ts`: the canonical `<head>` contract (fonts, stylesheet, pinned and SRI-checked import map, polyfills, theme persistence), in a local mode for vendored copies and a CDN mode (`cdn: { version, primitives?, sri? }`).
- `manifest.ts`: the distribution manifest. `PRIMITIVES` (files, dependencies, and examples for every primitive), `CSS_CASCADE_ORDER`, `resolveClosure()`, and `MANIFEST_VERSION`.
- `dist/sri.json`: sha384 hashes of every published css/js file, regenerated each release.

### primitives

- 43 primitives: accordion, alert-dialog, autocomplete, avatar, badge, breadcrumbs, button, button-group, card, carousel, checkbox, combobox, command, dialog, fields, input, input-group, kbd, lightbox, menu, menubar, meter, mobile-menu, navigation-menu, otp, password-group, popover, progress, prose, radio, reveal, select, separator, slider, switch, table, tabs, textarea, toaster, toggle, toggle-group, toolbar, tooltip, utilities.
