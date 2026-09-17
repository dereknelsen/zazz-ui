# Regression: computed styles, 0.4.1 vs 0.5.0 (ticket 34)

Date: 2026-09-17. Old = `aff8707` (origin/main, `@zazz-ui/core` 0.4.1 source) checked out with `git worktree add /tmp/zazz-0.4.1 aff8707`; new = `feat/style-props-0.5` at `548c00a` (ticket 28's merge). Both trees compiled in place (`tsc -p tsconfig.json`, so `../src/index.js` resolves) and served statically from `packages/core` on two ports by a Node `http` server (each page's own `../src/index.css` link, never `dist/`). Driven over CDP in headless Chrome 153.0.8010.47 (the `measure.mjs` approach from ticket 01: `Emulation.setDeviceMetricsOverride` at 600/900/1300 × 900, load event + 1.5 s settle, one `getComputedStyle` pass per page). Probe script: `.scratch/style-props/probe-computed.mjs` (`node probe-computed.mjs <old core dir> <new core dir> > out.json`; the tables below were rendered from that JSON).

Selectors are structural (`nth-of-type`, `.grid`, `.flex`, `:last-of-type`), never the shifted `data-container` values or breakpoint prefixes, so each row is the same element in both trees. Values are `getComputedStyle().getPropertyValue()` strings; `—` means the selector matched nothing in that version.

## Verdict

**No regression.** Every resolved layout value is identical in the two versions at all three widths: `inline-size`, `grid-template-columns` (track sizes and subgrid), `column-gap` / `row-gap`, `padding-*`, `display`, `flex-direction`, `flex-basis`, `justify-content`, `text-align`, `grid-column` spans, body width and `scrollWidth` (no horizontal scroll either side). Console: no errors or warnings on any page, width or version. Bold rows in the tables below are the only cells that differ, and both kinds are intentional:

1. **Grid line names shifted one step** (`layout.html` ×6 elements, `products.html` ×2). `grid-column-start` / `grid-column-end` on a band child resolves to the *named line* it sits on, and ticket 05 renamed the band lines with the breakpoint vocabulary (`container-xs-*` → `container-sm-*`, `container-md-*` → `container-lg-*`, `container-xl-*` → `container-2xl-*`; the `--container-*` token rules in `migrations/0.5.0.json`). The element is the same, the line it sits on is the same line under its new name, and its `inline-size` row directly above is identical (e.g. the 40rem band child: 555.703 / 640 / 640 px in both). At 1300px the `@max-lg:container` children read `auto` on both sides because the variant is a plain 2-column grid above its breakpoint, as before. These are the same difference ticket 27's codemod made in the markup, seen from the resolved style.

2. **The "Style props" block on `responsive.html`** (ticket 28, the one intentional new demo): `style="--grid-cols: 4; --grid-cols-md: 8; --grid-cols-lg: 16; --gap: 1; --gap-lg: 3"` has no counterpart in 0.4.1, so its row is `—` on the old side. On the new side it reads `display: grid` from `--grid-cols` alone (no `.grid` class), 4 → 8 → 16 equal tracks at 600 / 900 / 1300 (`--grid-cols-md` fires at 48rem, `--grid-cols-lg` at 64rem, the nearest size container being the 64rem band) and a gap of 1 step (3.69 / 3.83 px) opening to 3 steps (12 px) at lg. The `:last-of-type` alignment row shows the block did not shift the sibling that follows it: identical values on both sides.

Nothing else differs. In particular the breakpoint shift itself is invisible at the resolved level, as intended: `@md:` → `@lg:` classes fire at the same 64rem the old `@md:` did (the grid-columns demo goes 1 → 3 → 6 tracks; the flex row, display toggles, `col-span-8`, `basis-1/3` and `justify-between` all switch at the same widths), the bands cap at the same rem, and the fluid step values (`--spacing-interval`) agree to the fourth decimal.

Not covered here: `index.html`, `about.html`, `components.html`, `forms.html` (ticket 28 said layout/products are the two byte-identical-to-ticket-27 pages and responsive carries the only demo; the other pages were changed only by the same codemod), Firefox and Safari (ticket 17 / 28 verified in Chrome; the CSS relies on `@container style()` which the browser-support policy already gates).

## Tables


### layout.html

| Selector (label) | Property | 600 old | 600 new | 900 old | 900 new | 1300 old | 1300 new |
| --- | --- | --- | --- | --- | --- | --- | --- |
| intro .container | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| intro .container | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| intro .container | `grid-template-columns` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` |
| intro .container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| intro .container | `column-gap` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| band child 1 (bleed) | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| band child 1 (bleed) | `grid-column-start` | `container-bleed-start` | `container-bleed-start` | `container-bleed-start` | `container-bleed-start` | `container-bleed-start` | `container-bleed-start` |
| band child 1 (bleed) | `grid-column-end` | `container-bleed-end` | `container-bleed-end` | `container-bleed-end` | `container-bleed-end` | `container-bleed-end` | `container-bleed-end` |
| band child 3 (96rem band) | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1252px` | `1252px` |
| **band child 3 (96rem band)** | `grid-column-start` | `container-xl-start` | `container-2xl-start` | `container-xl-start` | `container-2xl-start` | `container-xl-start` | `container-2xl-start` |
| **band child 3 (96rem band)** | `grid-column-end` | `container-xl-end` | `container-2xl-end` | `container-xl-end` | `container-2xl-end` | `container-xl-end` | `container-2xl-end` |
| band child 5 (64rem band) | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| **band child 5 (64rem band)** | `grid-column-start` | `container-md-start` | `container-lg-start` | `container-md-start` | `container-lg-start` | `container-md-start` | `container-lg-start` |
| **band child 5 (64rem band)** | `grid-column-end` | `container-md-end` | `container-lg-end` | `container-md-end` | `container-lg-end` | `container-md-end` | `container-lg-end` |
| band child 7 (40rem band) | `inline-size` | `555.703px` | `555.703px` | `640px` | `640px` | `640px` | `640px` |
| **band child 7 (40rem band)** | `grid-column-start` | `container-xs-start` | `container-sm-start` | `container-xs-start` | `container-sm-start` | `container-xs-start` | `container-sm-start` |
| **band child 7 (40rem band)** | `grid-column-end` | `container-xs-end` | `container-sm-end` | `container-xs-end` | `container-sm-end` | `container-xs-end` | `container-sm-end` |
| default-band section child | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| **default-band section child** | `grid-column-start` | `container-md-start` | `container-lg-start` | `container-md-start` | `container-lg-start` | `container-md-start` | `container-lg-start` |
| **default-band section child** | `grid-column-end` | `container-md-end` | `container-lg-end` | `container-md-end` | `container-lg-end` | `container-md-end` | `container-lg-end` |
| @lg:container (was @md:) | `display` | `block` | `block` | `block` | `block` | `grid` | `grid` |
| @lg:container (was @md:) | `grid-template-columns` | `none` | `none` | `none` | `none` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` |
| @lg:container (was @md:) | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| @lg:container child 2 | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `768px` | `768px` |
| **@lg:container child 2** | `grid-column-start` | `container-sm-start` | `container-md-start` | `container-sm-start` | `container-md-start` | `container-sm-start` | `container-md-start` |
| **@lg:container child 2** | `grid-column-end` | `container-sm-end` | `container-md-end` | `container-sm-end` | `container-md-end` | `container-sm-end` | `container-md-end` |
| @max-lg:container (was @max-md:) | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| @max-lg:container (was @max-md:) | `grid-template-columns` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `500px 500px` | `500px 500px` |
| @max-lg:container (was @max-md:) | `column-gap` | `0px` | `0px` | `0px` | `0px` | `24px` | `24px` |
| @max-lg:container (was @max-md:) | `row-gap` | `22.1436px` | `22.1436px` | `22.9626px` | `22.9626px` | `24px` | `24px` |
| @max-lg:container (was @max-md:) | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| @max-lg:container child 1 | `inline-size` | `555.703px` | `555.703px` | `640px` | `640px` | `500px` | `500px` |
| **@max-lg:container child 1** | `grid-column-start` | `container-xs-start` | `container-sm-start` | `container-xs-start` | `container-sm-start` | `auto` | `auto` |
| **@max-lg:container child 1** | `grid-column-end` | `container-xs-end` | `container-sm-end` | `container-xs-end` | `container-sm-end` | `auto` | `auto` |
| article container | `display` | `flex` | `flex` | `flex` | `flex` | `flex` | `flex` |
| article container | `inline-size` | `555.703px` | `555.703px` | `742.547px` | `742.547px` | `742.547px` | `742.547px` |
| article container | `max-inline-size` | `none` | `none` | `none` | `none` | `none` | `none` |
| article container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| __body | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| __body | `scroll-width` | `600` | `600` | `900` | `900` | `1300` | `1300` |

### responsive.html

| Selector (label) | Property | 600 old | 600 new | 900 old | 900 new | 1300 old | 1300 new |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grid columns demo | `grid-template-columns` | `555.703px` | `555.703px` | `274.484px 274.484px 274.5px` | `274.484px 274.484px 274.5px` | `157.328px 157.328px 157.328px 157.344px 157.328px 157.328px` | `157.328px 157.328px 157.328px 157.344px 157.328px 157.328px` |
| grid columns demo | `column-gap` | `14.7624px` | `14.7624px` | `15.3084px` | `15.3084px` | `16px` | `16px` |
| grid columns demo | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| flex direction demo | `flex-direction` | `column` | `column` | `column` | `column` | `row` | `row` |
| flex direction demo | `column-gap` | `14.7624px` | `14.7624px` | `15.3084px` | `15.3084px` | `16px` | `16px` |
| flex direction demo | `row-gap` | `14.7624px` | `14.7624px` | `15.3084px` | `15.3084px` | `16px` | `16px` |
| flex direction demo | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| display toggle: narrow tile | `display` | `block` | `block` | `block` | `block` | `none` | `none` |
| display toggle: wide tile | `display` | `none` | `none` | `none` | `none` | `block` | `block` |
| nav pattern menu | `display` | `none` | `none` | `flex` | `flex` | `flex` | `flex` |
| col-span main | `grid-column-start` | `span 12` | `span 12` | `span 12` | `span 12` | `span 8` | `span 8` |
| col-span main | `grid-column-end` | `auto` | `auto` | `auto` | `auto` | `auto` | `auto` |
| col-span main | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `677.328px` | `677.328px` |
| flex basis item 1 | `flex-basis` | `100%` | `100%` | `calc(50% - 7.6542px)` | `calc(50% - 7.6542px)` | `calc(33.3333% - 10.6667px)` | `calc(33.3333% - 10.6667px)` |
| flex basis item 1 | `inline-size` | `555.703px` | `555.703px` | `419.375px` | `419.375px` | `330.656px` | `330.656px` |
| alignment row (last block) | `flex-direction` | `column` | `column` | `row` | `row` | `row` | `row` |
| alignment row (last block) | `justify-content` | `center` | `center` | `center` | `center` | `space-between` | `space-between` |
| alignment row (last block) | `column-gap` | `7.3812px` | `7.3812px` | `7.6542px` | `7.6542px` | `8px` | `8px` |
| alignment hgroup | `text-align` | `center` | `center` | `center` | `center` | `start` | `start` |
| alignment hgroup | `padding-inline-start` | `22.1436px` | `22.1436px` | `22.9626px` | `22.9626px` | `24px` | `24px` |
| **style props block (0.5 only)** | `display` | `—` | `grid` | `—` | `grid` | `—` | `grid` |
| **style props block (0.5 only)** | `grid-template-columns` | `—` | `136.156px 136.156px 136.156px 136.172px` | `—` | `103.422px 103.422px 103.422px 103.422px 103.422px 103.422…` | `—` | `52.75px 52.75px 52.75px 52.75px 52.75px 52.75px 52.75px 5…` |
| **style props block (0.5 only)** | `column-gap` | `—` | `3.6906px` | `—` | `3.8271px` | `—` | `12px` |
| **style props block (0.5 only)** | `row-gap` | `—` | `3.6906px` | `—` | `3.8271px` | `—` | `12px` |
| **style props block (0.5 only)** | `inline-size` | `—` | `555.703px` | `—` | `854.062px` | `—` | `1024px` |
| __body | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| __body | `scroll-width` | `600` | `600` | `900` | `900` | `1300` | `1300` |

### products.html

| Selector (label) | Property | 600 old | 600 new | 900 old | 900 new | 1300 old | 1300 new |
| --- | --- | --- | --- | --- | --- | --- | --- |
| breadcrumb .container | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| breadcrumb .container | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| breadcrumb .container | `padding-block-start` | `40.5966px` | `40.5966px` | `42.0981px` | `42.0981px` | `44px` | `44px` |
| breadcrumb .container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| product .container | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| product .container | `grid-template-columns` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` |
| product .container | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| product .container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| product grid (@max-lg:container) | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| product grid (@max-lg:container) | `grid-template-columns` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `subgrid [] [] [] [] [] []` | `490px 490px` | `490px 490px` |
| product grid (@max-lg:container) | `column-gap` | `0px` | `0px` | `0px` | `0px` | `44px` | `44px` |
| product grid (@max-lg:container) | `row-gap` | `40.5966px` | `40.5966px` | `42.0981px` | `42.0981px` | `44px` | `44px` |
| product grid (@max-lg:container) | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `1024px` | `1024px` |
| ui-lightbox cell | `display` | `flex` | `flex` | `flex` | `flex` | `flex` | `flex` |
| ui-lightbox cell | `inline-size` | `555.703px` | `555.703px` | `640px` | `640px` | `490px` | `490px` |
| **ui-lightbox cell** | `grid-column-start` | `container-xs-start` | `container-sm-start` | `container-xs-start` | `container-sm-start` | `auto` | `auto` |
| **ui-lightbox cell** | `grid-column-end` | `container-xs-end` | `container-sm-end` | `container-xs-end` | `container-sm-end` | `auto` | `auto` |
| hgroup cell | `display` | `flex` | `flex` | `flex` | `flex` | `flex` | `flex` |
| hgroup cell | `inline-size` | `555.703px` | `555.703px` | `854.062px` | `854.062px` | `490px` | `490px` |
| **hgroup cell** | `grid-column-start` | `container-md-start` | `container-lg-start` | `container-md-start` | `container-lg-start` | `auto` | `auto` |
| **hgroup cell** | `grid-column-end` | `container-md-end` | `container-lg-end` | `container-md-end` | `container-lg-end` | `auto` | `auto` |
| hgroup cell | `row-gap` | `7.3812px` | `7.3812px` | `7.6542px` | `7.6542px` | `8px` | `8px` |
| header .container | `display` | `grid` | `grid` | `grid` | `grid` | `grid` | `grid` |
| header .container | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| header .container | `grid-template-columns` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` | `subgrid [] [] [] [] [] [] [] [] [] [] [] [] [] []` |
| header .container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| footer .container | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| footer .container | `padding-block-start` | `88.5744px` | `88.5744px` | `91.8504px` | `91.8504px` | `96px` | `96px` |
| footer .container | `padding-inline-start` | `0px` | `0px` | `0px` | `0px` | `0px` | `0px` |
| __body | `inline-size` | `600px` | `600px` | `900px` | `900px` | `1300px` | `1300px` |
| __body | `scroll-width` | `600` | `600` | `900` | `900` | `1300` | `1300` |

