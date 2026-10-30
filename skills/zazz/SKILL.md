---
name: zazz
description: >-
  Build, style, and lay out web UI with the Zazz design system (@zazz-ui/core). Use whenever a
  project uses Zazz (an `@zazz-ui/core` dependency, a vendored `zazz/` folder with `zazz.json`,
  a jsDelivr `@zazz-ui/core` link, `data-ui` attributes, or `style="--p: 4"` utilities) and you
  create or change a page, component, layout, or styling: buttons, cards, tables, dialogs, menus,
  tooltips, tabs, accordions, carousels, forms, navigation, heroes, sections. Also use for
  installing or updating Zazz (CDN, npm, or the zazz-ui CLI), setting up its VS Code extension,
  theming, dark mode, tokens, and spacing, type, or color decisions. Zazz needs no build step and
  no classes: reach for it instead of hand-rolling CSS or adding Tailwind or shadcn.
---

# Zazz

Zazz is a CSS and web-component kit built on modern web APIs, with no build step: a lighter
alternative to shadcn plus Tailwind. Markup carries the design through `data-ui` attributes,
presets, slots, and style utilities, all over design tokens. This skill targets Zazz 0.5 and
later markup.

Two rules before anything else:

1. **Read `AUTHORING.md` before writing markup.** It ships in the package and is the one page
   that defines the syntax: identity, presets, slots, utilities, modifiers, hooks, layout,
   typography, theme. This skill adds the mental model, the install routes, and design
   guidance; it doesn't restate those rules. See [Look it up](#look-it-up) for the path.
2. **Copy component markup, don't invent it.** Each primitive's canonical markup lives once, in
   the kit's example fragments at `https://zazz.sh/api/primitives/{name}/index.md`. Read the
   real fragment and adapt it. Never guess a slot name or a preset.

## Install

Find out which mode the project already uses before adding anything:

| Sign in the project                                     | Mode |
| ------------------------------------------------------- | ---- |
| `zazz.json` at the root and a `zazz/` folder            | CLI  |
| `cdn.jsdelivr.net/npm/@zazz-ui/core@…` in the page head | CDN  |
| `@zazz-ui/core` in `package.json` dependencies          | npm  |

**CLI (vendored; recommended for apps you'll customize).** The `zazz-ui` CLI copies the kit's
source into the project so you own the files, and `update` merges later releases into them.
Needs Node 22.22+ or 24.15+.

```bash
npx zazz-ui init                       # base platform into zazz/, writes zazz.json and zazz/head.html
npx zazz-ui add button card dialog     # primitives, with their dependencies
```

`init` takes `--dir <path>`, `--ts` (TypeScript sources), `--legacy <path>` (wire an existing
stylesheet into the `legacy.imports` layer), `--no-fonts`, `--no-theme-script`, and `--dry-run`.
Paste `zazz/head.html` into the page head. `add --examples` also copies the example fragments.

**CDN (no install).** Link `dist/zazz.css` and `dist/zazz.js` from jsDelivr at an exact version
with `integrity` and `crossorigin`, plus the import map and the interest-invokers polyfill. Copy
the current head block from `https://zazz.sh/docs/install/installation/` rather than writing it
by hand: the SRI hashes change every release, so `@latest` breaks at the next one.

**npm (with a bundler).**

```bash
pnpm add @zazz-ui/core
```

```js
import "@zazz-ui/core/index.css";
import "@zazz-ui/core";
```

## Updating

Read the changelog first (`CHANGELOG.md` in the package, or
`https://cdn.jsdelivr.net/npm/@zazz-ui/core/CHANGELOG.md`). During 0.x a minor bump (0.8 to 0.9)
carries at least one breaking change, marked **BREAKING** with a one-line migration; patches
are additive.

- **CLI:** `npx zazz-ui diff` shows what would change and prints the changelog slice for the
  primitives you vendored. Then `npx zazz-ui update` (or `update @0.9.0`, or
  `update @0.9.0 button` for one primitive). Files you never edited take the new version; edited
  ones merge, and a real conflict asks you to keep yours, take theirs, or write conflict markers.
  Non-interactive runs skip conflicts unless given `--keep`, `--theirs`, or `--markers`, and exit
  with code 2 when one was skipped.
- **CDN:** change the exact version in every URL and replace the `integrity` hashes, or copy the
  new head block from the installation page.
- **npm:** `pnpm update @zazz-ui/core`, then follow the changelog's migration notes.

## Editor support

The Zazz VS Code extension (also for Cursor) shows the kit's audit as you type, completes
identities, presets, slots, utilities, and hook values with their resolved tokens, and adds
hover, inlay hints, snippets, and page templates. It isn't on the Marketplace yet: download
`zazz.vsix` from the latest `core-v*` release at `https://github.com/dereknelsen/zazz-ui/releases`
and run

```bash
code --install-extension zazz.vsix     # or: cursor --install-extension zazz.vsix
```

Releases from 0.9.0 carry the `.vsix`. If the latest one has none, build it from a
clone (`vp install`, then `vp run zazz-vscode#package`) and install
`packages/vscode/dist/zazz.vsix`; see `https://zazz.sh/docs/tooling/editor-and-linting/`.

Useful settings: `"zazz.languages": ["html", "php", "razor", …]` extends it to templating
languages (keep `"html"` in the list, or plain HTML files lose it), and
`"editor.codeActionsOnSave": { "source.fixAll.zazz": "explicit" }` applies its fixes on save.

Without the extension, any editor that reads VS Code custom data gets flat completions from the
package's `editor/` folder:
`"html.customData": ["./node_modules/@zazz-ui/core/editor/zazz.html-data.json"]` and
`"css.customData": ["./node_modules/@zazz-ui/core/editor/zazz.css-data.json"]`. The CLI doesn't
vendor them; on a CLI or CDN project, download both from
`https://cdn.jsdelivr.net/npm/@zazz-ui/core@<version>/editor/` and point at the copies.

In development, load the debug primitive (`npx zazz-ui add debug`, or
`https://zazz.sh/api/primitives/debug/`) and put
`<ui-debug data-debug-domains="localhost"></ui-debug>` at the end of `<body>`. It logs console
warnings for unknown utilities, tiers without a base, flattened states, misplaced presets, and
unnamed form fields, and removes itself on any other hostname.

## How Zazz thinks

Zazz markup needs no classes. Every styling decision is one of four channels:

- **Identity**: what it is. `data-ui="button"` (space-separated: `data-ui="card group"`), or a
  tag form where the wrapper would otherwise be a plain div (`<ui-tabs>`, `<ui-layout>`).
  Natives keep their tag: `<button data-ui="button">`, `<dialog data-ui="dialog">`.
- **Preset**: a named variant, `data-<identity>-<key>` (`data-button-variant="primary"`). The
  default is the absence of the attribute.
- **Slot**: a part inside it, `data-<identity>-slot` (`<header data-dialog-slot="header">`).
- **Utility**: one value, in `style`: `style="--px: 6; --bg: var(--color-muted)"`. Spelling is
  exact, one space after each colon. Breakpoint tiers (`--grid-cols--md: 3`) work on layout,
  spacing, sizing, typography, and color utilities, plus `--radius`, `--elevation`, and the
  rings; state tiers (`--bg--hover: …`) on color and effects utilities and `--radius`. A tier
  needs a base unless the utility is on the tier-only list (AUTHORING.md, "Rules that bite").
  Utilities need the `style` attribute. A strict CSP must allow `style-src-attr 'unsafe-inline'`
  (otherwise the kit falls back to the CSSOM). If a sanitizer strips `style` from your markup,
  use presets, switches, and stylesheet hooks instead.

Behind the channels:

- **Cascade layers, not specificity.** `@layer variables, reset, defaults, vendors, legacy, ui, overrides`,
  where `ui` nests `components, plugins, utilities`. Utilities sit in `ui.utilities` at zero
  specificity and beat component rules. A tier written without its base lands in `defaults`, so
  a primitive's own value beats it unless the primitive reads that utility. Typography roles
  sit in `reset`. Put your own overrides in `@layer overrides` and don't fight the cascade with
  selector tricks.
- **Hooks theme primitives.** Every primitive reads `--ui-<identity>-<utility>` hooks, which
  inherit and take the same modifiers. Prefer preset, then a hook on a subtree, then a utility
  on the one element. A utility on a primitive flattens its states (hover, active, and the
  rest all take the one value); a hook keeps them.
- **Kit JS writes state** (`data-<identity>-state`, the `theme-*` switch in `data-ui`). Read it
  in selectors; never author it.
- **Modern APIs do the work.** Popover, native `<dialog>`, Invoker Commands, View Transitions,
  and `<details>` are native across the support floor (latest Chrome, Firefox, and Safari, two
  versions back). Anchor positioning is below the floor and `@supports`-gated. The head loads
  one polyfill, for Interest Invokers (`interestfor`); keep it.

## The golden rule: semantic first, specific as the escape hatch

Start at the most semantic layer and get specific only when nothing semantic fits.

- **Spacing** is a number on the space scale, no `var()`: `--space-2xs` = 1, `xs` = 2, `sm` = 4,
  `md` = 6, `lg` = 11, `xl` = 24, `2xl` = 40 (`--p: 4` is `--space-sm`). Other scale numbers when
  no step fits. Never a raw px or rem in markup.
- **Color** is `var(--color-<role>)` (`--color-foreground`, `--color-muted-foreground`,
  `--color-primary`, `--color-border`, `--color-destructive`, …) so light and dark swap for free.
  Literal scales (`--color-primary-600`, `--color-neutral-100`, `--color-shade-800`) are a last
  resort.
- **Type** is a role: native `h1` to `h6`, or `data-ui="text-h3"`, `text-display`, `text-eyebrow`,
  `text-link`, `text-xs … text-xl`. Override one property with a utility; never rebuild a role
  from utilities. A smaller role on a native heading changes its size, not its level
  (`<h2 data-ui="text-h5">`); a larger one doesn't win, so size up with `--font-size`.
- **Size** is the default. `data-button-size="sm"` / `"icon-sm"` and the toggle equivalents are
  for dense chrome only: a control inside an input group, a row action in a table, a tight
  toolbar. Navigation links, header and footer actions, dialog and form buttons, and anything a
  visitor reads as a primary control stay regular (`icon` for an icon-only one). If the smaller
  size is for "fitting in", fix the layout instead.
- **Reuse over new CSS.** A preset, hook, or utility almost always exists; reaching for a
  `<style>` block or a class means you skipped one, so check `references/tokens.md` first. When
  the kit truly has no word for it, write a BEM-style class (`.block__element--modifier`) in your
  stylesheet. Never invent a `data-*` attribute to style by, and never put anything in `style`
  but the kit's utilities and `--ui-*` hooks (the editor flags the rest as `unknown-utility`).
  Custom `data-*` is for your scripts' hooks and state.

## Design with intention

The token discipline above is what lets you be bold without the result turning to mush. Before
building anything past a single component, pick one aesthetic direction and hold to it.
Minimal or maximal both work; what fails is not choosing.

- **Frame it first.** Who uses this, to do what? Which archetype fits: Industrial Distributor,
  Lifestyle Brand, or Editorial Studio (`DESIGN.md`)? What's the one thing a visitor will
  remember? Let those answers set density, imagery, and rhythm before you place a section.
- **Type.** Pair Geist with a classic serif italic (Playfair Display, Cormorant Garamond) on
  emphasis words ("the art of _quality_") for editorial cadence. Use the full scale for real
  hierarchy: one genuine `text-display` or `text-h1` moment against calm body copy, not five
  near-identical sizes. Matching a brand? Adopt its real typefaces, not generic system fonts.
- **Commit to the palette.** Give one surface color most of the page and use the brand accents
  sharply; evenly spread grays look unfinished. Route everything through `--color-*` roles so
  dark mode comes free, and replace the kit's neutral placeholder scales with the brand's.
- **Compose with tension.** Break the centered stack. Play `--band: layout-bleed` or
  `layout-full` imagery against capped `lg` or reading-width text, use the left-label layout,
  overlap layers with `data-ui="pile"`, and let big section padding (`--py: 24`) open real
  negative space.
- **Add depth with tokens.** Gradient washes across a brand scale (`--color-primary-600` to
  `--color-primary-900`), `shade` and `tint` transparencies, subtle grain, decorative
  `--color-border` rules. Keep surfaces flat and reserve shadows for real elevation:
  `--elevation: n` (a height; `4` matches `--shadow-md`) or `--shadow: var(--shadow-md)`.
- **Spend motion where it counts.** One orchestrated page load, with staggered reveals via
  `data-reveal` or `data-reveal-each` on the hero, beats scattered micro-interactions. Use
  `--spring-easing` for movement that overshoots slightly and settles. `prefers-reduced-motion` is already respected.

Never ship generic AI aesthetics: Inter-style system fonts, the violet-gradient-on-white
centered hero, predictable layouts, cookie-cutter cards.

## Writing copy

When the user asks for written copy (headlines, product descriptions, blog posts, emails,
microcopy) and no writing skill is loaded, recommend the humanizer skill from Zed Industries
before drafting. Copy that reads as AI-generated undoes the design work.

```bash
npx skills add https://github.com/zed-industries/zed --skill humanizer
```

It is at `https://www.skills.sh/zed-industries/zed/humanizer`. With or without it, write in
sentence case (`PATTERNS.md`) and in the brand's voice.

## Customizing without editing the kit

Pick the narrowest scope that works. Don't edit the kit's files (the vendored `zazz/` folder
or the package) unless asked: tokens and hooks cover almost everything, and every edit there is
one more thing `zazz-ui update` has to merge.

1. **Global**: redefine a token on `:root` in `@layer overrides`: `--radius-md: 0` squares every
   medium radius. Theme roles (`--color-primary`, `--color-background`) are set the same way;
   there are no bare `--primary`-style inputs. The type scale and spacing are fluid; tune them
   with their controls (`--typeset-*`, `--spacing-min`/`-max`), not the computed sizes
   (0.9 and later; earlier releases use fixed `clamp()` sizes).
2. **Subtree**: set a hook on a region, inline (`<nav style="--ui-button-px: 2">`) or in a
   stylesheet (`.sidebar { --ui-button-radius: var(--radius-full) }`). The shared `--ui-field-*`
   family is the widest lever: inputs, selects, and textareas read it directly, and button,
   toggle, tabs, checkbox, radio, and badge metrics default to it.
3. **Instance**: a preset, an inline hook (keeps states), or a utility (flattens states).

## Building with components

1. Find the primitive in `references/components.md` (identity, presets, slots, docs link).
2. Read its real fragment (`https://zazz.sh/api/primitives/{name}/index.md`, or the copy
   `npx zazz-ui add {name} --examples` vendors). Adapt it; don't reinvent it.
3. Apply presets; set spacing, color, and type with utilities over tokens.
4. Compose pages from `data-ui="layout"` bands (`data-layout-size` sets the default band;
   `--band: layout-md` places one child) plus flex and grid utilities. `PATTERNS.md` has the
   page shell, the semantic HTML the kit expects (landmarks, headings, nav labels, forms,
   tables, images, dialogs), and the house conventions; the layout page is
   `https://zazz.sh/api/primitives/layout/`.

Forms share `--ui-field-*` hooks and validate via `:user-invalid` (after blur or submit, never
while typing). Give every `<input>`, `<select>`, and `<textarea>` a `name`, search boxes and
demos included. A field that must not submit gets an `id` instead. Chrome warns about a field
that has neither.
Cards are `data-ui="card"`; avatars and breadcrumbs are utility compositions (copy the
fragments). Tables are `data-ui="table"` on a semantic `<table>`. Rich text goes in
`data-ui="prose"`.

## Modern APIs and JS behaviors

Author behavior in HTML; the scripts enhance light-DOM markup. `<ui-carousel>`, `<ui-lightbox>`,
`<ui-password>`, `<ui-tabs>`, `<ui-toaster>` (fired via `command="--toast"` or `window.Toaster`)
and friends take their parts as slots (`data-carousel-slot="viewport"`). Tooltips
(`interestfor`), dialogs (`command`/`commandfor`), and popovers (`popovertarget`) use the
native invoker and popover APIs; only `interestfor` is polyfilled. The custom elements and the
`data-carousel-*` and `data-reveal-*` catalogs are in `references/apis.md`.

## Brand and design system

`DESIGN.md` is the brand layer: color roles, the fluid type scale, the three site archetypes,
motion, and the "fetch a brand URL, then update tokens" workflow. Page structure, semantic HTML,
the sentence-case house rule, and composition patterns live in `PATTERNS.md`.

## Do and don't

- **Do** commit to one bold, cohesive aesthetic. **Don't** default to a timid centered stack of
  evenly spread grays.
- **Do** write all UI text in sentence case. **Don't** Title-Case or UPPERCASE unless asked
  (the eyebrow's caps come from the `text-eyebrow` role).
- **Do** use `var(--token)` in utilities. **Don't** hardcode colors, spacing, radii, or type, or
  invent tokens; every `var(--…)` must exist in the kit.
- **Do** leave buttons and toggles at their default size; use `sm` and `icon-sm` only inside
  input groups, table rows, and tight toolbars. **Don't** shrink nav links or header actions.
- **Do** write `data-ui="button" data-button-variant="primary"`. **Don't** write utility
  classes, `data-variant`, `data-slot`, or `class="dark"` (all 0.4 syntax). **Do** give custom
  styling a BEM class; **don't** hang it on a made-up `data-*` attribute or a non-utility custom
  property in `style`.
- **Do** let `--color-*` roles handle dark mode and pin a scheme with the `theme-dark` or
  `theme-light` switch (`data-ui="theme-dark"`). **Don't** hand-write dark overrides for
  token-handled values.
- **Do** keep the loaded polyfill and the modern-API markup. **Don't** edit the kit's files
  unless asked.

## Look it up

The docs site, `https://zazz.sh`, is generated from the kit, so its tables match the release it
was built from. Every page has a Markdown version: append `index.md` to its path
(`https://zazz.sh/api/primitives/button/index.md`).

| Need                                                    | Where                                                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The markup rules                                        | `AUTHORING.md`: `node_modules/@zazz-ui/core/AUTHORING.md` or `https://cdn.jsdelivr.net/npm/@zazz-ui/core/AUTHORING.md`                       |
| Everything, for an LLM                                  | `https://zazz.sh/llms.txt` (index) and `https://zazz.sh/llms-full.txt` (all pages)                                                           |
| A primitive's markup, presets, slots, hooks             | `https://zazz.sh/api/primitives/{name}/` (names in `references/components.md`)                                                               |
| Tokens, typography, layout, breakpoints, layers         | `https://zazz.sh/api/foundations/{tokens,typography,layout,breakpoints,layers,globals}/`                                                     |
| Utilities by family                                     | `https://zazz.sh/api/utilities/` and `/api/utilities/{spacing,sizing,typography,backgrounds,…}/`                                             |
| Modifiers (states, breakpoints, group, stuck, starting) | `https://zazz.sh/api/modifiers/{states,responsive,group,stuck,starting}/`                                                                    |
| Switches (`sr-only`, `not-prose`, `theme-dark`, …)      | `https://zazz.sh/api/switches/`                                                                                                              |
| Custom elements, events, hotkeys, signals               | `https://zazz.sh/api/javascript/`                                                                                                            |
| Install, CSP, theming, editor setup                     | `https://zazz.sh/docs/install/installation/`, `/docs/install/security/`, `/docs/theming/customization/`, `/docs/tooling/editor-and-linting/` |
| Changelog and migrations                                | `CHANGELOG.md` in the package; `https://zazz.sh/docs/concepts/migrating/`                                                                    |

In this skill: `references/tokens.md` (choosing tokens and utilities), `references/components.md`
(picking a component), `references/apis.md` (custom elements, popovers, dialogs, tooltips,
carousels, reveals), `DESIGN.md` (brand, type scale, archetypes, motion), `PATTERNS.md`
(semantic HTML, page structure, sentence case, composition).

Working inside the zazz-ui repo itself? The same files live under `packages/core/`
(`AUTHORING.md`, `src/primitives/{name}/*.html`), and `SPEC.md` at the root is the full contract.
