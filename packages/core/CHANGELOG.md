Notable changes to `@zazz-ui/core`, grouped by primitive or base scope under each version. The grouping is load-bearing: the `zazz-ui` CLI's `update` and `diff` print only the slice that touches the files you've vendored. Breaking entries are flagged **BREAKING** with a one-line migration note. During 0.x, a minor bump means at least one breaking entry (ADR-0010 has the full definition of "breaking").

## 0.5.0 (unreleased)

One theme: **open values move to style props, tokens collapse to one space scale, and breakpoints take Tailwind's names** (ADR-0012). A style prop is a custom property set inline (`style="--px: 4; --px-md: 8"`) and read by a zero-specificity rule in `@layer zazz.utilities`; it carries the responsive suffixes, the fluid spacing scale, and the `--_gap` / `--_grid-cols` coordination that raw inline style cannot. The `--gap-*` size tokens become `--space-*` (with a new `2xs` and `2xl`), and every breakpoint name — flags, class prefixes, length tokens, band line names, `data-container` values — shifts one step (old `xs` → `sm` … old `xl` → `2xl`, plus a new 96rem `2xl`). Run `zazz-ui migrate` to apply the renames tabled below; do not sed them. The breakpoint shift is a chain (`@sm:` is both a source and a target, as is `--breakpoint-sm`), and the codemod applies every rule in one simultaneous pass and stamps `zazz.json` so it never runs twice. The rules it reads are `migrations/0.5.0.json` in this package; a test keeps that file and the tables here in sync.

Measurements (0.4.1 → 0.5.0), from `node .scratch/style-props/measure.mjs` (build `packages/core` first):

| Measure                                                                               | 0.4.1                                      | 0.5.0                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `dist/zazz.css` raw bytes                                                             | 304,258                                    | 338,886                                    |
| brotli bytes (node zlib, q11)                                                         | 29,125                                     | 31,088                                     |
| gzip bytes (node zlib, default level)                                                 | 38,281                                     | 42,035                                     |
| rule count (`{` in `dist/zazz.css`)                                                   | 2,189                                      | 2,767                                      |
| `src/base/_utilities.css` bytes                                                       | 159,583                                    | 160,490                                    |
| CDN transfer bytes (jsDelivr, `Accept-Encoding: br`)                                  | 39,174                                     | n/a until published                        |
| Coverage on `examples/layout.html`, style rules (Chrome 153, 1280×900): used / unused | 60,226 / 244,032 (80.2% unused of 304,258) | 60,481 / 278,405 (82.2% unused of 338,886) |

Read plainly, the monolith grew, not shrank: +34,628 B raw, +1,963 B brotli and +578 rules, roughly the 297 `@property` registrations (28 in 0.4.1; 14,865 B of blocks, 264 of them the style props) plus the eight family files (22,815 B together), and `examples/layout.html` matches the same ~60 KB of style rules it did before, so the bundle's unused share rises from 80.2% to 82.2%; the win is the modular `dist/`, where a page loads `base.css` (48,058 B / 6,623 br) plus only the families it uses (`utilities-spacing.css` 1,625 B, `-spacing-responsive` 8,102, `-sizing` 2,875, `-grid` 3,121, `-flex` 1,665, `-color` 1,411, `-typography` 1,609, `-position` 2,407; `utilities-core.css` 125,398 B / 9,202 br for the class utilities) and its primitives' closure (`primitives/<name>.css`, 968 B to 9,440 B each), so the button page from the README's `/combine/` example (`base` + `utilities-spacing` + `fields` + `kbd` + `button`) is 64,581 B / 8,678 br against the 338,886 B / 31,088 br bundle, and Coverage measured per family instead of per bundle is what the 0.5 numbers should be compared on.

### base

- **BREAKING** Container breakpoint flags renamed `--is-breakpoint-*` → `--bp-*` and shifted onto Tailwind's scale: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem (so `--bp-sm` is true where `--is-breakpoint-xs` was, and `--bp-2xl` is new). Still registered typed booleans (`inherits: true`, initial `false`), still set by unnamed size queries on `:where(body *)`, so the subject is the nearest ancestor with a `container-type` (`body`, `main`, `section`, `article` per the reset), not the viewport. Migration: `zazz-ui migrate` rewrites every `style(--is-breakpoint-…)` gate and `var()` read in your CSS; there is no alias.

| 0.4                  | 0.5        |
| -------------------- | ---------- |
| `--is-breakpoint-xs` | `--bp-sm`  |
| `--is-breakpoint-sm` | `--bp-md`  |
| `--is-breakpoint-md` | `--bp-lg`  |
| `--is-breakpoint-lg` | `--bp-xl`  |
| `--is-breakpoint-xl` | `--bp-2xl` |

- **BREAKING** Responsive class prefixes shift one step, `@xs:` … `@xl:` → `@sm:` … `@2xl:`, and `@max-xs:` … `@max-xl:` → `@max-sm:` … `@max-2xl:`, for every responsive utility and for `.@sm:container` / `.@max-sm:container`. Each class keeps its width: `@sm:flex` fires at 40rem, exactly where `@xs:flex` did. The names are a chain: an untouched `@sm:flex` now fires at 40rem instead of 48rem, which is why the codemod, not sed, has to do this. Migration: `zazz-ui migrate` rewrites `class` attributes in HTML and templates; JSX `className={…}` expressions are reported, not rewritten — shift those by hand.

| 0.4        | 0.5         |
| ---------- | ----------- |
| `@xs:`     | `@sm:`      |
| `@sm:`     | `@md:`      |
| `@md:`     | `@lg:`      |
| `@lg:`     | `@xl:`      |
| `@xl:`     | `@2xl:`     |
| `@max-xs:` | `@max-sm:`  |
| `@max-sm:` | `@max-md:`  |
| `@max-md:` | `@max-lg:`  |
| `@max-lg:` | `@max-xl:`  |
| `@max-xl:` | `@max-2xl:` |

- **BREAKING** Breakpoint length tokens shift the same step: `--breakpoint-sm` is now 40rem (it was 48rem), and so on up to the new `--breakpoint-2xl` at 96rem; `--breakpoint-xs` no longer exists. The viewport-width utility classes follow the tokens by rem, not by name: `w-screen-sm` (and `h-`, `size-`, `min-`/`max-`, and the `inline-`/`block-` aliases) is now 40rem, where `w-screen-xs` was, and `*-screen-2xl` is new. Migration: `zazz-ui migrate` rewrites the token reads and the `*-screen-*` class names (tabled with the `--container-*` tokens below).

| 0.4               | 0.5                |
| ----------------- | ------------------ |
| `--breakpoint-xs` | `--breakpoint-sm`  |
| `--breakpoint-sm` | `--breakpoint-md`  |
| `--breakpoint-md` | `--breakpoint-lg`  |
| `--breakpoint-lg` | `--breakpoint-xl`  |
| `--breakpoint-xl` | `--breakpoint-2xl` |

- **BREAKING** The `--gap-xs` … `--gap-xl` size tokens are removed and replaced by the `--space-*` family, one scale for padding, margin, and gap: `--space-2xs` (`--step-1`), `xs` (`--step-2`), `sm` (`--step-4`), `md` (`--step-6`), `lg` (`--step-11`), `xl` (`--step-24`), `2xl` (`--step-40`). `xs` … `xl` are byte-identical to the old `--gap-*` values and stay fluid through `--spacing-interval`; `--gutters` now reads `--space-md` (same value). The `.gap-*`, `.p-*`, `.m-*` class names are unchanged and read `--space-*` underneath. There are **no aliases**: `--gap-sm` … `--gap-2xl` are now the responsive forms of the `--gap` style prop, registered `inherits: false`, so a leftover `var(--gap-md)` below `:root` resolves to nothing. Migration: `zazz-ui migrate` rewrites every `--gap-*` read to `--space-*`; if you set `--gap-*` on `:root` to retune the scale, set `--space-*` instead.

| 0.4        | 0.5           |
| ---------- | ------------- |
| —          | `--space-2xs` |
| `--gap-xs` | `--space-xs`  |
| `--gap-sm` | `--space-sm`  |
| `--gap-md` | `--space-md`  |
| `--gap-lg` | `--space-lg`  |
| `--gap-xl` | `--space-xl`  |
| —          | `--space-2xl` |

- **BREAKING** `.container` band names shift with the breakpoints: `data-container` values, the `--container-*` line-range variables, and the grid line names all move one step, and each keeps its rem width (`data-container="sm"` is the 40rem band, where `xs` was; `2xl` is the new 96rem band next to `full` and `bleed`). The default band is now `var(--container-lg)`, the same 64rem that `var(--container-md)` was. The article variant follows: `data-container="sm"` reads 45ch (`--article-xs`) … `2xl` reads 75ch (`--article-xl`), so every reading width is unchanged and the `--article-*` tokens are not renamed. Migration: `zazz-ui migrate` rewrites `data-container` attribute values and every `--container-*` read (tabled below); grid line names are not tokens, so if your own CSS places children on `container-xs-start` … `container-xl-end`, shift those one step by hand (`xs` → `sm` … `xl` → `2xl`).

| 0.4                 | 0.5                  |
| ------------------- | -------------------- |
| `data-container=xs` | `data-container=sm`  |
| `data-container=sm` | `data-container=md`  |
| `data-container=md` | `data-container=lg`  |
| `data-container=lg` | `data-container=xl`  |
| `data-container=xl` | `data-container=2xl` |

| Band (0.4 → 0.5) | Width        | Line names                                      |
| ---------------- | ------------ | ----------------------------------------------- |
| xs → sm          | 40rem        | `container-sm-start` / `container-sm-end`       |
| sm → md          | 48rem        | `container-md-start` / `container-md-end`       |
| md → lg          | 64rem        | `container-lg-start` / `container-lg-end`       |
| lg → xl          | 80rem        | `container-xl-start` / `container-xl-end`       |
| xl → 2xl         | 96rem        | `container-2xl-start` / `container-2xl-end`     |
| full             | gutters kept | `container-full-start` / `container-full-end`   |
| bleed            | edge to edge | `container-bleed-start` / `container-bleed-end` |

- **BREAKING** `*-screen-*` classes and `--container-*` tokens shift with the breakpoints. The viewport-width utilities (`w-`, `h-`, `size-`, `min-w-`, `min-h-`, `max-w-`, `max-h-` and their `inline-`/`block-` aliases, each `-screen-<size>`) read `--breakpoint-<size>`, and the `.container` line-range variables `--container-<size>` name the band, so both take the new names and keep their rem: `w-screen-sm` and `var(--container-sm)` are the 40rem width, where `-xs` was; the `-2xl` forms are new and `-xs` is gone. Both are chains, like the prefixes above. Migration: `zazz-ui migrate` rewrites the class names in `class` attributes and CSS selectors and the token reads everywhere; nothing is aliased.

| 0.4              | 0.5               |
| ---------------- | ----------------- |
| `--container-xs` | `--container-sm`  |
| `--container-sm` | `--container-md`  |
| `--container-md` | `--container-lg`  |
| `--container-lg` | `--container-xl`  |
| `--container-xl` | `--container-2xl` |

| 0.4                    | 0.5                     |
| ---------------------- | ----------------------- |
| `w-screen-xs`          | `w-screen-sm`           |
| `w-screen-sm`          | `w-screen-md`           |
| `w-screen-md`          | `w-screen-lg`           |
| `w-screen-lg`          | `w-screen-xl`           |
| `w-screen-xl`          | `w-screen-2xl`          |
| `inline-screen-xs`     | `inline-screen-sm`      |
| `inline-screen-sm`     | `inline-screen-md`      |
| `inline-screen-md`     | `inline-screen-lg`      |
| `inline-screen-lg`     | `inline-screen-xl`      |
| `inline-screen-xl`     | `inline-screen-2xl`     |
| `h-screen-xs`          | `h-screen-sm`           |
| `h-screen-sm`          | `h-screen-md`           |
| `h-screen-md`          | `h-screen-lg`           |
| `h-screen-lg`          | `h-screen-xl`           |
| `h-screen-xl`          | `h-screen-2xl`          |
| `block-screen-xs`      | `block-screen-sm`       |
| `block-screen-sm`      | `block-screen-md`       |
| `block-screen-md`      | `block-screen-lg`       |
| `block-screen-lg`      | `block-screen-xl`       |
| `block-screen-xl`      | `block-screen-2xl`      |
| `size-screen-xs`       | `size-screen-sm`        |
| `size-screen-sm`       | `size-screen-md`        |
| `size-screen-md`       | `size-screen-lg`        |
| `size-screen-lg`       | `size-screen-xl`        |
| `size-screen-xl`       | `size-screen-2xl`       |
| `max-w-screen-xs`      | `max-w-screen-sm`       |
| `max-w-screen-sm`      | `max-w-screen-md`       |
| `max-w-screen-md`      | `max-w-screen-lg`       |
| `max-w-screen-lg`      | `max-w-screen-xl`       |
| `max-w-screen-xl`      | `max-w-screen-2xl`      |
| `max-inline-screen-xs` | `max-inline-screen-sm`  |
| `max-inline-screen-sm` | `max-inline-screen-md`  |
| `max-inline-screen-md` | `max-inline-screen-lg`  |
| `max-inline-screen-lg` | `max-inline-screen-xl`  |
| `max-inline-screen-xl` | `max-inline-screen-2xl` |
| `max-h-screen-xs`      | `max-h-screen-sm`       |
| `max-h-screen-sm`      | `max-h-screen-md`       |
| `max-h-screen-md`      | `max-h-screen-lg`       |
| `max-h-screen-lg`      | `max-h-screen-xl`       |
| `max-h-screen-xl`      | `max-h-screen-2xl`      |
| `max-block-screen-xs`  | `max-block-screen-sm`   |
| `max-block-screen-sm`  | `max-block-screen-md`   |
| `max-block-screen-md`  | `max-block-screen-lg`   |
| `max-block-screen-lg`  | `max-block-screen-xl`   |
| `max-block-screen-xl`  | `max-block-screen-2xl`  |
| `min-w-screen-xs`      | `min-w-screen-sm`       |
| `min-w-screen-sm`      | `min-w-screen-md`       |
| `min-w-screen-md`      | `min-w-screen-lg`       |
| `min-w-screen-lg`      | `min-w-screen-xl`       |
| `min-w-screen-xl`      | `min-w-screen-2xl`      |
| `min-inline-screen-xs` | `min-inline-screen-sm`  |
| `min-inline-screen-sm` | `min-inline-screen-md`  |
| `min-inline-screen-md` | `min-inline-screen-lg`  |
| `min-inline-screen-lg` | `min-inline-screen-xl`  |
| `min-inline-screen-xl` | `min-inline-screen-2xl` |
| `min-h-screen-xs`      | `min-h-screen-sm`       |
| `min-h-screen-sm`      | `min-h-screen-md`       |
| `min-h-screen-md`      | `min-h-screen-lg`       |
| `min-h-screen-lg`      | `min-h-screen-xl`       |
| `min-h-screen-xl`      | `min-h-screen-2xl`      |
| `min-block-screen-xs`  | `min-block-screen-sm`   |
| `min-block-screen-sm`  | `min-block-screen-md`   |
| `min-block-screen-md`  | `min-block-screen-lg`   |
| `min-block-screen-lg`  | `min-block-screen-xl`   |
| `min-block-screen-xl`  | `min-block-screen-2xl`  |

- New **style props** (ADR-0012): 44 props, each with five responsive forms (`-sm` … `-2xl`), 264 registrations in `src/base/_properties.css`, every one `@property { syntax: "*"; inherits: false }` with no initial value. Set them inline and the matching rule in `@layer zazz.utilities` applies: `style="--px: 4; --grid-cols-md: 3"`. Families and names — spacing (numeric, multiplied by `--spacing-interval`): `p px py ps pe pt pb m mx my ms me mt mb gap gap-x gap-y`; sizing: `w h min-w max-w min-h max-h size`; grid: `grid-cols grid-rows col-span row-span`; flex: `basis grow shrink order`; color: `bg text border-color`; typography: `text-size line-height letter-spacing`; position (logical): `top right bottom left inset z`. Four names are the full CSS property rather than the Tailwind root because the root collides with a token family through its responsive forms: `border-color` (not `border`), `text-size` (not `font-size`), `line-height` (not `leading`), `letter-spacing` (not `tracking`). `--gap` also sets `--_gap`, and `--grid-cols` implies `display: grid` and sets `--_grid-cols`, so `.basis-1/N` and the span utilities keep agreeing with them. Rules are gated on the attribute text (`:where([style*="--px:"])`), so an element with no prop matches no rule; responsive forms live inside `@container style(--bp-md: true)` and so answer the nearest size container, like the `@md:` classes. Primitives never read props; the utilities layer sits above `zazz.components`, so `style="--px: 8"` on a `ui-button` wins. Props live in the `style` attribute and are not a CSP workaround. The registry is `src/props.ts` (`vp run properties` regenerates the CSS); the rules are one file per family, `src/base/_utilities-<family>.css`. Adding a prop is additive; renaming or removing one is breaking.
- New `--screen-sm` … `--screen-2xl` **viewport flags**, the `@media` twins of the `--bp-*` container flags: same scale (40/48/64/80/96rem), same registration, set on `:root` by `@media (width >= …)` and inherited everywhere. Gate on `style(--screen-md: true)` when a rule should answer the viewport rather than the nearest container.
- New **modular dist**: alongside `dist/zazz.css`, the build emits `layers.css` (the `@layer` order alone), `base.css`, `utilities-core.css`, one `utilities-<family>.css` per style-prop family, `utilities-spacing-responsive.css`, `utilities.css` (all utilities), and `primitives/<name>.css`, each wrapped in its own layer so any subset can be loaded, or combined into one request with jsDelivr's `/combine/`. Load only what you use; the docs' _Optimize your CSS_ page has the recipes, and the measurements table above takes the after-numbers once the release is cut.
- The styling ladder in `CONVENTIONS.styles.md` §5 gains a rung: a utility class when a scale value fits; a style prop when the value is open and a prop exists; a `--ui-*` token set inline when the value lands where inline style cannot reach; raw inline style for a true same-element one-off; a CSS file the moment the one-off repeats. ADR-0008's "same-element hooks add nothing" still holds for 1:1 hooks; ADR-0012 records why style props pass that test.

### autocomplete

- New `--ui-autocomplete-option-gap` hook, defaulting to the shared `--ui-field-option-gap` so the list renders unchanged. The suggestion list and its groups read it instead of a hard `--step-px`, so retuning `--ui-field-option-gap` now reaches the autocomplete the way it already reached combobox, command, menu and select. Found by the ADR-0008 audit of every `--step-*` and literal length in component rules; every other one stays, with the failing four-part test recorded per row.

## 0.4.1 (2026-09-04)

Housekeeping on top of 0.4.0: the vestigial `anchor-size()` `@supports` gates come out, and the anchor-positioning support notes in the CSS headers and ADR-0011 are corrected. No rendered output changes in any browser — see the reasoning on the gate entry below.

### base

- The four `@supports (inline-size: anchor-size(width))` gates are removed (autocomplete panel, combobox panel, select `::picker(select)`, multiselect panel); `min-inline-size: anchor-size(width)` now applies unconditionally. **Not a browser-floor raise, and not breaking:** in a browser without `anchor-size()` the function is unknown, so the declaration is dropped at parse time and the `inline-size: max-content` above it still stands — exactly what the gate produced. `anchor-size()` is also Baseline 2026 (Chrome 125, Firefox 147, Safari 26.0), inside the support floor either way. Migration: none.
- The `anchor-name` gates in popover, tooltip, select, and tabs are deliberately **kept**. Unlike `anchor-size()`, dropping those would change rendering: full `anchor-name` support starts at Safari 27, and on Safari 26.x the gate is what keeps a popover UA-centered instead of an unpositioned top-left box. `tabs.css` also keeps its `@supports not` branch, which is a real designed fallback (indicator hidden, filled label instead). `popover.css` records when to retire them.
- Corrected support notes in `popover.css`, `autocomplete.css`, `combobox.css`, and `select.css`: anchor positioning reached Baseline in January 2026 (Chrome 151, Firefox 147, Safari 27), so the headers no longer claim Firefox lacks it. ADR-0011's support matrix is corrected the same way, and it now records why no anchor-positioning polyfill is adopted (`@oddbird/css-anchor-positioning` implements no `anchor-size()`, no dynamic anchors, and wraps the target in a way that disturbs custom-element lifecycles).

## 0.4.0 (2026-09-03)

One theme: the **polyfill set is corrected and cut to one**. The Popover API and Invoker Commands are native across the kit's browser floor and are no longer polyfilled; `interestfor` — which is Chromium-only and drives every tooltip — was never actually polyfilled despite appearing to be, and now is. Net effect: tooltips and hover-open menus start working in Firefox and Safari, and the head's polyfill payload drops from ~228 KB to 15 KB. See ADR-0011.

### base

- **BREAKING** The head contract ships one polyfill instead of two: `invokers@2.2.2/dist/esm/production/interest.js` (Interest Invokers). `@oddbird/popover-polyfill` is removed — the Popover API is native in Chrome 114+, Firefox 125+, Safari 17+, iOS Safari 18.3+, all below the support floor — and the `invokers` `compatible` build (Invoker Commands: Chrome 135+, Firefox 144+, Safari 26.2+) is replaced by the `interest` build from the same package. Migration: re-run `zazz-ui update` (vendored) or re-render `buildHead` / regenerate your `head.html`; if you hand-maintain your head, replace both old script tags with the single `interest.js` tag and its `sha384-hR2BVNtsS7fIIMwOm+f7MY0JZfuByGhQQfevCBB6evFATKzBsTw0JzH/RxD94z2T` hash.
- **BREAKING** Browser floor raised to match: the Popover API and Invoker Commands are now assumed native rather than polyfilled. Browsers below the floor no longer get popover behavior at all (a closed `[popover]` keeps the UA's `display: none`) instead of degrading through the polyfill. Migration: none if you were already on the documented floor (latest Chrome/Firefox/Safari, two versions back).
- **BREAKING** The `.\:popover-open` class hack is gone from every selector and `matches()` guard — 18 sites across popover, tooltip, menu, navigation-menu, command, select, combobox, autocomplete, toaster, and `base/typeahead`. Selectors are plain `:popover-open` now. `command.css` keeps `:where(:popover-open, [open])`; that branch is the dialog form of the panel, not the polyfill. Migration: if your own CSS matched `.\:popover-open` to hook Zazz popovers, switch to `:popover-open`.

### tooltip

- Fix: tooltips now work in Firefox and Safari. The trigger is `interestfor`, and the previously loaded polyfill (`invokers/compatible`) contained no `interestfor` implementation at all, so tooltips were silently Chromium-only. The `invokers/interest` build supplies it.
- Header comment corrected: the Popover API is native across the floor, and `interestfor`'s implicit anchors still are not polyfilled (explicit `anchor-name` is why the styling holds).

### menu

- Fix: the optional hover/focus-open path on menu, menubar, and navigation-menu triggers (`interestfor` alongside `popovertarget`) now works outside Chromium, for the same reason as tooltip.

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
