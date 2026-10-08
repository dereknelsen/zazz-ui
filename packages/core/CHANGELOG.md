Notable changes to `@zazz-ui/core`, grouped by primitive or base scope under each version. The grouping is load-bearing: the `zazz-ui` CLI's `update` and `diff` print only the slice that touches the files you've vendored. Breaking entries are flagged **BREAKING** with a one-line migration note. During 0.x, a minor bump means at least one breaking entry (ADR-0010 has the full definition of "breaking").

## 0.5.3 (2026-10-08)

### base

- **BREAKING** `body`, `main`, `header`, `footer`, `section`, and `article` are no longer inline-size query containers, and their container names (`body`, `main`, `section`, …) are gone; `html` is the only page-level container. Breakpoint tiers inside a narrow `section` that sits outside a layout now follow the page: add `data-ui="container"` to that section to keep them on its width. A named query such as `@container section (…)` matches nothing now; drop the name. A sticky sectioning element is no longer an inline-size container either: the stuck state makes it a scroll-state container only.
- New `--object-position` utility (box family, no tiers): any `object-position` value, such as `--object-position: top` or `--object-position: 25% 75%`. Pair it with `--object-fit: cover` to choose which part of an image stays in frame.

### lightbox

- The thumb strip drops to four columns in the nearest container 40rem or narrower, not only inside a `section`. A lightbox in a narrow `section` outside a layout now follows the page, so mark that section `data-ui="container"` to keep four columns there.

## 0.5.2 (2026-10-08)

### base

- New `text-link` typography role for an inline link outside `prose`: an underline in the text's own color at `--decoration-thickness` and `--decoration-offset`, fading on hover. It stacks with a size role (`data-ui="text-sm text-link"`).
- A link inside a plain `<p>` is no longer styled automatically; only `prose` styles its links without a token. That rule reached into markup the kit doesn't own, so it's removed in a patch, along with its `--ui-prose-link-text` hook, which nothing else read. To keep the underline on such a link, add `data-ui="text-link"`.

### prose

- The example sets `--w: 100%`, so the article fills its container up to its reading width instead of shrinking to its content.

## 0.5.1 (2026-10-07)

### card

- Fix: a card without a variant is bare again while still honoring `--ui-card-bg`. 0.5.0 set a private transparent background that blocked the hook, so an inline `--ui-card-bg` on a card no longer reached cards nested in it (SPEC claim 26). The hook's default is now `transparent`; the outline and floating variants still paint `--color-card`.

### button-group

- Fix: grouped controls no longer overlap by 1px, which let hover borders spill onto neighbors and nudged the layout. Each later control drops its leading border instead (`border-inline-start-width` in a row, `border-block-start-width` in a vertical group), so neighbors share one border and right-to-left rows work too.

### toggle-group

- Fix: grouped controls no longer overlap by 1px, which let hover borders spill onto neighbors and nudged the layout. Each later control drops its leading border instead (`border-inline-start-width` in a row, `border-block-start-width` in a vertical group), so neighbors share one border and right-to-left rows work too.

## 0.5.0 (2026-10-07)

Style utilities (custom properties in `style`, called "props" in earlier 0.5 previews) replace utility classes and `data-ui` replaces class identity (SPEC.md, ADR-0012, ADR-0013). 0.5 is an alpha with breaking changes throughout and is not compatible with 0.4.x: migrate markup and themes in one step, using the migration notes below.

### base

- In-page navigation keeps chrome current: a `data-ui-persist` element keeps its scroll offsets in every engine (WebKit reset them, having no `moveBefore()`), and its links take `aria-current` from their twins in the destination's copy, paired by `href`. New `data-ui-persist-scroll="<id>"` renders an element from the destination but keeps its scroll offset, for a region whose content changes per page (a section sidebar). `<ui-debug>` and the lint rule check it like `data-ui-persist` (ADR-0014 amendment).
- New `current` state tier: `--bg--current`, `--text--current`, the group form, and every other state-taking utility match `[aria-current]` with any value but `"false"`, between `checked` and `open` in precedence. Style a current-page link with it so a persisted header updates with `aria-current`.
- Fix: an in-page navigation scrolled the window with the reset's `scroll-behavior: smooth`, so the new page visibly scrolled to the top inside the view transition. The jump is now instant.

- Typeahead engine (autocomplete, combobox, command): `data-<prefix>-filter="none"` leaves filtering to another source, and the list is observed, so items added or removed after the query are ranked (and, in a palette, the new best match highlighted) like typed input.
- Editor support: `editor/zazz.language-data.json` (identity → primitive owners, CSSDoc header summaries, `--ui-*` hook defaults, and design tokens resolved through `var()` / `light-dark()` / `clamp()`) for the Zazz language server. `buildHead({ base, primitives })` loads a page's primitives file by file from a local copy (the granular grain, as `cdn.primitives` does from jsDelivr), and `findHeadBlock` / `headBlockEdit` / `replaceHeadBlock` / `headMarker` read and rewrite a page's `<!-- zazz:head -->` block, whose opening marker may record the `buildHead` options as JSON. The package exports `./manifest.ts` and `./head.ts` sources. `style-format.ts` exports `scanDeclarations` (declarations with name, colon, and value offsets).

- New **utilities layer**, generated from `src/base/utilities.ts` into `_breakpoints.css`, `_properties*.css`, and `_utilities-*.css`: values are custom properties in `style=""` (`--p: 4`, `--w--md: fit-content`, `--bg--hover: var(--color-muted)`), read by attribute-gated rules with breakpoint and state tiers. Registrations are non-inheriting, so a utility never leaks into a child. `html` gains `container-type: inline-size`, the outermost query container for breakpoint tiers.
- **BREAKING** The cascade layer is renamed `zazz` → `ui`: the top-level order is `variables, reset, vendors, legacy, ui, overrides`, with `ui.components`, `ui.plugins`, and `ui.utilities` inside it (were `zazz.components`, `zazz.plugins`, `zazz.utilities`). Migration: rename `@layer zazz.*` and `layer(zazz.plugins)` to `@layer ui.*` and `layer(ui.plugins)` in your own CSS.
- **BREAKING** The focus ring's theme color is the `--color-ring` role (set it on `:root`; default `var(--color-primary)`). The `--ring` token is gone: `--ring`, `--ring-color`, and `--ring-offset-color` are utility names, registered non-inheriting, and the kit reads the ring through `--ring-shadow-color` (the opacity-mixed band color, previously `--ring`) and `--ring-offset-shadow-color` (previously `--ring-offset-color`). Migration: `--ring: …` or `--ring-color: …` on `:root` → `--color-ring: …`; `var(--ring)` / `var(--ring-offset-color)` in your CSS → `--ring-shadow-color` / `--ring-offset-shadow-color`.
- In dark mode the brand roles are light: `--color-primary`, `--color-secondary`, and `--color-tertiary` resolve to their scale's 50 step (0.4: 800), and their `-foreground` roles to the 950 step (0.4: white). Light mode and the status roles (`info`, `success`, `warning`, `destructive`, white foregrounds) are unchanged.
- **BREAKING** Theme roles are `--color-*` (`--color-background`, `--color-primary`, `--color-muted-foreground`, …), declared once as `light-dark()` pairs on `:root`. The bare Shadcn names (`--background`, `--primary`, `--card`, …) are removed, not aliased, so a utility name never collides with an inheriting token; a static test keeps every kit stylesheet on `--color-*`. Migration: prefix every role you set or read with `color-` (`--primary: …` → `--color-primary: …`, `var(--border)` → `var(--color-border)`).
- **BREAKING** The palette scales are `--color-*` too: `--color-primary-50…950` (secondary, tertiary, neutral alike), `--color-white` / `--color-black`, and the alpha overlays `--color-shade-*` / `--color-tint-*`. Migration: prefix every scale you read with `color-` (`var(--primary-600)` → `var(--color-primary-600)`, `var(--shade-900)` → `var(--color-shade-900)`).
- **BREAKING** Directional style utilities name the physical side, `l`/`t`/`r`/`b`, and still set logical properties (so `l` is the right side in RTL): `--ps`/`--pe` → `--pl`/`--pr`, `--ms`/`--me` → `--ml`/`--mr`, `--start`/`--end` → `--left`/`--right`, `--border-s-*`/`--border-e-*` → `--border-l-*`/`--border-r-*`, with their tier, group, and pseudo forms. Hooks named after them follow: `--ui-input-ps`/`-pe` → `-pl`/`-pr` (select, combobox, and the mobile menu's nested accordion alike). Migration: rename `s` → `l` and `e` → `r` in every directional utility and hook.
- New border shorthand utilities: `--border`, `--border-x`, `--border-y`, `--border-l`, `--border-t`, `--border-r`, `--border-b`. A color is a 1px solid border in that color, a number is that many px (`abs()`, so `-2` is 2px) in `--color-border`, and a length is the width in `--color-border`; `--border-style` overrides the solid default. Per side, the side longhand beats `--border-width` / `--border-color`, which beat the side, axis, and all-sides shorthands in that order. The shorthands take state and group tiers, and on a primitive they flatten its border states like any base utility (`<ui-debug>` warns); it also warns on a value that is not one color, number, or length, such as CSS's `1px solid red`, which draws a 1px transparent border.
- Terminology: the inline custom properties are **style utilities** ("style utils"); "props", "style props", "style variables", and "style tokens" are retired in docs, warnings, and code. `src/base/props.ts` is `src/base/utilities.ts` (`Prop` → `Utility`, `PROPS` → `UTILITIES`), and the manifest ships `base/utilities.js`.
- **BREAKING** Text color is the `--text` utility and font size is `--font-size` (0.5 previews had `--color` and `--text`), so a utility never reads like a `--color-*` token: `--text: var(--color-muted-foreground); --text--hover: var(--color-foreground)`, `--font-size: var(--font-size-lg)`; the group and pseudo forms follow (`--group-text--hover`, `--before-text`). Hooks are named after the utilities they back: a text-color hook ends in `-text` (0.4 `-foreground`) and a font-size hook in `-font-size` (as in 0.4); each primitive's section below lists its renames from 0.4. From a 0.5 preview, `--ui-<x>-color` → `--ui-<x>-text` (button, badge, card, dialog, kbd, mobile-menu, option, table, table-head, table-caption, tabs-label, toaster, toaster-description, toggle, tooltip, field, field-label, input-group, password-group, otp-separator, prose-link) and `--ui-<x>-text` → `--ui-<x>-font-size` (field, button, badge, input, kbd, otp-cell, option, select, table, tabs-label, textarea, toaster-description, toaster-title, toggle, tooltip, password-group, input-group). Part hooks that fill a shape (`--ui-otp-caret-color`, `--ui-dialog-backdrop-color`, `--ui-tooltip-arrow-color`, …) keep their names. Migration from a 0.5 preview: rename sizes first (`--text:` → `--font-size:`, `-text` hooks → `-font-size`), then colors (`--color:` → `--text:`, `-color` text hooks → `-text`).
- Pseudo-element forms (`--before-*` / `--after-*`) now cover position, display, z, the inset utilities (`--before-inset-y`, `--before-left`, …), padding, opacity, the transforms, transition, aspect, visibility, pointer-events, outline, and font size/weight, besides sizing, color, and `--rounded`: enough to draw an accent bar or a badge dot without a stylesheet. `--before-display` takes CSS values (`block`), not the `flex-col` shorthands.
- **BREAKING** `--place` is `--place-items`, and `--place-content` joins it: both take the CSS alignment keywords (`center`, `start`, `end`, `stretch`, `space-between`, `safe end`, …) and work tier-only like `--items` and `--justify`. Migration: rename `--place:` to `--place-items:`.
- Tier-only utilities work on any element that is not a primitive: the no-base rules exclude primitives by tag form and `data-ui` identity (generated from `src/primitives/`) instead of any `data-ui`, so typography roles, switches, and `prose` count as plain. `--opacity--hover: .8` alone now works on `data-ui="text-2xl"` or `data-ui="group"`; a button or card still needs the base, because it sets those properties itself.
- Tier-only utilities: `--opacity`, `--scale`, `--translate`, `--rotate`, `--shrink`, `--flex-wrap`, `--position`, `--overflow` / `-x` / `-y`, `--rounded`, `--aspect`, and `--z` join the SPEC §3 no-base allowlist, so `--opacity--hover: .4` or `--rounded--md: var(--radius-lg)` works alone on a plain element (a primitive still needs the base, since it carries its own chain). `--shadow` and the `--ring*` utilities work tier-only the same way through their shared `box-shadow` composite. The no-base rules also fire on the `--group-<utility>--<state>` form.
- Removed tokens nothing read: `--default-transition-property` and `--font-weight-mono`. **BREAKING** The per-state decoration tokens (`--decoration-color--hover` / `--active`, `--decoration-offset--hover` / `--active`) are removed; a link's `:hover` rule sets `--decoration-offset: calc(var(--decoration-thickness) * 2)` itself and `:active` resets it with `inherit` (button and badge link variants, prose links, links inside `<p>`). Link buttons also read `--decoration-thickness--hover` / `--active`, which never existed, so their underline lost its thickness on hover; the reads are gone. Migration: override the base `--decoration-*` tokens on `:root`, or set them in your own `:hover` rule. Fix: a prose `h1` spaced itself with `--paragraph-spacing-display`; it reads `--paragraph-spacing-h1`.
- **BREAKING** The focus-ring recipe's element private is renamed `--_ring` → `--_ring-fill` in every primitive: `--_<utility>` names are the utilities layer's own privates (a `--ring` utility would have overwritten the ring color). A static test rejects any hand-written use of a generated private name. Migration: if you copied the ring recipe from `_variables.css` into your own component, rename its `--_ring`.
- Carousel: slides are `transition: none`. Embla loops by moving slides with `transform`, so a transition on a slide (an `<a>` slide picked up the link transition) swept the looped slide across the viewport between the last and first slide. Put hover transitions on a slide's child, as the fragments do.
- Carousel: the slide gap is a hook, `--ui-carousel-gap` (default `0px`); set it on `:root` so the slide basis follows. A dual-mode `--gap` utility on the slide container changes the gap only (the basis token is computed on `:root`, as in 0.4). 0.4 read the gap from the `.gap-*` utility class on the host, which no longer exists.
- **BREAKING** The theme is pinned with one attribute, `data-ui-theme="dark" | "light"` on any element (ADR-0013); the `.dark` / `.light` classes and `data-theme` no longer scope a theme. The head's theme script sets `data-ui-theme` on `<html>` from the stored choice and otherwise leaves the page on the system scheme; the command palette's `--theme-toggle` flips the attribute. Migration: replace `class="dark"` with `data-ui-theme="dark"`; if your own script toggled the class, set the attribute instead.
- **BREAKING** The layout primitive replaces the `.container` system (SPEC §12): `<ui-layout>` or `data-ui="layout"` is itself the band grid for its children (0.4 turned the _parent_ region into the grid); children default to the `xl` band, `data-layout-size` changes that default (was `data-container` on the container), and a child is placed with `--band: layout-md`, `--band: layout-bleed`, `--band--lg: layout-xl` (was `data-container` on the child). Band lines are `layout-<breakpoint>-start/-end` plus `layout-full` and `layout-bleed`; a layout that is a direct child of a layout is a subgrid that keeps the parent's line names. `base/_layout.css` (the `.container`, `@md:container`, `@max-md:container`, and article-width variants) is removed; an article reading width is a utility (`--max-w: var(--article-lg); --mx: auto`). The `--band` no-base rule excludes layout children so a tier-only `--band--lg` keeps the band below lg.
- **BREAKING** The 0.4 class layer `base/_utilities.css` is deleted; the generated utilities layer (`base/_properties*.css`, `base/_utilities-*.css`) is the whole utilities surface. `MANIFEST_VERSION` is 2 (the CLI's supported range is 1–2). The 0.4 `.container[data-variant="article"]` reading measure is a `data-ui="prose"` block with `--max-w: var(--article-*)` and `--mx: auto`; the responsive `@md:container` / `@max-md:container` variants are breakpoint tiers on a child's band (`--band: layout-full; --band--md: layout-sm`). Fractional basis classes subtracted the gap; write it out: `--basis: calc((100% - var(--space-md)) / 2)`. The utilities examples (`primitives/utilities/*.html`) are rewritten to utilities.
- **BREAKING** In-page navigation is opt-in and persistence is explicit (SPEC §17, ADR-0014). `navigation.js` swaps only between pages whose `<html>` carries `data-ui-navigation="swap"`, and swaps the whole `<body>` rather than `<main>`; an element survives only with `data-ui-persist="<id>"` on both pages (moved with `moveBefore()` where supported, so it keeps its state). Without the opt-in, navigation is native. `data-layout` on `<main>` is no longer read. Reloads are never intercepted (before, `location.reload()`, including a dev server's live reload, swapped only `<main>` and left the header stale). `ZazzElement` gains a no-op `connectedMoveCallback`, so a moved element keeps its setup. `<ui-debug>` lists the persisted elements and warns on misuse. Migration: add `data-ui-navigation="swap"` to `<html>` on pages that relied on the swap, and `data-ui-persist="toaster"` to a `<ui-toaster>` that should survive navigations.
- New `starting` state (`@starting-style`, generated into `_utilities-tier-starting.css` and `_properties-starting.css`): `--<utility>--starting` on any color or effects utility is the value the element starts from when it first renders or leaves `display: none`, so a `--transition` animates in from it (`--opacity--starting: 0; --opacity: 1; --transition: opacity 0.3s`). It outranks every other state and has no `--group-*` form (`<ui-debug>` flags one). The html formatter writes it first in its utility's lines.
- **BREAKING** Breakpoint tiers query the **nearest inline-size container** (`@container (width >= 65ch)`) instead of page flags: the `--cqi-*` flags, the body setter, and the style queries behind every breakpoint setter and keyword rule are removed. The reset's `html`, `body`, `main`, `header`, `footer`, `section`, and `article` stay inline-size containers, so page-level markup responds as before; new `data-ui="container"` switch (`container-type: inline-size`) makes any element one, so tiers inside a card, sidebar, or slot follow its width. An element never queries itself (a container's own tiers read the container above), and `body` can now use responsive utilities. Breakpoints no longer depend on container style queries (Baseline only since 2026). Migration: a subtree that pinned `--cqi-*` to force a mobile layout becomes a narrow `data-ui="container"`.
- **BREAKING** Breakpoints are Tailwind's five names (`sm`–`2xl`) with thresholds in `ch`, chosen for legibility: `sm` 40ch (the narrowest comfortable line), `md` 65ch (one reading measure, `--article-md`), `lg` 90ch (two 45ch columns), `xl` 120ch (three 40ch columns), `2xl` 150ch (two 75ch measures); ≈ 404/656/909/1210/1515px with the system font. `ch` resolves against the nearest container's font, so a narrower face or a smaller-font container reaches each breakpoint earlier. Layout widths are a separate rem scale, renamed `--breakpoint-*` → `--layout-sm` … `--layout-2xl` (40/48/64/80/96rem): the layout bands and the dialog and command widths read them. The `2xs` and `xs` breakpoints are removed with their tiers (`--*--2xs`, `--*--xs`), bands (`layout-2xs`, `layout-xs`), and `data-layout-size` presets; the navigation-menu popover and the lightbox example size to `--article-sm` instead of `--breakpoint-xs`. Migration: `var(--breakpoint-*)` → `var(--layout-*)`; `--*--xs` → `--*--sm` (shift a progression up one step, as the carousel and responsive-grid examples do); `layout-2xs` / `layout-xs` → `layout-sm` or `--max-w: var(--article-*)`.
- Each child of a layout is an inline-size query container (`--ui-layout-child-container`, default `inline-size`; `normal` opts a layout's children out), so breakpoint tiers inside a band follow the band's width instead of the full-width section around it. Nested layouts, children that subgrid, and children sized by `fit-content` / `min-content` / `max-content` stay uncontained (containment would break a subgrid or collapse a content-sized box); every primitive fragment renders identically either way.
- New `--inset-x` and `--inset-y` utilities (spacing family, dual mode, breakpoint tiers): `inset-inline` (left and right) and `inset-block` (top and bottom), logical like the side utilities: `--inset-x: 0; --inset-y: var(--space-sm)`.
- New experimental `stuck` state (container scroll-state queries natively in Chromium, behind `@supports (container-type: scroll-state)`; elsewhere the new `base/scroll-state.js` polyfill, which `index.js` imports only where the query is unsupported; generated into `_utilities-tier-stuck.css` and `_properties-stuck.css`): every sticky element (`--position: sticky`, its tiers, or raw `position: sticky`) or `--stuck-state` element is a scroll-state container, and `--<utility>--stuck` on its **descendants** (a container query never matches the container) applies while it is stuck to the side `--stuck-state` names: `top` (default), `right`, `bottom`, `left`, `block-start`, `block-end`, `inline-start`, or `inline-end`. It ranks below every own and group state, has no `--group-*` form, and `--stuck-state` takes no tiers (switch `--position` per breakpoint instead). The polyfill measures each container on scroll and resize (once per frame) and writes its stuck sides to `data-ui-stuck`. `<ui-debug>`'s `scroll-state` rule flags an unknown side, a tiered `--stuck-state`, a `--*--stuck` on the sticky element itself, and a group form.
- `--position` takes breakpoint tiers (it moves from the box family to flow): `--position: sticky; --position--lg: static`.
- Color utilities take breakpoint tiers too (`--bg--md`, `--text--lg`, `--border-color--md`, the border utilities, …), so paint can change per breakpoint; a state still beats a breakpoint (`--bg--md: black; --bg--hover: gray` is gray on hover at any width), and `--bg--md: none` clears a gradient from md up. Effects stay state-only.
- New keyword shorthands (SPEC §3a), each working at every tier of its utility: `--shadow: md` (`2xs … 2xl`) reads as `var(--shadow-md)`, and `--font-weight: strong` (also `heading`, `body`) as `var(--font-weight-strong)`; any other value still passes through. `<ui-debug>`'s new `font-weight-name` rule turns a standard weight name (`medium`, `semibold`, …), which is not CSS, into a fix to the number (`500`). Spacing has no keywords: the space tokens are scale steps, so write the number (`--p: 4` is `var(--space-sm)`; 2xs 1, xs 2, sm 4, md 6, lg 11, xl 24, 2xl 40).
- New shadow color controls: the `--color-shadow` theme input tints every `--shadow-*` token (default `--color-black`), and the `--shadow-hue` utility re-declares the shadow tokens on its element, so that element and its subtree (keyword, `var(--shadow-*)`, and primitive shadows) take that hue.
- **BREAKING** `--flex-direction` is removed: `--display` takes flex shorthands that set the direction with the display, at every breakpoint: `flex-row`, `flex-col`, `flex-row-reverse`, `flex-col-reverse`, and `inline-flex-…` (`--display: flex-col; --display--md: flex-row`). A tier with any other display resets the direction to row. Migration: `--display: flex; --flex-direction: column` → `--display: flex-col`; `--flex-direction--md: row` → `--display--md: flex-row`; `<ui-debug>` points a leftover `--flex-direction` at the shorthand. The kit's fragments are migrated.
- Reset hooks: native-element rules that used a token directly now declare a hook in the same rule, so one override retunes them: `--strong-font-weight` (`b`, `strong`), `--hr-bg`, `--code-font-family`, `--optgroup-font-weight`, `--optgroup-option-pl`, and `--selection-bg` (on `html`).
- New gradient utilities: `--bg-linear`, `--bg-radial`, and `--bg-conic` take the gradient's prelude (a direction or angle, shape, size, `at <position>`, and/or `in <color-space> [<hue> hue]`) and compose `background-image: <type>-gradient(<prelude>, <--bg-stops>)` with the shared `--bg-stops` (normal color-stop syntax): `--bg-linear: to bottom in oklch; --bg-stops: var(--color-shade-600), transparent 20%`. `--bg` stays the color underneath. One gradient per element (conic wins over radial over linear); `<ui-debug>`'s new `gradient-incomplete` rule flags a type without stops, stops without a type, and two types.
- `--bg: none` clears the background: the color is transparent (on a primitive too) and `background-image` is `none`, at the base and at each state and group tier (`--bg--hover: none` drops a gradient on hover). The editor offers `none` for `--bg`.
- Raw track lists are `--template-cols` / `--template-rows` (Tailwind's `grid-cols-[…]`), with breakpoint and state tiers, the group form, and no base needed for a tier: `--template-rows: 0fr; --template-rows--open: 1fr` animates an expand.
- Grid lines are placed only with the span, start, and end utilities: there is no raw `--row` (write `--row-span: 3` for `span 3`), and `--band` is the layout child's band.
- New grid placement utilities matching Tailwind's: `--col-span` / `--row-span` (a count → `span n / span n`), `--col-start`, `--col-end`, `--row-start`, `--row-end` (line numbers), all with breakpoint tiers and on the no-base allowlist (span ends in `1`, start and end in `auto`); start and end follow span in source, so `--col-start: 2; --col-span: 3` combines. A layout's children are excluded from their no-base rules, as for `--band`. Span every track with `--col-start: 1; --col-end: -1` (Tailwind's `col-span-full`); `<ui-debug>` suggests it for `--col-span: full`.
- `--grid-cols` / `--grid-rows` also take `subgrid` (Tailwind's `grid-cols-subgrid`; `grid-cols-none` is `--template-cols: none`); a track list stays in `--template-cols` / `--template-rows`.
- Keywords mix with numbers (SPEC §6, ADR-0012 amendment): `--w: 4; --w--md: auto`, `--w: auto; --w--md: 4`, `--w: fit-content; --h: 4`, `--mx: auto; --max-w: 56`, and `--grid-cols: 2; --grid-cols--md: subgrid` all work. Each keyword-bearing utility gets explicit keyword rules (a base keyword rule, then per breakpoint a typed restore rule and a raw keyword rule) instead of switching its family to raw emission, which made sizing numbers dead on any element with a sizing keyword. `if()` will replace these rules once it is across the support floor. `<ui-debug>` drops its "number read raw next to a sizing keyword" warning.
- **BREAKING** `html` is the page's scrolling element again: `body` is `min-block-size: 100svh` (footer still pinned on short pages) instead of a fixed-height `overflow-y: auto` scroller, `scroll-behavior: smooth` moves to `html`, and `scrollbar-gutter: stable` is removed. `body` keeps `overflow-x: clip`. Migration: scroll code that targeted `document.body` (`body.scrollTo()`, `body.scrollTop`, a `scroll` listener on body) should use `window` / `document.scrollingElement`.
- `<ui-debug>` no longer warns that a utility flattens a primitive's state when the element carries a variant preset (`data-button-variant="ghost" style="--text: var(--color-white)"`): a variant plus a utility override is the intended pattern, as in Tailwind.
- New `AUTHORING.md` (shipped): the markup rules for 0.5 in one page, for people, editor rules, and AI assistants.
- Editor custom data now completes values after the colon (design tokens per utility, CSS keywords for keyword utilities, layout bands for `--band`) and lists the `--group-<utility>--<state>` forms; `<ui-debug>` accepts group utilities.
- New role tokens behind the typography roles: `--font-{feature,kerning,language,size-adjust,alternates,caps,east-asian,emoji,ligatures,numeric,position,settings,optical-sizing}-{heading,body}` (the font-feature, kerning, and font-variant controls), declared on `:root` at their CSS initial values (the heading optical-sizing token was `--font-optical-heading`; it is `--font-optical-sizing-heading`, matching the body token); redeclare one to turn a feature on (`--font-numeric-body: tabular-nums`).
- Fix: card and carousel fragments read an undeclared `--aspect-landscape` token after the class migration; they use `3 / 2` again, as 0.4 did.
- New `./index.ts` export: the TypeScript entry, for bundlers that transpile the sources (the playground imports it so core edits hot-reload without `tsc`).
- New editor custom data (SPEC §13, claim 21): `editor/zazz.html-data.json` (every `data-ui` token, every `data-<name>-<key>` attribute with its values, the tag forms) and `editor/zazz.css-data.json` (every utility, tier and pseudo form, every `--ui-*` hook), generated by `vp run generate` and pinned by a freshness test; the workspace `.vscode/settings.json` wires them into VS Code.
- New `<ui-debug data-debug-domains="localhost">` (`primitives/debug/debug.js`, SPEC §13, development only): audits every `style` attribute for unknown utilities, wrong modes, tiers without a base, tiers a family lacks, a base utility that flattens a state a primitive hook covers (claim 27), raw properties shadowing a utility, whitespace the gates cannot match, and `data-<name>-*` presets outside their identity (tag form, token, or an ancestor; slots and states are exempt). Identities and hooks are read from the page's stylesheets, so it ships with only `base/utilities.js`; on an unlisted domain it removes itself and warns once (`data-debug-warnings="false"` silences it). `audit(root)` is exported for tooling. Not loaded by `index.js`; `zazz-ui add debug`.
- New optional `primitives/style-guard/style-guard.js` (SPEC §13): a `MutationObserver` that restores an element's utilities when a legacy `style` rewrite (`el.style.cssText = …`, jQuery `.attr("style", …)`) drops them all at once; a single `removeProperty` stays removed (even when it was the only utility: the other declarations surviving the write tells a removal from a rewrite); a rewrite that sets new utilities becomes the new snapshot; `start(root)` re-roots; `data-ui-guard="off"` opts out. Not loaded by `index.js`; add it per page or via `zazz-ui add style-guard`.
- Tests: the browser suite runs green in Chromium and WebKit (`ZAZZ_BROWSERS=webkit`); the harness gained `tabTo(el)` and `settled(el)` so focus-ring assertions wait for the ring transition and reach buttons where WebKit skips them on Tab.
- Fix (performance): a parent's inline utility change no longer restyles its whole subtree. Two causes, measured on a container with 1,000 styled children at 196 ms per restyle (0.4 ms now): the reset's universal `::selection { background-color: var(--selection-bg) }` made Chromium recompute every descendant's highlight style on any custom property change, so both selection rules sit on `:root::selection` and reach every selection through highlight inheritance (Chrome 134+, Firefox, WebKit; other engines fall back to the UA selection color); and the stuck readers named their container in an ancestor compound (`[style*="--stuck-state: top"] [style*="--stuck:"]`), which made any inline style change invalidate every styled descendant, so the container now publishes its side as a typed `--_stuck-side` and each side query is `scroll-state(stuck: <side>) and style(--_stuck-side: <side>)` on a plain `[style*="--stuck:"]` reader (the polyfill half compares `data-ui-stuck` on the container and publishes an inherited `--_stuck-polyfill`). `--stuck-state` is registered non-inheriting like a utility.
- **BREAKING** The per-side border longhands (`--border-{l,t,r,b}-width`, `--border-{l,t,r,b}-color`, eight utilities with every color tier) are removed: a side takes only its shorthand. Migration: `--border-b-width: 1px; --border-b-color: var(--color-border)` → `--border-b: 1`; a colored side → `--border-t: var(--color-primary)` (1px); a wide colored side → `--border-width: 2px; --border-t: var(--color-primary)` or `--border-t: 2; --border-color: …`.
- `--text-decoration` takes the state tiers and the group form besides breakpoints, and works tier-only: `--text-decoration--hover: underline` on a link, `--group-text-decoration--hover: underline` on a card's title.
- New animation switches from Tailwind: `data-ui="spin"` (a turn every 1s), `"ping"` (scale 2× and fade every 1s), `"pulse"` (half opacity and back every 2s), and `"bounce"` (drop and rise every 1s). They use `--default-transition-timing-function`, animate `transform` (so the transform utilities still compose), and only run under `prefers-reduced-motion: no-preference`.
- New `data-ui="not-prose"`: prose stops styling that element's subtree (Tailwind Typography's `not-prose`), for a form or widget embedded in an article.
- New `truncate` switch: `data-ui="truncate"` keeps text on one line and ends the overflow with an ellipsis (`overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`). A flex item also needs `--min-w: 0`; `--line-clamp` clamps to more lines.
- New `divide-x` / `divide-y` switches: `data-ui="divide-y"` draws a border on the trailing logical edge of every direct child but the last (1px `--color-border`), and `--divide` on the container sizes or colors it with the border shorthand's grammar (`--divide: 2`, `--divide: var(--color-primary)`); its width and color channels are the layer's only inheriting privates. A switch rather than a `--divide-x` utility because a `[style*=…] > *` rule would make every inline style change invalidate the changed element's subtree.
- **BREAKING** Fewer keyword utilities: `--size`, `--min-h`, and `--max-h` no longer take `auto` / `fit-content` / `min-content` / `max-content` (`--w`, `--h`, `--min-w`, `--max-w` still do), and `--grid-cols` / `--grid-rows` no longer take `none`. Migration: `--size: fit-content` → `--w: fit-content; --h: fit-content`; the hero that must not squish, `--h: 100svh; --min-h: fit-content` → `--min-h: 100svh` (Tailwind's `min-h-svh`: height stays auto, clamped to the viewport); `--grid-cols: none` → `--template-cols: none`.
- The gradient utilities (`--bg-linear`, `--bg-radial`, `--bg-conic`, `--bg-stops`) take no tiers (`tiers: "none"` in `utilities.ts`, a per-utility override of the family's tier kind): `--bg--hover: none` still clears a gradient in a state.
- State setters, keyword aliases, and `--bg--<state>: none` put the pseudo-class before the attribute gate (`:where(:hover[style*="--hover:"])`): the flag test short-circuits before the substring scan, which cuts initial style time on a utility-heavy page. The generated files' comments are a few words each (`src/index.css` ships them raw).
- **BREAKING** `scroll-fade` is a small primitive (SPEC §11): `data-ui="scroll-fade"` with `data-scroll-fade-axis="x"` for the inline axis, hooks `--ui-scroll-fade-size`, `--ui-scroll-fade-reveal`, and `--ui-scroll-fade-mask`. The `.scroll-fade*` utility classes (per-edge, per-size variants) are gone; a per-edge depth is not carried over (set `--ui-scroll-fade-size`).
- **BREAKING** Typography roles are `data-ui` tokens (SPEC §10): `data-ui="text-display"`, `text-h1`…`text-h6`, `text-2xl`…`text-2xs`, and `text-eyebrow` replace the `.text-*` classes, and native `h1`–`h6` wear their role without a token. Weight, family, style, and decoration are utilities (`--font-weight`, `--font-family`, `--font-style`, and the new `--text-decoration`), so the `.font-*`, `.italic`, `.underline`, `.overline`, `.line-through`, and `.no-underline` classes are gone. `.text-link` is gone too: a link inside `<p>` is styled as one automatically; elsewhere use `data-ui="button" data-button-variant="link"`. A role followed by `--font-size` / `--font-weight` keeps its family and leading (claim 12). Migration: `class="text-lg font-strong"` → `data-ui="text-lg" style="--font-weight: var(--font-weight-strong)"`. Roles sit in the `reset` layer, so a component rule now beats a role and utilities override both (0.4 role classes were utilities and beat component rules; use `--font-size`, `--leading`, `--font-weight` where a role must win).
- **BREAKING** The rich-text switch is `data-ui="prose"` (was `class="ui-prose"`). Hook: `--ui-prose-link-color→--ui-prose-link-text`; the other `--ui-prose-*` hooks are unchanged.
- New `base/_switches.css` (SPEC §11): `data-ui="sr-only"` (was `.sr-only`), `data-ui="pile"` (was `.grid-area-pile`), and `data-ui="isolate"` (was `.z-isolate`; `isolation: isolate`, replacing the 0.5-preview `--isolation` utility). It loads after the generated utilities.
- **BREAKING** One spacing scale and one font-family layer. `--spacing` is the fluid unit (the dual-mode utility scale, `clamp(0.225rem, …, 0.25rem)`), and `--space-2xs … --space-2xl` are its named multiples (1, 2, 4, 6, 11, 24, 40). Removed: the numeric `--step-*` scale (write a utility number, `--max-w: 96`, or `calc(var(--spacing) * N)` in CSS; `--step-px` and `--step-full` are just `1px` and `100%`), `--gap-xs…xl` (now `--space-xs…xl`), `--_spacing-interval`, and `--font-body` / `--font-heading` / `--font-mono` (set `--font-family-body` / `-heading` / `-mono` directly).
- Sized token families run 2xs to 2xl: `--space-*`, `--font-size-*`, `--leading-*`, `--tracking-*`, `--paragraph-spacing-*`, `--radius-*`, `--shadow-*`, `--article-*`, plus the `data-ui="text-2xs"` and `"text-2xl"` roles. The new end values extend each curve (`--font-size-2xs` matches the eyebrow size and `--font-size-2xl` the h5 size; `--article-2xs` / `-2xl` are 40ch / 80ch).
- The full-page example pages that shipped under `examples/` in 0.4 (`index.html`, `components.html`, `forms.html`, …) are removed from the package pending a rewrite (the docs Templates section with them). The containment test (claim 8) now runs against every primitive fragment.
- Removed the unused `--is-breakpoint-*` flags.
- The manifest exports `CORE_RUNTIME` (`base/utils.js`, `signals.js`, `zazz-element.js`, `dialog-lifecycle.js`, `navigation.js`) and `CORE_POLYFILLS` (`base/scroll-state.js`, loaded only where `CSS.supports("container-type", "scroll-state")` fails), so the CLI vendors the navigation runtime and the scroll-state polyfill. Both exports are optional, so `MANIFEST_VERSION` stays 2.
- Fix: prose paragraph spacing read `--paragraph-spacing-multiplier` instead of `--_paragraph-spacing-multiplier`, so its margins were invalid; scroll-fade read an undeclared `--spacing-interval`; the lightbox image base scale and opacity hooks were never declared; the select picker read an undeclared `--ui-popover-backdrop-filter` (removed). A new guard test fails on any variable a kit stylesheet reads without a fallback and nothing declares.

### layout

- Fix: only a layout that is a direct child of a layout becomes a subgrid. One nested deeper (inside a card or section in a band) has no parent grid to share and used to collapse; it is now its own band grid.

### button

- **BREAKING** Identity is `data-ui="button"` (a space-separated token list matched with `~=`); `.ui-button` no longer matches. Presets are scoped: `data-button-variant="primary|secondary|tertiary|muted|ghost|outline|info|success|warning|destructive|link"` (`secondary`, `tertiary`, and `outline` are new; `outline` is a transparent surface with hook-colored text and border) and `data-button-size="sm|icon|icon-sm"` replace `data-variant` / `data-size`. Migration: `class="ui-button" data-variant="primary"` → `data-ui="button" data-button-variant="primary"`.
- **BREAKING** Hooks are named after the utilities they back (SPEC §9) and may take a scale number or a length where the utility is dual-mode:

  | 0.4                                                                                                          | 0.5                           |
  | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
  | `--ui-button-background(--hover/…)`                                                                          | `--ui-button-bg(--hover/…)`   |
  | `--ui-button-foreground(--hover/…)`                                                                          | `--ui-button-text(--hover/…)` |
  | `--ui-button-line-height`                                                                                    | `--ui-button-leading`         |
  | `--ui-button-padding`                                                                                        | `--ui-button-px` (dual)       |
  | `--ui-button-block-size`                                                                                     | `--ui-button-min-h` (dual)    |
  | `--ui-button-radius`                                                                                         | `--ui-button-rounded`         |
  | `--ui-button-gap`                                                                                            | unchanged (dual)              |
  | `--ui-button-font-size`, `-ring-color`, `-font-family`, `-font-weight`, `-border-*`, `-icon-size`, `-shadow` | unchanged                     |

  Every consumer inside the kit (toggle, select, autocomplete, combobox, command, lightbox, menu, navigation-menu, popover) reads the new names.

- Utilities work on a button: `--px: 4` beats a variant, which beats an inline or subtree hook, which beats the `:root` hook; `--px--md: 6` alone applies at md with the hook below; a stylesheet `--px` does nothing. Variants write non-inheriting privates, so a variant never cascades into a nested button while an inline hook does. An inline `--bg` flattens hover (use the hook or `--bg--hover` to keep it). The focus ring is published to `--_focus-ring` and survives `--shadow` and `--ring` utilities.
- The link variant's minimum block size is now `0` (was `fit-content`, which dual mode cannot carry); rendered size is unchanged.
- Hover styles sit behind `@media (hover: hover)`, so a tapped button no longer sticks in its hover color on touch screens.
- New `data-button-variant` values `info`, `success`, and `warning` fill the button with the `--color-info` / `--color-success` / `--color-warning` role and its `-foreground`, like `destructive`.
- Toaster's action and close buttons are created with `data-ui="button"` and `data-button-*` presets.
- The dual-mode hooks (`--ui-button-px`, `-min-h`, `-gap`) take scale numbers on the button itself; the select's option hooks (`--ui-option-px`, `-min-h`, `-gap`) alias them as raw lengths, so keep those hooks as lengths if you theme select options.

### separator

- **BREAKING** Identity is `data-ui="separator"`; `.ui-separator` no longer matches. The vertical form is `data-separator-orientation="vertical"` (was `data-orientation`). Migration: `<hr class="ui-separator" data-orientation="vertical">` → `<hr data-ui="separator" data-separator-orientation="vertical">`.
- **BREAKING** `--ui-separator-color` is renamed `--ui-separator-bg` (it backs the `--bg` utility); `--ui-separator-thickness` is unchanged. A `--bg` utility on the separator wins over the hook.

### fields

- The hover border (`--ui-field-border-color--hover`) is `--color-border` mixed with 10% `--color-primary` (was the full primary color).
- New example fragment `fields.html`: a field with hint and error, and a checkbox field group.
- **BREAKING** Identities are `data-ui="field"` (wrapper) and `data-ui="field-group"` (fieldset; `data-ui="radio-group"` shares its rules). Slots are `data-field-slot="label | description | hint | error"` (was `data-slot="field-*"`); the inline layout is `data-field-orientation="horizontal"` (was `data-orientation`). Migration: `<div class="ui-field"><label data-slot="field-label">` → `<div data-ui="field"><label data-field-slot="label">`.
- **BREAKING** The shared `--ui-field-*` family is renamed to utility names; every control in the kit reads the new names:

  | 0.4                                                                                                                                                                         | 0.5                                           |
  | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
  | `--ui-field-background(--hover)`                                                                                                                                            | `--ui-field-bg(--hover)`                      |
  | `--ui-field-background--focus`                                                                                                                                              | `--ui-field-bg--focus-within`                 |
  | `--ui-field-border-color--focus`                                                                                                                                            | `--ui-field-border-color--focus-within`       |
  | `--ui-field-foreground`                                                                                                                                                     | `--ui-field-text`                             |
  | `--ui-field-radius`                                                                                                                                                         | `--ui-field-rounded`                          |
  | `--ui-field-block-size`                                                                                                                                                     | `--ui-field-h`                                |
  | `--ui-field-font-size` / `-line-height`                                                                                                                                     | `--ui-field-font-size` / `--ui-field-leading` |
  | `--ui-field-padding`                                                                                                                                                        | `--ui-field-px`                               |
  | `--ui-field-template-columns`                                                                                                                                               | `--ui-field-template-cols`                    |
  | `--ui-field-align-self` / `-inline-size`                                                                                                                                    | `--ui-field-self` / `--ui-field-w`            |
  | `--ui-field-group-background`                                                                                                                                               | `--ui-field-group-bg`                         |
  | `--ui-field-group-padding` / `-margin`                                                                                                                                      | `--ui-field-group-p` / `--ui-field-group-m`   |
  | `--ui-field-label-color`                                                                                                                                                    | `--ui-field-label-text`                       |
  | `--ui-field-group-radius`                                                                                                                                                   | `--ui-field-group-rounded`                    |
  | `-border-width/style/color`, `-ring-color`, `-inset-child-radius`, `-addon-padding`, `-gap`, `-option-gap`, `-icon-size`, `-hint-translate--*`, `-group-display/border/gap` | unchanged                                     |

- **BREAKING** Slot styling is scoped to the wrapper: `data-field-slot="label"` and friends style only inside `data-ui="field"` (0.4 styled `data-slot="field-label"` anywhere). Migration: give the wrapping element `data-ui="field"`.
- The dual-mode hooks (`--ui-field-px`, `-h`, `-gap`) take scale numbers on the field wrapper and group; the controls still alias them as raw lengths until their own cycles, so keep those hooks as lengths if you theme inputs, selects, or textareas. Textarea and select read the `--focus-within` hooks under `:focus-visible` / `:open` respectively, as before.
- Each control now owns its disabled and `:user-invalid` rules in its own file (input, textarea, select, input-group, password-group, radio, checkbox) instead of `fields.css` listing them by class; rendering is unchanged. The dead `.ui-input-file` / `.ui-input-color` entries are dropped.
- Utilities work on the wrapper and the group: `--display`, `--template-cols`, `--gap`, `--self`, `--w` on a field; `--display`, `--bg`, `--gap`, `--rounded`, `--p`, `--m` on a group.

### badge

- **BREAKING** Identity is `data-ui="badge"`; presets are `data-badge-variant="primary|secondary|tertiary|muted|ghost|info|success|warning|destructive|link"` and `data-badge-size="icon"`. Hooks follow the button's rename (`background→bg`, `foreground→text`, `line-height→leading`, `padding→px`, `block-size→h`, `radius→rounded`; `-font-size` unchanged); the combobox tag template and `--ui-combobox-*` defaults read the new names. Migration: `class="ui-badge" data-variant="muted"` → `data-ui="badge" data-badge-variant="muted"`.
- Fix: the focus ring shows on keyboard focus alone; 0.4 required the pointer to be hovering as well. Hover styles sit behind `@media (hover: hover)`. A disabled badge still goes muted whatever its variant, as in 0.4.
- New `data-badge-variant` values `secondary` and `tertiary` (the brand roles) and `info`, `success`, `warning`, and `destructive` (the `--color-*` status roles with their `-foreground`); 0.4 badges had only `primary`, `muted`, `ghost`, and `link`.
- The link variant's block size is `auto` (was `fit-content`); rendered size is unchanged. Icon badges in the fragments name themselves with `aria-label` instead of a visually hidden span.

### kbd

- **BREAKING** The group's attribute form is `data-ui="kbd-group"` (the `<ui-kbd-group>` tag form is unchanged); `.ui-kbd-group` no longer matches. Hooks are renamed to utility names: `--ui-kbd-line-height→leading`, `-background→bg`, `-foreground→text`, `-radius→rounded`, `-padding-inline→px`, `-padding-block→py`, `-min-inline-size→min-w`, `-min-block-size→min-h` (`-font-size`, `-font-family`, `-border`, `-icon-size`, `-gap`, `-group-gap` unchanged); button, tooltip, and command read the new names. The bare `<kbd>` needs no identity and takes utilities (`--min-w: 8`) and subtree hooks as before.

### button-group

- **BREAKING** The attribute form is `data-ui="button-group"` (the `<ui-button-group>` tag form is unchanged); the vertical preset is `data-button-group-orientation="vertical"` (was `data-orientation`). Hooks: `--ui-button-group-radius→rounded`, `-background→bg`; `--rounded` and `--bg` utilities apply to the group.

### toggle

- **BREAKING** Identity is `data-ui="toggle"` on the `<label>`; presets are `data-toggle-variant="primary|muted|ghost|destructive"` and `data-toggle-size="sm|icon|icon-sm"`. Hooks follow the button's rename (`background→bg`, `foreground→text`, `line-height→leading`, `padding→px`, `block-size→min-h`, `radius→rounded`; `-font-size` unchanged); the `--checked`, `--checked-hover`, and `--checked-active` suffixes are unchanged. Migration: `class="ui-toggle" data-size="icon"` → `data-ui="toggle" data-toggle-size="icon"`.
- A disabled toggle still goes muted whatever its variant, as in 0.4. Utilities apply to the label (`--px: 4` beats the `sm` size); because the checked state lives on the nested input, the label's own state tiers (`--bg--checked`) do not fire: theme the checked look through the `--ui-toggle-*--checked` hooks. Hover styles sit behind `@media (hover: hover)`.

### toggle-group

- **BREAKING** The attribute form is `data-ui="toggle-group"` (the `<ui-toggle-group>` tag form is unchanged); the vertical preset is `data-toggle-group-orientation="vertical"` (was `data-orientation`). The checked, focused, or hovered toggle now floats above its neighbours so its border and ring paint over the shared edge, as in the button group. New hooks `--ui-toggle-group-rounded` and `--ui-toggle-group-bg` back the `--rounded` and `--bg` utilities on the group.

### accordion

- **BREAKING** The attribute form is `data-ui="accordion"` (the `<ui-accordion>` tag form is unchanged); `.ui-accordion` no longer matches. Hooks are unchanged (none backs a utility). The summary publishes its focus ring to `--_focus-ring`, so a `--shadow` utility on a summary keeps the ring.

### table

- **BREAKING** Identity is `data-ui="table"`; presets are `data-table-variant="alternating|grid"`, `data-table-size="sm"`, `data-table-layout="fixed"`, `data-table-state="selected"` on a row (was `data-state`), and `data-table-caption="top"` on the caption (was `data-side`). Hooks: `--ui-table-foreground→text`, `-background→bg`, `-cell-padding-block/inline→cell-py/cell-px`, `-head-block-size→head-h`, `-head-foreground→head-text`, `-foot-background→foot-bg`, `-row-background--hover/--selected→row-bg--hover/--selected`, `-alternating-background→alternating-bg`, `-caption-foreground→caption-text`, `-caption-padding-block/inline→caption-py/caption-px`; `-font-size`, `-font-family`, `-border`, `-head-border`, `-row-border`, `-column-border`, `-head-font-weight`, `-foot-font-weight` unchanged. Part hooks are read on cells, so the presets set the inheriting hooks (a preset on an outer table reaches a nested table, as in 0.4). Row hover sits behind `@media (hover: hover)`.

### progress

- **BREAKING** Identity is `data-ui="progress"`. Hooks: `--ui-progress-inline-size→w`, `-block-size→h` (both dual-mode), `-radius→rounded`, `-track-background→bg` (the element box is the track), `-bar-background→bar-bg`; `-track-border` and `-indeterminate-duration` unchanged. The meter reads the new names.

### meter

- **BREAKING** Identity is `data-ui="meter"`. Hooks: `--ui-meter-inline-size→w`, `-block-size→h` (dual-mode), `-radius→rounded`, `-track-background→bg`, `-bar-background(--suboptimum/--even-less-good)→bar-bg(…)`; `-track-border` unchanged.

### popover

- New example fragment `popover.html`: a button-anchored `[popover]` placed with `data-popover-side` / `data-popover-align`.
- **BREAKING** The placement presets on a `[popover]` element are `data-popover-side="top|bottom|left|right"` and `data-popover-align="start|center|end"` (were `data-side` / `data-align`); every kit fragment and the multiselect's forwarded panel attributes follow. The native `<select>` takes `data-select-side` / `data-select-align` instead (its rows of the placement matrix live in `select.css`). Addon alignment on input-group and password-group (`data-align="inline-end"`) is a different attribute and is unchanged.
- Fix: tooltip declared its popover overrides (`--ui-popover-position-area: block-start span-all`, shadow, origin, min width) on `:root`, which retinted and repositioned every popover loaded after it; they now sit on the tooltip content. A popover with no `data-popover-side` drops below its anchor again.
- **BREAKING** Hooks: `--ui-popover-radius→rounded`, `-button-radius→button-rounded`, `-padding→p`, `-min-inline-size→min-w`, `-max-inline-size→max-w`, `-margin-block→my`, `-margin-inline→mx` (the last five dual-mode: numbers or lengths only, so tooltip and navigation-menu set `--ui-popover-min-w: 0` where they had `fit-content` / `auto`); `-border-color`, `-shadow`, `-origin`, `-position-area`, `-position-try-fallbacks`, and the `--start`/`--end` motion tokens unchanged. The tokens navigation-menu published into the namespace (`--ui-popover-inline-size`, `-gap`, `-child-radius`, `-viewport-*`) are gone; set the `--ui-navigation-menu-popover-*` hooks instead.

### tooltip

- **BREAKING** The attribute form is `data-ui="tooltip"` (the `<ui-tooltip>` tag form is unchanged); slots are `data-tooltip-slot="trigger | content | arrow"` (were `data-slot="tooltip-*"`), styled only inside the tooltip. The content's placement uses the popover presets (`data-popover-side`, `data-popover-align`). Hooks: `--ui-tooltip-background→bg`, `-foreground→text`, `-radius→rounded`, `-padding-inline/block→px/py`, `-line-height→leading`, `-max-inline-size→max-w`, `-margin-block/inline→my/mx` (`px`, `py`, `max-w`, `my`, `mx`, and the unrenamed `gap` are dual-mode); `-border-color`, `-shadow`, `-gap`, `-font-size`, `-font-family`, `-font-weight`, `-arrow-*`, `-transition-*`, and the `--start`/`--end` motion tokens unchanged. Utilities on the content (`--bg`, `--px`, …) win over the hooks.
- New utility `--flex-wrap` (keyword, flow family; requires a base like every flow utility outside the no-base list).

### dialog

- **BREAKING** Identity is `data-ui="dialog"` on the `<dialog>`; slots are `data-dialog-slot="content | header | body | footer | close"` (were `data-slot="dialog-*"`), styled only inside the dialog; sizes are `data-dialog-size="article | container | screen"` (was `data-size`). Hooks: `--ui-dialog-inline-size→w` (dual-mode), `-block-size→h` (read raw: a length, or a tier carrying a length, applies; a scale number applies only as a base utility), `-background→bg`, `-foreground→text`, `-radius→rounded`; `-border`, `-shadow`, `-backdrop-*`, `-transition-*`, and the `--start`/`--end` motion tokens unchanged. Alert-dialog, command, mobile-menu, and lightbox read the new names. A `--bg` utility on the dialog retints the root only; the header fade and footer read the `--ui-dialog-bg` hook, so retheme the surface through the hook.

### alert-dialog

- **BREAKING** Identity is the token list `data-ui="dialog alert-dialog"` on the `<dialog>` (was `class="ui-dialog ui-alert-dialog"`). Hook: `--ui-alert-dialog-inline-size→w`; `-accent` and `-shadow` unchanged.

### menu

- **BREAKING** The attribute form is `data-ui="menu"` (the `<ui-menu>` tag form is unchanged); the panel slot is `data-menu-slot="popover"` (was `data-slot="menu-popover"`), styled only inside the menu; `menu.ts` looks for the new slot and accepts both forms. Hooks: `--ui-menu-button-radius→button-rounded`, `-min-inline-size→min-w` (dual-mode), `-option-gap→gap` (dual-mode); `-shadow` unchanged. Select reads the new radius name.

### navigation-menu

- **BREAKING** Identity is `data-ui="navigation-menu"`; slots are `data-navigation-menu-slot="list | item | trigger | popover | viewport | link | submenu | submenu-trigger"` (were `data-slot="navigation-menu-*"`), styled only inside the menu; presets on the popover slot are `data-navigation-menu-variant="submenu"`, `data-navigation-menu-size="container | root | screen"`, and `data-navigation-menu-animation="slide-down"` (were `data-variant` / `data-size` / `data-animation`); placement alignment stays `data-popover-align`. Hooks: `--ui-navigation-menu-popover-child-radius→popover-child-rounded`, `-popover-inline-size→popover-w`, `-popover-viewport-align-items→popover-viewport-items`, `-popover-viewport-template-columns→popover-viewport-template-cols`, `-popover-viewport-min-inline-size→popover-viewport-min-w`; the rest unchanged. The stylesheet reads its own hooks directly instead of republishing them as `--ui-popover-child-radius`, `-gap`, `-inline-size`, and `-viewport-*`.
- New utility `--shrink` (`flex-shrink`, raw, flow family).

### mobile-menu

- **BREAKING** Identity is the token list `data-ui="dialog mobile-menu"` on the `<dialog>` (was `class="ui-mobile-menu"` beside `ui-dialog`); slots are `data-mobile-menu-slot="viewport | header | body | footer"`; the animation preset is `data-mobile-menu-animation="slide-right"` (was `data-animation`). Hooks: `--ui-mobile-menu-background→bg`, `-foreground→text`, `-header-padding-block→header-py` (`-header-padding-inline` keeps its two-value name), `-body-padding-inline/block→body-px/body-py`, `-footer-padding→footer-p`, `-nested-accordion-padding-inline-start→nested-accordion-pl`; `-backdrop-color`, `-footer-gap`, and the `-viewport-*` motion tokens unchanged.

### input

- **BREAKING** Identity is `data-ui="input"`. Hooks: `--ui-input-inline-size→w`, `-min-inline-size→min-w`, `-padding-inline-start/end→pl/pr` (all dual-mode), `-line-height→leading`, `-radius→rounded`; `-font-size`, `-border-*`, and `-calendar-picker-*` unchanged. Height and surface colors still come from the `--ui-field-*` family. The focus ring is published to `--_focus-ring` and survives a `--shadow` utility; hover sits behind `@media (hover: hover)`. Input-group and password-group select the new identity.

### textarea

- **BREAKING** Identity is `data-ui="textarea"`. Hooks: `--ui-textarea-inline-size→w`, `-min-inline-size→min-w`, `-padding→p` (dual-mode), `-min-block-size→min-h`, `-max-block-size→max-h` (read raw: their defaults are `lh` lengths, so lengths and tiers apply and a scale number applies only as a base utility), `-line-height→leading`, `-radius→rounded`; `-font-size`, `-border-*`, and `-resize` unchanged. The focus ring is published to `--_focus-ring`; hover sits behind `@media (hover: hover)`.

### select

- **BREAKING** Identity is `data-ui="select"` on the `<select>`; picker placement presets are `data-select-side` / `data-select-align` (were `data-side` / `data-align`). The multiselect's attribute form is `data-ui="multiselect"` (the `<ui-multiselect>` tag form is unchanged); its config attributes are `data-multiselect-placeholder`, `data-multiselect-label-more`, `data-multiselect-side`, and `data-multiselect-align` (were unprefixed; the unprefixed names are no longer read); its stamped parts carry `data-multiselect-slot="trigger | label | icon | panel | option"`, the trigger carries `data-ui="select"`, and the enhanced native select is marked `data-multiselect-state="enhanced"` (was `data-multiselect-enhanced`). Hooks: `--ui-select-inline-size→w`, `-min-inline-size→min-w`, `-padding-inline-start/end→pl/pr` (dual-mode), `-line-height→leading`, `-radius→rounded` (`-font-size` unchanged); options: `--ui-option-line-height→leading`, `-padding→px`, `-block-size→min-h`, `-radius→rounded`, `-background→bg`, `-foreground→text` (`-font-size` unchanged); autocomplete and combobox read the new option names. The focus ring is published to `--_focus-ring`; hover sits behind `@media (hover: hover)`.
- Fix: the focus-ring rule is `:is(:focus-visible, :open)`, a forgiving list, so an engine without `:open` keeps the ring (0.4's selector list dropped the whole rule there).

### autocomplete

- **BREAKING** The attribute form is `data-ui="autocomplete"` (the `<ui-autocomplete>` tag form is unchanged); parts are `data-autocomplete-slot="panel | list | item | group | group-label | empty"` (were `data-slot="autocomplete-*"`), styled only inside the autocomplete; item facts are `data-autocomplete-value` / `data-autocomplete-keywords` and root config is `data-autocomplete-sort` / `data-autocomplete-min-length`; only the prefixed names are read (`data-value`, `data-keywords`, `data-sort`, `data-filter`, `data-min-length`, and `data-slot="autocomplete-*"` are not); the keyboard highlight is `data-autocomplete-state="highlighted"` (the legacy `data-highlighted` flag is no longer written). Hook: `--ui-autocomplete-panel-max-block-size→panel-max-h` (read raw); `-shadow` unchanged.
- Fix: the highlighted row in autocomplete, combobox, and command panels showed no highlight since the button started reading variant privates ahead of hooks; the highlight now writes the button's privates.

### combobox

- **BREAKING** The attribute form is `data-ui="combobox"` (the `<ui-combobox>` tag form is unchanged); parts are `data-combobox-slot="value | control | trigger | panel | list | item | group | group-label | empty | tag | tag-label | tag-remove | tag-template"` (were `data-slot="combobox-*"`); the variant is `data-combobox-variant="multiselect"`, item and tag facts are `data-combobox-value` / `data-combobox-keywords`, and root config is `data-combobox-label-remove` / `-sort` / `-min-length`; only the prefixed names are read (`data-value`, also as an item's form value, `data-keywords`, `data-variant`, `data-label-remove`, `data-sort`, `data-filter`, `data-min-length`, and `data-slot="combobox-*"` are not); the keyboard highlight is `data-combobox-state="highlighted"`; stamped hidden inputs are marked `data-combobox-state="stamped"` (was `data-combobox-stamped`). The control reads the resolver chain and publishes its focus ring to `--_focus-ring`, so a `--shadow` utility keeps the ring. Hooks: `--ui-combobox-inline-size→w`, `-min-inline-size→min-w`, `-padding-inline-start/end→pl/pr`, `-radius→rounded`, `-panel-max-block-size→panel-max-h`, `-control-align-items→control-items`, `-control-block-size→control-h`, `-control-min-block-size→control-min-h`, `-control-padding-block→control-py`, `-input-min-inline-size→input-min-w`, `-input-min-block-size→input-min-h`, `-tag-padding-block→tag-py`, `-tag-max-inline-size→tag-max-w`, `-tag-remove-radius→tag-remove-rounded`; the rest unchanged.
- Fix: the combobox read the select's `--ui-select-padding-inline-*` and `-radius` hooks under their 0.4 names after the select rename, so its control had lost its padding and radius.

### command

- **BREAKING** The attribute form is `data-ui="command"` (the `<ui-command>` tag form is unchanged); parts are `data-command-slot="panel | header | input | list | item | group | group-label | footer | empty"` (were `data-slot="command-*"`); item facts are `data-command-value` / `data-command-keywords` / `data-command-hotkey` and root config is `data-command-sort` / `data-command-min-length`; the keyboard highlight is `data-command-state="highlighted"`, the item's stay-open flag is `data-command-stay-open` (was `data-stay-open`); only the prefixed names are read (`data-value`, `data-keywords`, `data-hotkey`, `data-stay-open`, `data-sort`, `data-filter`, `data-min-length`, and `data-slot="command-*"` are not), and the typeahead family no longer writes the legacy `data-highlighted` flag. Hooks: `--ui-command-min-inline-size→min-w` (dual-mode), `-max-block-size→max-h`, `-input-padding→input-p`, `-footer-padding→footer-p`; the rest unchanged.
- New root option `data-command-filter="none"` for a list another source already filtered (a search index, a server): every item stays visible in document order while keyboard navigation, highlight, and ARIA still run. Fix: Enter on a highlighted item dispatched `zazz:command-select` twice (the synthetic click re-entered the commit); it fires once.

### checkbox

- **BREAKING** Hooks: `--ui-checkbox-background(--checked)→bg(--checked)`, `-radius→rounded`, `-checkmark-size` / `-indeterminate-size→glyph-size`; `-size` (dual-mode, backs `--size`) and `-border-*` unchanged. The glyph is a masked `::before` painted in the new `--ui-checkbox-foreground`, so `-checkmark-mask` / `-indeterminate-mask` take a `mask` value (were `background-image` URLs). The native control needs no identity; the focus ring is published to `--_focus-ring` and hover sits behind `@media (hover: hover)`.
- Fix: select-all groups mark table rows with `data-table-state="selected"` (was `data-state`), which the migrated table reads; the row highlight had been lost since the table cycle.

### slider

- **BREAKING** Hooks: `--ui-slider-track-block-size→track-h`, `-track-background→track-bg`, `-track-radius→track-rounded`, `-thumb-background→thumb-bg`, `-thumb-radius→thumb-rounded`; the rest unchanged. The hooks now live on `:root` in the variables layer (0.4 declared them on the element, which silently shadowed any `:root` or subtree override); hover sits behind `@media (hover: hover)`.

### switch

- **BREAKING** Hooks: `--ui-switch-track-inline-size→track-w`, `-track-block-size→track-h` (both dual-mode), `-track-background(--hover/--checked/--checked-hover)→track-bg(…)`, `-thumb-background→thumb-bg` (new `-thumb-bg--hover`), `-radius→rounded`; `-track-padding`, `-thumb-size`, `-thumb-shadow`, `-thumb-translate`, `-thumb-scale` unchanged. The native control needs no identity; the focus ring is published to `--_focus-ring` and hover sits behind `@media (hover: hover)`.

### input-group

- **BREAKING** Identity is `data-ui="input-group"` on the `<label>` shell; slots are `data-input-group-slot="addon | text"` (were `data-slot="input-group-*"`); addon alignment is `data-input-group-align="inline-start | inline-end | block-start | block-end"` (was `data-align`). Hooks: `--ui-input-group-align-items→items`, `-inline-size→w`, `-min-block-size→min-h`, `-padding→p` (the last three dual-mode, as is `-gap`), `-foreground→text`, `-textarea-min-block-size→textarea-min-h`, `-textarea-padding-inline/block→textarea-px/textarea-py`; `-font-size`, `-display`, `-flex-wrap`, `-cursor`, `-font-weight`, `-shadow` unchanged. The focus ring is published to `--_focus-ring`; hover sits behind `@media (hover: hover)`.

### password-group

- **BREAKING** Identity is `data-ui="password-group"` on the `<label>` shell (the `<ui-password>` tag form is unchanged); slots are `data-password-group-slot="addon | text | toggle | icon-show | icon-hide"`; addon alignment is `data-password-group-align`; the toggle labels are `data-password-group-label-show` / `-label-hide` on `<ui-password>` (`data-label-show` / `data-label-hide` are no longer read). Hooks follow the input group's rename (`align-items→items`, `inline-size→w`, `min-block-size→min-h`, `padding→p`, `foreground→text`, `textarea-*` sizes; `-font-size` unchanged). The focus ring is published to `--_focus-ring`; hover sits behind `@media (hover: hover)`.

### otp

- **BREAKING** The attribute form is `data-ui="otp"` (the `<ui-otp>` tag form is unchanged); the code field carries `data-otp-slot="input"` beside `data-ui="input"` (was `class="ui-otp-input"`); stamped parts are `data-otp-slot="rail | cell | separator"` (were `data-slot="otp-*"`, the cell was `otp-slot`), and cell state is the token list `data-otp-state="filled active"` (were `data-filled` / `data-active`). Hooks: `--ui-otp-slot-*` → `--ui-otp-cell-*` with `inline-size→w`, `block-size→h`, `background→bg`, `radius→rounded` (`-font-size` and `-border-*` keep their suffix); `--ui-otp-separator-color→separator-text`; `-gap` and `-caret-color` unchanged.

### radio

- **BREAKING** Identity is `data-ui="radio"` on the input. Hooks: `--ui-radio-background(--checked)→bg(--checked)`, `-radius→rounded`, `-background-size→dot-size`, `-dot-gradient` / `-dot-inner-stop` / `-dot-outer-stop→dot-mask` (the dot is a masked `::before` painted in `-dot-foreground`); `-size` (dual-mode, backs `--size`), `-border-*`, and `-dot-foreground` unchanged. The focus ring is published to `--_focus-ring`; hover sits behind `@media (hover: hover)`.

### tabs

- **BREAKING** The attribute form is `data-ui="tabs"` (the `<ui-tabs>` tag form is unchanged); parts are `data-tabs-slot="list | indicator | label | label-text | panel"` (were `data-slot="tabs-*"`); the vertical preset is `data-tabs-orientation="vertical"` (was `data-orientation`, no longer read). Hooks: `--ui-tabs-track-radius→track-rounded`, `-track-background→track-bg`, `-indicator-background→indicator-bg`, `-indicator-radius→indicator-rounded`, `-label-line-height→label-leading`, `-label-background(--hover/--active)→label-bg(…)`, `-label-foreground(--hover/--active)→label-text(…)`, `-label-padding→label-px`, `-label-min-block-size→label-min-h`; `-label-font-size` and the rest unchanged. Label hover sits behind `@media (hover: hover)`.

### carousel

- **BREAKING** The attribute form is `data-ui="carousel"` (the `<ui-carousel>` tag form is unchanged); parts are `data-carousel-slot="viewport | container | slide | prev | next | dots | dot | thumbs"` (were `data-slot="carousel-*"`; an element that serves two primitives now carries both attributes, e.g. `data-slot="lightbox-slide" data-carousel-slot="slide"`). JS state is `data-carousel-state`: `active` on the current dot or thumb (was the `is-active` class) and `dragging` on the viewport while a pointer drags it (the kit no longer reads the Embla ClassNames plugin's `is-dragging` class; the plugin remains available for your own CSS). Hook: `--ui-carousel-slide-min-inline-size→slide-min-w`; `-slide-basis`, `-touch-action`, `-cursor--grabbing` unchanged; new `--ui-carousel-gap` (see base). The container takes a dual-mode `--gap` utility. Fix: the script discovered class-form roots after the identity moved; it now discovers `[data-ui~="carousel"]`.

### lightbox

- **BREAKING** The attribute form is `data-ui="lightbox"` (the `<ui-lightbox>` tag form is unchanged); parts are `data-lightbox-slot="gallery | stage | slide | content | thumbs | thumb | thumb-content | thumbs-prev | thumbs-next | dialog | prev | next | close | counter"` (were `data-slot="lightbox-*"`), carried beside `data-carousel-slot` where an element serves both primitives. The active thumb and the in-view, snapped dialog slide key on `data-carousel-state` tokens that the carousel script now writes itself (`active`, `in-view`, `snapped`), so the Embla ClassNames plugin is no longer required and the fragments drop `data-carousel-plugins="class-names"`. Hooks: `--ui-lightbox-aspect-ratio→aspect`, `-slide-radius→slide-rounded`, `-thumb-radius→thumb-rounded`; the rest unchanged. Hover effects sit behind `@media (hover: hover)`.

### toaster

- **BREAKING** The attribute form is `data-ui="toaster"` (the `<ui-toaster>` tag form is unchanged); the position preset is `data-toaster-position` (was `data-position`); stamped parts carry `data-toaster-slot="list | toast | icon | content | title | description | action | close"` (were `data-slot="toaster-*"`); a toast's variant is `data-toaster-variant` and its id `data-toaster-id`; JS state is the token list `data-toaster-state`: `expanded` on the region (was `data-expanded="true"`) and `front`, `visible`, `removed` on a toast (were `data-front` / `data-visible` / `data-removed` booleans; a hidden toast now simply lacks `visible`). Hooks: `--ui-toaster-background→bg`, `-foreground→text`, `-radius→rounded`, `-inline-size→w`, `-padding→p`, `-description-foreground→description-text`; `-title-font-size`, `-description-font-size`, and the rest unchanged.
- **BREAKING** The declarative trigger's attributes are prefixed: `data-title`, `data-description`, `data-variant`, `data-duration`, `data-close-button` → `data-toaster-title`, `data-toaster-description`, `data-toaster-variant`, `data-toaster-duration`, `data-toaster-close-button`; the unprefixed names are no longer read. Migration: add the `toaster-` prefix on buttons with `command="--toast*"`.

### reveal

- New example fragment `reveal.html`: a staggered `data-reveal-each` group.
- **BREAKING** A revealed target is marked `data-reveal-state="in-view"` by the script (was the `in-viewport` class); the identity stays `data-reveal` / `data-reveal-each` and the `data-reveal-*` config attributes are unchanged. Migration: if your CSS keyed on `.in-viewport`, switch to `[data-reveal-state~="in-view"]`.
- **BREAKING** `--ui-reveal-global-ease` is `--ui-reveal-global-timing-function` (the script writes and reads the new name; a per-element `--ui-reveal-ease` is unchanged). Migration: rename the hook where you set it.

### card

- New `card.css`: `data-ui="card"` is a grid surface with `--ui-card-bg`, `-text`, `-rounded`, `-shadow`, `-border-width`, `-border-style`, `-border-color`, and dual-mode `-gap` and `-p` hooks. The default card is bare (no padding, radius, or shadow) so media can run edge to edge. Every card has a 1px border, transparent unless a variant colors it, so cards line up whatever their variant. `data-card-variant="outline"` colors the border `--color-border`, `"muted"` sets a `--color-muted` background, and `"floating"` colors the border and adds a `--shadow-sm`; each variant also adds `--space-md` padding and the `--radius-lg` radius. A variant never cascades into a nested card; an inline hook does (SPEC claim 26). The card fragments compose the surface with utilities instead of utility classes.

### callout

- New `callout.css`: `data-ui="callout"` is a padded grid with a 1px border, for asides and alerts. Hooks: `--ui-callout-bg`, `-text`, `-rounded`, `-shadow`, `-border-width`, `-border-style`, `-border-color`, and dual-mode `-gap` and `-p`. The default is a card surface with a `--color-border` border. `data-callout-variant="muted"` is a muted card surface (its border goes transparent, so every variant is the same size). `"info"`, `"success"`, and `"warning"` take the matching badge's tint and border, with the role mixed toward `--color-foreground` for text; `"destructive"` is the destructive badge's solid fill.

### avatar

- This markup-only primitive's fragments carry utilities and `data-ui` tokens instead of utility classes; nothing changes in the kit's CSS.

### breadcrumbs

- This markup-only primitive's fragments carry utilities and `data-ui` tokens instead of utility classes; nothing changes in the kit's CSS.

### menubar

- This markup-only primitive's fragments carry utilities and `data-ui` tokens instead of utility classes; nothing changes in the kit's CSS.

### toolbar

- This markup-only primitive's fragments carry utilities and `data-ui` tokens instead of utility classes; nothing changes in the kit's CSS.

### debug

- `<ui-debug>`'s `attribute-outside-identity` check (and the lint rule sharing it) accepts the attributes of the identity a custom command names on its invoker: `<button commandfor="t" command="--toast" data-toaster-title="Saved">` passes because `--toast` names the toaster, whose script reads them off the button. Another identity's attributes on the same button are still flagged.

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
