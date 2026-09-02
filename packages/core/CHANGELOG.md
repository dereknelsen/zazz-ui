# Changelog

Notable changes to `@zazz-ui/core`, grouped by primitive or base scope under each version. The grouping is load-bearing: the `zazz-ui` CLI's `update` and `diff` print only the slice that touches the files you've vendored. Breaking entries are flagged **BREAKING** with a one-line migration note. During 0.x, a minor bump means at least one breaking entry (ADR-0010 has the full definition of "breaking").

## 0.3.0 (2026-09-02)

Three themes: (1) **theming is single-source** — every theme role is declared once as a `light-dark()` pair, and `.dark`/`.light`/`[data-theme]` are pure `color-scheme` pins that re-resolve the same tokens (the inverted-popover feature is removed); (2) **utility classes go fully logical** — every physical-side declaration becomes its logical equivalent, every side-named class gains a logical-name alias, and border widths and dividers arrive; (3) the **cascade layer contract is reworked** around `vendors`, a grouped `legacy`, `zazz.plugins`, and `overrides`. In LTR horizontal writing with system theming, default rendering is unchanged except where flagged below.

### base

- Theme roles are now **declared exactly once** as `light-dark()` pairs on `:root`; `.dark`/`.light` and `[data-theme="dark"|"light"]` are pure `color-scheme` pins that also re-assert `color`. Scopes nest — a `.light` island inside a `.dark` section re-lightens its subtree. Override a role once (`--primary: light-dark(…, …)`) and every mode picks it up. **Visible change:** the manual/toggled dark palette had drifted from the system-dark arms and is now reconciled to them — `--border` (tint-100), `--popover` (neutral-950), `--primary`/`--secondary` (800), `--tertiary` (800) replace the stale tint-200/shade-950/500/400 copies, so toggled dark now matches system dark exactly.
- **BREAKING** The inverted-popover feature is removed: the `--use-inverted-popovers` property and the `data-use-inverted-menu` attribute no longer exist. Popovers follow the page's color scheme. Migration: delete both from your markup/CSS; to force a dark popover, set `color-scheme: dark` on it (tokens re-resolve automatically).
- New **text-decoration utilities**: `underline`, `overline`, `line-through`, `no-underline`.
- New **border width utilities**: `border-1` to `border-4` (all sides), per-side `border-{t|b}-{1-4}`, `border-{l|s}-{1-4}`, `border-{r|e}-{1-4}`. Compose with border color classes. Not responsive.
- New **divider utilities**: `divide-x` / `divide-y` draw a 1px border on the trailing logical edge of every direct child except the last. Children inherit `--_border-color`, so border color classes on the container recolor the dividers.
- New **logical-name aliases** (identical values to their physical-name twins): `inline-*`/`block-*` for `w-*`/`h-*` (plus `min-`/`max-` variants), `start-*`/`end-*` for `left-*`/`right-*`, `ps-*`/`pe-*` for `pl-*`/`pr-*`, `ms-*`/`me-*` for `ml-*`/`mr-*` (negative margins included), `border-s`/`border-e` for `border-l`/`border-r`, `rounded-s/e/ss/se/ee/es-*` for `rounded-l/r/tl/tr/br/bl-*`, and `text-start`/`text-end` for `text-left`/`text-right` (responsive variants included).
- Positioning, border, radius, and text-align utilities converted from physical to logical properties/values: `left:` → `inset-inline-start:`, `border-right:` → `border-inline-end:`, physical corner radii → `border-start-start-radius` etc., `text-align: left|right` → `start|end`. Rendering only changes in RTL/vertical writing modes, where utilities now mirror with the text direction.
- **BREAKING** Internal radius composition variables renamed to logical corners: `--_radius-top-left|top-right|bottom-right|bottom-left` → `--_radius-start-start|start-end|end-end|end-start`. Migration: rename in any custom CSS that reads or sets the `--_radius-*` vars (they are internal, so most consumers are unaffected).
- Fix: `z-isolate` declared invalid `z-index: isolate` (a no-op); now `isolation: isolate` as documented.
- Fix: `--ui-prose-figcaption-gap` was consumed by `.ui-prose figure` but never declared; now declared (`0px`, preserving current spacing) so the hook works.
- Fix: the `global-view-transition--old` keyframes read `--view-transition-opacity--new`; they now read `--view-transition-opacity--old`, making that documented hook functional (defaults are identical, so default rendering is unchanged).
- Fix: article containers' `data-container="full"|"bleed"` referenced undeclared `--article-full`/`--article-bleed` tokens (the rules were invalid and fell back to auto width); they now implement band-container semantics — `full` spans the available width keeping gutters, `bleed` runs edge to edge.
- **BREAKING** Cascade layer contract reworked: top-level order is now `variables, reset, vendors, legacy, zazz, overrides`. New `vendors` layer for third-party CSS that does not build on Zazz (above `reset` so the reset can't clobber library widgets, below `legacy`). The `migrations` top-level layer moved to a `legacy.migrations` sublayer — `legacy` now nests `imports, components, utilities, migrations`, so deleting a finished migration is dropping one layer; shims still beat all other legacy CSS but no longer beat Zazz (use `overrides` for that). New `zazz.plugins` sublayer between `components` and `utilities` for Zazz-dependent extensions (added variants can restyle the primitives they extend; utilities still win). New `overrides` top-level layer as the structured app-override slot — only unlayered CSS outranks it. Migration: import whole legacy files with `layer(legacy.imports)` (never bare `layer(legacy)` — un-sublayered rules form an implicit final sublayer that beats the shims), move `migrations.css` to `layer(legacy.migrations)`, and move any shim that had to override Zazz into `@layer overrides`.

### button

- Buttons paint with `background-clip: padding-box`, and filled variants (`primary`, `secondary`, `muted`, …) now default their border color to the variant background (`--ui-button-border-color: var(--ui-button-background)` and the `--hover`/`--active` pairs) instead of `transparent`. Same rendered look with cleaner edges on translucent backgrounds; if you overrode a variant background, its border now follows automatically.

### badge

- Same treatment as buttons: `background-clip: padding-box`, and variant border colors default to the variant background instead of `transparent`.

### carousel

- Example markup: dropped a redundant `font-heading` class from the example heading (`text-h5` already applies the heading weight).

### tooltip

- Example markup no longer carries `data-use-inverted-menu="false"` — the attribute was removed with the inverted-popover feature (see base).

## 0.2.0 (2026-08-31)

Token naming consistency pass + shared field-family inheritance. Two themes: (1) every token is now named after the **logical** CSS property it feeds (`-block-size`, never `-height`), and interactive controls decompose borders into `-border-width` / `-border-style` / `-border-color` parts; (2) buttons, toggles, tabs, checkboxes, radios, and badge borders now **default to the shared `--ui-field-*` family**, so one `--ui-field-radius` or `--ui-field-block-size` override retunes every control that sits on a line together. Default rendering is unchanged — the new aliases resolve to the same values.

### base

- **BREAKING** `fields.css` now registers first among primitives in `index.css` (it owns the shared `--ui-field-*` family); `CSS_CASCADE_ORDER` and the `button`/`badge`/`tabs`/`checkbox` manifest entries gained a `fields` dependency. Migration: re-run `zazz-ui update` (vendored) or re-emit your import order from the manifest; hand-maintained subsets must load `fields.css` before its consumers.
- CONVENTIONS.styles.md §5/§6 now document the token-naming rules: logical property names, full property names (no abbreviations), the border width/style/color decomposition (composed at the usage site, never into a `:root` token), `-foreground` vs `-{part}-color`, and sanctioned cross-component token defaults.
- Physical `top`/`left`/`width`/`height` declarations converted to logical equivalents in dialog, lightbox, mobile-menu, tooltip, carousel, and badge; remaining physical uses are commented exceptions (`anchor()` side keywords, centering idioms).
- **BREAKING** `group-hover:scale-*` now matches the regular `scale-*` set (`0`, `25`, `50`, `75`, `90`, `98`, `99`, `100`, `101`, `102`, `110`, `125`, `150`). Dropped `95`/`105`. Migration: `group-hover:scale-95` → `group-hover:scale-98` (or `90`); `group-hover:scale-105` → `group-hover:scale-102` (or `110`).

### fields

- **BREAKING** `--ui-field-height` → `--ui-field-block-size`. Migration: rename the token in your overrides.
- **BREAKING** `--ui-field-border` (color-valued) → `--ui-field-border-color`; `--ui-field-border--hover/--focus` → `--ui-field-border-color--hover/--focus`. New `--ui-field-border-width` (1px) and `--ui-field-border-style` (solid) parts. Migration: rename color overrides; width/style are now their own hooks.

### input

- **BREAKING** `--ui-input-border-radius` → `--ui-input-radius`; `--ui-input-border` (shorthand) replaced by `--ui-input-border-width/-style/-color` aliases of the field parts. Migration: rename, or override the `--ui-field-border-*` parts to move the whole family.
- `--ui-input-calendar-picker-radius` now defaults to `--ui-field-inset-child-radius` (same value).

### textarea

- **BREAKING** `--ui-textarea-border-radius` → `--ui-textarea-radius`; `--ui-textarea-border` replaced by `--ui-textarea-border-width/-style/-color`. `--ui-textarea-font-size` now defaults to `--ui-field-font-size` (same value).

### select

- **BREAKING** `--ui-select-border-radius` → `--ui-select-radius`; `--ui-select-border` replaced by `--ui-select-border-width/-style/-color`; `--ui-option-height` → `--ui-option-block-size`; `--ui-option-border(--hover/--active)` replaced by `--ui-option-border-width/-style/-color` (+ `-color--hover/--active`).

### otp

- **BREAKING** `--ui-otp-slot-border` replaced by `--ui-otp-slot-border-width/-style/-color`.

### combobox

- **BREAKING** `--ui-combobox-border-radius` → `--ui-combobox-radius`; `--ui-combobox-border` replaced by `--ui-combobox-border-width/-style/-color` (aliasing the select parts); `--ui-combobox-control-align` → `--ui-combobox-control-align-items`; `--ui-combobox-control-wrap` → `--ui-combobox-control-flex-wrap`; removed the dead `--ui-combobox-display` token (nothing consumed it).

### input-group

- **BREAKING** `--ui-input-group-text-size/-text-weight/-text-color` → `--ui-input-group-font-size/-font-weight/-foreground`; `--ui-input-group-align` → `-align-items`; `--ui-input-group-wrap` → `-flex-wrap`.

### password-group

- **BREAKING** same renames as input-group (`-text-*` → `-font-*`/`-foreground`, `-align` → `-align-items`, `-wrap` → `-flex-wrap`).

### button

- Button metrics now default to the shared field family: `--ui-button-block-size/-font-size/-line-height/-padding/-radius/-icon-size/-ring-color` alias `--ui-field-*`, and `--ui-button-border-width/-style` alias the field border parts (same values as before; retune `--ui-field-*` and buttons follow, remap `--ui-button-*` to diverge).
- **BREAKING** `--ui-button-height` → `--ui-button-block-size`; `--ui-button-border(--hover/--active)` (shorthands) replaced by `--ui-button-border-color(--hover/--active)` color parts. Migration: rename; to restyle the whole border override the width/style/color parts.

### toggle

- **BREAKING** `--ui-toggle-height` → `--ui-toggle-block-size`; `--ui-toggle-border*` shorthands replaced by `--ui-toggle-border-width/-style/-color` (+ `-color--hover/--active/--checked/--checked-hover/--checked-active`), defaulting to the button parts.

### badge

- **BREAKING** `--ui-badge-height` → `--ui-badge-block-size`; `--ui-badge-border(--hover/--active)` replaced by `--ui-badge-border-width/-style/-color` parts. Border + ring now default to `--ui-field-*` (same values); metrics stay an independent smaller scale.

### tabs

- **BREAKING** `--ui-tabs-label-min-height` → `--ui-tabs-label-min-block-size`.
- Track/label metrics now default to the field family: `--ui-tabs-track-radius` (`--ui-field-radius`), `--ui-tabs-indicator-radius` (`--ui-field-inset-child-radius`), label font-size/line-height/padding/ring-color (same values as before).

### checkbox

- **BREAKING** `--ui-checkbox-border(--hover/--checked)` → `--ui-checkbox-border-color(--hover/--checked)`, plus new width/style parts. Tokens moved from the element onto `:root` in `@layer variables` (they are now overridable from `:root` like every other hook); surface + border default to `--ui-field-*`.

### radio

- **BREAKING** `--ui-radio-border(--hover/--checked)` → `--ui-radio-border-color(--hover/--checked)`, plus new width/style parts; surface + border default to `--ui-field-*`.

### switch

- **BREAKING** `--ui-switch-track-width/-track-height` → `--ui-switch-track-inline-size/-track-block-size`; `--ui-switch-thumb` → `--ui-switch-thumb-background`.

### dialog

- **BREAKING** `--ui-dialog-width/-height` → `--ui-dialog-inline-size/-block-size`; removed the dead `--ui-dialog-display` token (nothing consumed it).

### alert-dialog

- **BREAKING** `--ui-alert-dialog-width` → `--ui-alert-dialog-inline-size`.

### progress

- **BREAKING** `--ui-progress-height` → `--ui-progress-block-size`.

### meter

- **BREAKING** `--ui-meter-height` → `--ui-meter-block-size`.

### slider

- **BREAKING** `--ui-slider-track-height` → `--ui-slider-track-block-size`.

### table

- **BREAKING** `--ui-table-head-height` → `--ui-table-head-block-size`.

### toaster

- **BREAKING** `--ui-toaster-width` → `--ui-toaster-inline-size`; `--ui-toaster-description-color` → `--ui-toaster-description-foreground`; `--ui-toaster-border` → `--ui-toaster-border-color` (it held a color).

### carousel

- **BREAKING** `--ui-carousel-slide-min-width` → `--ui-carousel-slide-min-inline-size`.

### kbd

- **BREAKING** `--ui-kbd-color` → `--ui-kbd-foreground`.

### mobile-menu

- **BREAKING** `--ui-mobile-menu-backdrop` → `--ui-mobile-menu-backdrop-color`.

### accordion

- **BREAKING** `--ui-accordion-icon-transform-open` → `--ui-accordion-icon-transform--open` (double-dash state convention).

### popover

- **BREAKING** `--ui-popover-border` → `--ui-popover-border-color` (it held a color).

### tooltip

- **BREAKING** `--ui-tooltip-border` → `--ui-tooltip-border-color` (it held a color).

### lightbox

- **BREAKING** Removed dead tokens nothing consumed: `--ui-lightbox-thumb-border(--active)` (the thumb border comes from `--ui-lightbox-img-border`; active/focus feedback is the inset ring + opacity), `--ui-lightbox-radius` (slides/thumbs use `--ui-lightbox-slide-radius` / `--ui-lightbox-thumb-radius`), and `--ui-lightbox-thumb-aspect-ratio`. Migration: delete overrides of these; retune the named replacements instead.

## 0.1.0 (2026-08-28)

First public release. One package, consumed three ways: the `dist/zazz.css` + `dist/zazz.js` bundles for a two-tag CDN drop-in, per-file CDN URLs into the readable `src/` tree, or copying the code into your project and owning it.

### base

- Cascade-layer architecture: `_layers`, `_variables`, `_reset`, `_typography`, `_view-transitions`, then primitives, then `_utilities` and `_layout`. A `layer(legacy)` slot lets a migrating stylesheet ride below the kit.
- Core runtime (`utils`, `signals`, `zazz-element`, `dialog-lifecycle`), opt-in page behaviors (`reveal`, `navigation`), and the shared engines behind the typeahead family (`typeahead`, `command-score`, `hotkeys`) and the Embla carousel adapter.
- `head.ts`: the canonical `<head>` contract (fonts, stylesheet, pinned and SRI-checked import map, polyfills, theme persistence), in a local mode for vendored copies and a CDN mode (`cdn: { version, primitives?, sri? }`).
- `manifest.ts`: the distribution manifest. `PRIMITIVES` (files, dependencies, and examples for every primitive), `CSS_CASCADE_ORDER`, `resolveClosure()`, and `MANIFEST_VERSION`.
- `dist/sri.json`: sha384 hashes of every published css/js file, regenerated each release.

### primitives

- 43 primitives: accordion, alert-dialog, autocomplete, avatar, badge, breadcrumbs, button, button-group, card, carousel, checkbox, combobox, command, dialog, fields, input, input-group, kbd, lightbox, menu, menubar, meter, mobile-menu, navigation-menu, otp, password-group, popover, progress, prose, radio, reveal, select, separator, slider, switch, table, tabs, textarea, toaster, toggle, toggle-group, toolbar, tooltip, utilities.
