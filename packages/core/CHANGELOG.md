# Changelog

All notable changes to `@zazz-ui/core`, grouped per primitive/base scope under each version — this is the slice the `zazz-ui` CLI's `update`/`diff` print for the primitives an update touches. Breaking entries are flagged **BREAKING** with a one-line migration note (0.x semver: a 0.MINOR bump means at least one breaking entry; see ADR-0010).

## 0.1.0 — unreleased

Initial public release: the Zazz Design Framework as one npm package serving both grains — `dist/zazz.css` + `dist/zazz.js` bundles for one-request CDN drop-in, and the readable per-file `src/` tree for granular CDN use and CLI vendoring.

### base

- Cascade-layer architecture (`_layers` → `_variables` → `_reset` → `_typography` → `_view-transitions`, primitives, then `_utilities` + `_layout`), with a `layer(legacy)` slot for migrating stylesheets.
- Core runtime: `utils`, `signals`, `zazz-element`, `dialog-lifecycle`; opt-in page behaviors `reveal` and `navigation`; shared engines `typeahead`/`command-score`/`hotkeys` and the Embla adapter.
- `head.ts`: the canonical `<head>` contract — fonts, stylesheet, pinned + SRI-checked import map, polyfills, theme persistence — with local (`base`) and CDN (`cdn: { version, primitives?, sri? }`) modes.
- `manifest.ts`: the distribution manifest (`PRIMITIVES`, `CSS_CASCADE_ORDER`, `resolveClosure`, `MANIFEST_VERSION = 1`).
- `dist/sri.json`: sha384 hashes of every published css/js file, generated per release.

### primitives

- 43 primitives: accordion, alert-dialog, autocomplete, avatar, badge, breadcrumbs, button, button-group, card, carousel, checkbox, combobox, command, dialog, fields, input, input-group, kbd, lightbox, menu, menubar, meter, mobile-menu, navigation-menu, otp, password-group, popover, progress, prose, radio, reveal, select, separator, slider, switch, table, tabs, textarea, toaster, toggle, toggle-group, toolbar, tooltip, utilities.
