# Zazz modern APIs & JS behaviors

Zazz is built on modern web platform features, with polyfills already wired in the page head.
**Preserve the polyfills**, prefer the native hook, and author behavior in **HTML** — the JS
discovers and enhances markup; you rarely touch it.

> For how any of these APIs actually work, and for browser-support / fallback decisions, use
> the **`modern-web-guidance`** skill (search → retrieve). Don't reimplement an API by hand.

## 1. Platform APIs and their markup hooks

| API                                        | Used by                                     | Markup hook                                                                                                                                                     | Polyfill                                |
| ------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Popover API                                | tooltip, dropdown, navigation-menu, toaster | `popover="auto"` / `popover="hint"` / `popover="manual"` (toaster region — no light dismiss), `popovertarget="<id>"`, `:popover-open`                           | `@oddbird/popover-polyfill`             |
| Invoker Commands                           | dialog, lightbox, toaster                   | `command="show-modal"` / `command="close"` / custom `command="--toast[-variant]"`, `commandfor="<id>"`                                                          | `invokers/compatible`                   |
| Interest Invokers                          | tooltip                                     | `interestfor="<id>"` (hover/focus/long-press → hint, wires ARIA)                                                                                                | `invokers/compatible`                   |
| CSS Anchor Positioning                     | popover/tooltip placement                   | `data-side`, `data-align` (drive `anchor-name` / `position-area`)                                                                                               | `@supports`-gated; UA-centered fallback |
| Native `<dialog>`                          | dialog, lightbox, mobile-menu               | `<dialog>`, `::backdrop`, `closedby="any"`                                                                                                                      | (via Invoker Commands polyfill)         |
| Native `<details>`                         | accordion                                   | `<details>`/`<summary>`, `::details-content`, `interpolate-size: allow-keywords`                                                                                | —                                       |
| View Transitions                           | cross-page nav                              | `@view-transition { navigation: auto }`, `data-transition-layer="global-header"` / `="global-footer"` (`<main>` is automatic), `document.startViewTransition()` | —                                       |
| Navigation API                             | SPA-style nav                               | `navigation.js` (app-level; **not** loaded in preview iframes)                                                                                                  | falls back to full page load            |
| `light-dark()` + container `style()` query | theming, dark mode, inverted menus          | `.dark` class, `--use-inverted-popovers: true` on `[popover]` (opt out per-popover with `data-use-inverted-menu="false"`)                                       | —                                       |
| IntersectionObserver                       | scroll reveals                              | `[data-reveal]` / `[data-reveal-each]` (via `reveal.js`)                                                                                                        | —                                       |
| `sibling-index()` / `sibling-count()`      | reveal stagger delays                       | `[data-reveal-each]` children compute `--ui-reveal-wait` natively                                                                                               | `@supports`-gated; JS fallback          |
| `:user-invalid` / `:has()`                 | form validation                             | surfaces error state after commit, not while typing                                                                                                             | —                                       |

## 2. Zazz JS behaviors (data-attribute driven)

Configure entirely in markup. Don't edit the `@zazzdesign/ui` package source (`packages/ui/src/`)
unless the task is explicitly about framework internals. Every behavior ships in one ES module —
`packages/ui/src/index.js` — loaded with a single
`<script type="module" src="…/index.js">`; its `import` graph orders the rest.
The only external ordering: Embla-backed components need the Embla CDN UMD bundles loaded (as
`defer` scripts) **before** the module, since `embla.js` reads them as globals.

### Light-DOM web components

These custom elements augment regular child markup; they do not use shadow DOM or templates,
so existing Zazz classes and `data-*` hooks keep working.

| Element         | Script              | Use for                                     | Notes                                                                                                                          |
| --------------- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `<ui-carousel>` | `carousel.js`       | Component carousels and carousel roots      | The element is the Embla root; put `data-carousel-*` options on it                                                             |
| `<ui-lightbox>` | `lightbox.js`       | Inline gallery + fullscreen dialog lightbox | Coordinates gallery/dialog slide state; opening/closing still uses Invoker Commands                                            |
| `<ui-password>` | `password-group.js` | Password show/hide toggle                   | Wrap `.ui-password-group`; optional `data-label-show` / `data-label-hide`; CSS swaps icons via ARIA                            |
| `<ui-tabs>`     | `tabs.js`           | Radio-driven tabs with richer keyboard nav  | Carries `.ui-tabs`; adds orientation-aware arrows, Home/End, and wrap-around                                                   |
| `<ui-toaster>`  | `toaster.js`        | Stacked toast notifications (top layer)     | Carries `.ui-toaster` + `popover="manual"`; fire via `command="--toast"` on any button or `window.Toaster.toast()/success()/…` |

Component preview iframes use `packages/ui/src/manifest.ts` to load scripts and expose a JS
tab for these files. Custom elements are `display: inline` by default, so their component
styles define the needed block/flex display.

### Reveal — `reveal.js` (`window.Reveal`)

Put `data-reveal` on a single element, or `data-reveal-each` on a parent to stagger its
**direct children**. The animation plays once when the element enters the viewport (adds
`.in-viewport`).

| Attribute                          | Values / unit                                                             | Notes                                                        |
| ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `data-reveal` / `data-reveal-each` | `slide-up` `slide-down` `slide-left` `slide-right` `fade` `grow` `shrink` | single vs. stagger-group                                     |
| `data-reveal-duration`             | ms                                                                        | default: `--default-transition-duration` (JS fallback 400ms) |
| `data-reveal-wait`                 | ms                                                                        | base delay before start (default 0)                          |
| `data-reveal-step`                 | ms                                                                        | stagger between children (group only; default 80)            |
| `data-reveal-ease`                 | CSS timing function                                                       | default: `--default-transition-timing-function`              |
| `data-reveal-distance`             | CSS length                                                                | slide travel (default `1rem`)                                |
| `data-reveal-scale`                | number                                                                    | grow/shrink factor (defaults grow 0.97, shrink 1.03)         |
| `data-reveal-order`                | `reversed`                                                                | reverse stagger order (group only)                           |
| `data-reveal-margin`               | rootMargin                                                                | IntersectionObserver margin (default `0px`)                  |
| `data-reveal-threshold`            | 0–1                                                                       | visibility to trigger (default 0.2)                          |

**Reveal owns `transition-*` on the element it's set on.** It drives the animation through
`transition-duration`, `-delay` (the stagger), `-property`, and `-timing-function`, so don't
put a `transition` / `transition-all` utility on the same element — they'd compete for those
properties and break the stagger. When an element also needs its own transition (a `hover:`
state, for example), wrap it: put the reveal on an outer `div` and keep `transition` on the
inner element.

```html
<!-- ✅ outer div reveals; inner card keeps its own hover transition -->
<div data-reveal-each="slide-up">
  <a class="card transition hover:border-primary">…</a>
  <a class="card transition hover:border-primary">…</a>
</div>

<!-- ❌ same element does both — `transition` wipes out reveal's stagger delay -->
<a class="card transition hover:border-primary" data-reveal="slide-up">…</a>
```

### Embla carousel — `embla.js` (`window.EmblaInit`) — requires the Embla CDN UMD bundles

For component markup, use `<ui-carousel>` as the root and put config on that element.
Lower-level/legacy markup may still use `data-carousel="root"`. In both cases, mark up child
roles with `data-carousel="<role>"`.

**Roles:** `root` (config holder) · `viewport` (required) · `container` · `slide` · `prev` ·
`next` · `dots` · `dot` (template, cloned per snap) · `thumbs` (linked thumb carousel).

**Config on `<ui-carousel>` or `data-carousel="root"`** (kebab-case → Embla options via
`Utils.parseDataAttributes`):

| Attribute                                                 | Example                                                    | Purpose                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| any core Embla option                                     | `data-carousel-loop="true"`, `data-carousel-align="start"` | passed straight to Embla                                                  |
| `data-carousel-keyboard`                                  | `"false"`                                                  | disable ArrowLeft/Right navigation                                        |
| `data-carousel-autoplay` / `data-carousel-autoplay-*`     | `data-carousel-autoplay-delay="3000"`                      | Autoplay plugin                                                           |
| `data-carousel-autoscroll` / `data-carousel-autoscroll-*` | `data-carousel-autoscroll-speed="2"`                       | AutoScroll plugin                                                         |
| `data-carousel-classnames` / `data-carousel-classnames-*` | `data-carousel-classnames-snapped="is-snapped"`            | ClassNames plugin                                                         |
| `data-carousel-thumbs-*` (on `thumbs`)                    | `data-carousel-thumbs-contain-scroll="keepSnaps"`          | thumb carousel options (defaults: containScroll keepSnaps, dragFree true) |
| `data-carousel-start` (on a trigger w/ `commandfor`)      | `data-carousel-start="2"`                                  | open a dialog carousel at slide N                                         |

Script-managed (don't set by hand): `data-carousel="root"` on `<ui-carousel>`,
`data-carousel-init`, `data-carousel-start-index`. The script adds `.is-active` to the current
dot/thumb and stores `_emblaApi` on the root. `<ui-carousel>` initializes on connect,
defers while inside a closed `<dialog>`, and destroys its Embla instances on disconnect.

### Helpers and app glue

- **`utils.js` (`window.Utils`)** — `parseValue` and `parseDataAttributes(node, "data-carousel-")`
  convert kebab-case `data-*` to a typed options object. This is why markup configures Embla
  with zero JS.
- **`navigation.js`** — intercepts same-origin navigations, swaps `<main>`, runs a View
  Transition, and refreshes Reveal/Embla. App-level only; the component preview iframes
  deliberately omit it. Custom elements initialize themselves when connected, so SPA swaps
  do not need a separate init call for them.

## 3. Polyfills in the page head (keep these)

`@oddbird/popover-polyfill` (Popover API) · `invokers/compatible` (Invoker + Interest
Invokers, i.e. `command`/`commandfor`/`interestfor`) · the Embla Carousel CDN UMD bundles
(core + autoplay, auto-scroll, class-names, ssr plugins). See `packages/ui/examples/index.html` for
the exact tags and SRI hashes.
