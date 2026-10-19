# Authoring markup with Zazz (0.5 and later)

How to write HTML for the Zazz kit: identities, presets, slots, and style utilities. This is the single source for humans, editor rules, and AI assistants. The contract behind it is `SPEC.md`; the vocabulary is `CONTEXT.md`.

Zazz markup needs no classes. Every styling decision is one of four things:

| What                        | Where                          | Example                                                  |
| --------------------------- | ------------------------------ | -------------------------------------------------------- |
| **Identity**: what it is    | `data-ui` (space-separated)    | `data-ui="button"`, `data-ui="card group"`               |
| **Preset**: a named variant | `data-<identity>-<key>`        | `data-button-variant="primary"`, `data-layout-size="xl"` |
| **Slot**: a part inside it  | `data-<identity>-slot`         | `<header data-dialog-slot="header">`                     |
| **Utility**: one value      | `style="--<utility>: <value>"` | `style="--px: 6; --bg: var(--color-muted)"`              |

State tokens (`data-<identity>-state="active open"`) are written by the kit's scripts. Read them in selectors; never author them.

## Identity

- One element, one or more tokens: `data-ui="card group"`. Primitives (`button`, `card`, `dialog`, `layout`…), switches (`sr-only`, `pile`, `isolate`, `not-prose`, `truncate`, `spin`, `ping`, `pulse`, `bounce`, `container`, `divide-x`, `divide-y`), and typography roles (`text-h2`, `text-eyebrow`, `text-link`…) are all tokens.
- Interactive primitives also have a tag form (`<ui-carousel>`, `<ui-tabs>`, `<ui-layout>`). Use the tag where the wrapper would otherwise be a plain `div`.
- Native elements keep their meaning: a button is a `<button data-ui="button">`, a dialog is a `<dialog data-ui="dialog">`, an input is `<input data-ui="input">`. Never put `data-ui="button"` on a `div`.
- Default variant = no preset attribute. Write `data-button-variant="primary"`, never a combined token.
- Every `<input>`, `<select>`, and `<textarea>` gets a `name` (the key it submits under; autofill reads it too), even in a search box or a demo. A field that must not submit, like a select-all checkbox or a control mirrored by script, can take an `id` instead. Chrome reports a field with neither, and the `field-id-or-name` lint rule flags it.

## Presets and slots

- A preset attribute only works on an element whose `data-ui` carries that identity (or the matching `ui-*` tag). `data-button-variant` on a bare `<button>` does nothing.
- Three identities are native or attribute-based instead of a `data-ui` token: popovers are any `[popover]` element (`data-popover-side`, `data-popover-align`), reveal animations are the attributes `data-reveal` / `data-reveal-each` themselves, and `data-transition-layer` names view-transition groups.
- Slots sit on children, inside the identity: `<div data-ui="dialog"><header data-dialog-slot="header">`.
- One exception: a button that fires a primitive's custom command carries that primitive's attributes. `<button commandfor="toasts" command="--toast" data-toaster-title="Saved">` works because the toaster reads them off the button.
- Copy the real fragment for a primitive from `src/primitives/<name>/<name>.html` and adapt it. Do not reconstruct a primitive's anatomy from memory.

## Style utilities

```html
<div style="--display: grid; --grid-cols: 1; --grid-cols--md: 3; --gap: 6">…</div>
```

- **Tailwind's names, CSS values.** A utility is named after the Tailwind class it stands in for (`--justify`, `--items`, `--w`; `border-radius` is `--radius`) and takes the value its CSS property takes (`--justify: space-between`, `--w: 100%`, `--shadow: 0 1px 2px black`). Three exceptions: a bare number on spacing, margin, sizing, and radius utilities is a step on the spacing scale (next); `--font-weight` and `--radius` also take a token by name (`strong`, `full`); and `--display` takes `flex-col` and its siblings. The `var()` form of a token (`--shadow: var(--shadow-md)`) always works too. Coming from CSS rather than Tailwind? The docs have a [property-to-utility table](https://zazz.sh/docs/concepts/utilities-reference/).
- **Spelling is exact**: `--<utility>: value`, one space after the colon, declarations separated by `; `. The kit matches the attribute text, so `--px : 6` silently does nothing. A tier gate (`--p:`, `--md:`) reads the property itself and takes `--p:4`, but a keyword, a token by name, a `--display` shorthand, `--bg: none`, and `--position: sticky` match as text and need the one space: `--w:auto` is 0 wide and `--radius:full` stays square. React and Vue serialize an object `style` without the space, so in JSX or a Vue object write those values as a string `style` or as `var()` (`"--shadow": "var(--shadow-md)"`).
- **Numbers are scale steps** on spacing, margin, sizing, and radius utilities: `--px: 6` is `6 × --spacing`. The space tokens sit on that scale, so write their number and skip the `var()`: `--space-2xs` = 1, `xs` = 2, `sm` = 4, `md` = 6, `lg` = 11, `xl` = 24, `2xl` = 40 (`--gap: 4` is `--space-sm`). Radius steps also scale with `--radius-multiplier`, and its tokens sit on the scale too: `--radius: 2.5` is `--radius-md` (0.5 2xs, 1 xs, 1.5 sm, 4.5 lg, 7 xl, 10 2xl). Any length works too: `--px: 1.5rem`, `--w: 100%`.
- **Prefer tokens and their shorthands**: scale numbers for spacing (above), `var(--color-<role>)` for color, radius numbers, `var(--font-size-*)`. Shadows: `--elevation: 4` is a height drawn as a four-layer box-shadow, and `--shadow: var(--shadow-md)` (or any box-shadow) is the explicit form (it wins over `--elevation`); `--shadow-tint: var(--color-primary)` tints an element's and its subtree's shadows, and `--color-shadow` on `:root` tints them all. `--font-weight` takes a token by name, at every tier: `--font-weight: strong` (also `heading`, `body`; standard names such as `medium` are not CSS, so write `500`). `--display` takes flex shorthands that set the direction too: `flex-row`, `flex-col`, their `-reverse` forms, and `inline-flex-…` (`--display: flex-col; --display--md: flex-row`); there is no `--flex-direction` utility. Raw values are the escape hatch.
- **Utilities need the `style` attribute to apply.** Under a strict Content Security Policy, allow it with `style-src-attr 'unsafe-inline'` and keep stylesheets locked with `style-src-elem`; where a policy blocks it anyway, `index.js` loads a fallback that copies each attribute into the CSSOM, at the cost of needing JavaScript. Markup that passes through a sanitizer which strips `style` should use presets, switches, and hooks set in a stylesheet instead.
- **Names are short**, Tailwind-style where Tailwind has one: `--p --px --py --pt --pb --pl --pr`, `--m …`, `--w --h --size --min-w --max-w`, `--bg --text --border --border-color`, `--bg-linear --bg-radial --bg-conic --bg-stops`, `--radius`, `--inset --inset-x --inset-y --top --right --bottom --left`, `--font-size --leading --tracking --font-weight`, `--items --justify --self`, `--place-items --place-content` (alignment keywords only, `safe end` included), `--grid-cols --grid-rows --col-span --col-start --col-end --row-span --row-start --row-end`, `--flex --basis --shrink`. Sides are `l`/`t`/`r`/`b` (`--pl`, `--mr`, `--border-l`); they set logical properties, so `l` is the right side in RTL. `--border: <color | number | length>` is a solid border: a color is 1px wide, a number is that many px in `--color-border`, a length is the width in `--color-border`; `--border-width` and `--border-color` win over it. A side takes only the shorthand: `--border-b: 1` is a one-line divider, `--border-l: var(--color-primary)` an accent edge (there is no `--border-b-width`). Borders between direct children are the `divide-x` / `divide-y` switches: `data-ui="divide-y"`, with `--divide: 2` or `--divide: var(--color-muted)` on the container to size or color them. Grids follow Tailwind: `--grid-cols` / `--grid-rows` take a count (`3` is three equal tracks) or `subgrid` (`none` is `--template-cols: none`); a track list goes in `--template-cols: 2fr 1fr` / `--template-rows`. Place items with `--col-span: 2` (`span 2 / span 2`), `--col-start: 2`, `--col-end: -1`, and the `--row-*` twins; span every track with `--col-start: 1; --col-end: -1` (Tailwind's `col-span-full`). Inside a layout, `--band: layout-md` puts a child in a band. Gradients pair a type with its stops: `--bg-linear: to bottom in oklch; --bg-stops: var(--color-shade-600), transparent 20%` (also `--bg-radial: circle at top`, `--bg-conic: from 45deg`); the type takes the gradient's prelude (direction, shape, position, `in <color-space> [<hue> hue]`), any of it optional but not all of it, and `--bg` stays the color underneath. `--bg: none` clears both the color and any gradient, at the base or a state (`--bg--hover: none`). The editor completes the full list (`editor/zazz.css-data.json`).

### Modifiers

`--<utility>--<breakpoint>` or `--<utility>--<state>`, joined with a double hyphen.

| Modifier    | Values                                                                  | Families                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breakpoint  | `sm md lg xl 2xl` (nearest container's width in `rem`, mobile first)    | flow, grid, spacing, margin, sizing, typography, color, plus `--transition-duration`, `--transition-delay`, the `--ring*` utilities, `--focus-ring`, `--shadow-angle`, `--elevation`, `--radius`, and `--radius-t/-b/-l/-r` |
| State       | `hover active focus-visible focus-within disabled open checked current` | color, effects (`--bg`, `--text`, `--opacity`, `--shadow`, `--elevation`, `--filter`…), and `--radius`                                                                                                                      |
| Group state | `--group-<utility>--hover` reacts to an ancestor with `data-ui="group"` | color, effects                                                                                                                                                                                                              |
| Starting    | `--<utility>--starting`: the value a `--transition` animates from       | color, effects                                                                                                                                                                                                              |
| Stuck       | `--<utility>--stuck` inside a sticky element (experimental)             | color, effects                                                                                                                                                                                                              |
| Pseudo      | `--before-<utility>`, `--after-<utility>`, plus `--before-content: ''`  | sizing, spacing (padding, inset), position, display, z, color, `--radius`, opacity, `--filter`, `--backdrop-filter`, `--mix-blend`, transforms, transition (and its duration and delay), font-size/weight                   |

```html
<article data-ui="card group">
  <img
    src="…"
    alt="…"
    style="--aspect: 3 / 2; --object-fit: cover; --opacity: 1; --group-opacity--hover: 0.85"
  />
  <a
    href="/p/1"
    style="--text: var(--color-muted-foreground); --group-text--hover: var(--color-foreground)"
    >Read more</a
  >
</article>
```

**Starting.** `--<utility>--starting` is the element's `@starting-style` value: when it first renders, or leaves `display: none` (a popover opening, `hidden` removed), it starts there and a `--transition` animates it to its usual value. Without a transition it does nothing visible. It outranks every other state, has no `--group-*` form, and works without a base where the utility has a default (`--opacity`, `--filter`, `--backdrop-filter`, `--mix-blend`, `--scale`, `--translate`, `--rotate`). The formatter writes it first in its utility's lines.

```html
<div
  style="
    --opacity--starting: 0;
    --opacity: 1;
    --translate--starting: 0 1rem;
    --translate: 0;
    --transition: opacity 0.3s, translate 0.3s;
  "
>
  …
</div>
```

**Stuck (experimental).** `--<utility>--stuck` applies while the nearest sticky ancestor is stuck: the sticky element (`--position: sticky`, or raw `position: sticky`) is the container, and `--stuck-state` on it names the side to track (`top right bottom left block-start block-end inline-start inline-end`; default `top`). A container query never matches the container itself, so put the `--*--stuck` utilities on a **child** of the sticky element. It ranks below every other state (`--bg--hover` beats `--bg--stuck`), has no `--group-*` form, and `--stuck-state` takes no tiers: switch `--position` at a breakpoint to drop the state there. Chromium evaluates it natively (container scroll-state queries); elsewhere `index.js` loads a small polyfill (`base/scroll-state.js`) that writes the stuck sides to the container's `data-ui-stuck`, so markup does not change.

```html
<header style="--position: sticky; --position--lg: static; --top: 0; --z: 10">
  <div
    style="--bg: transparent; --bg--stuck: var(--color-background); --shadow--stuck: var(--shadow-md)"
  >
    …
  </div>
</header>
```

Rules that bite:

1. **A tier needs a base.** `--text--hover: red` alone does nothing; write `--text: currentColor; --text--hover: red`. These utilities have a natural default on a plain element and work tier-only: `--p --px --py --pt --pb --pl --pr --bg --flex-wrap --shrink --grid-flow --auto-cols --auto-rows --items --justify --place-items --place-content --self --flex --basis --order --band --col-span --col-start --col-end --row-span --row-start --row-end --grid-cols --grid-rows --template-cols --template-rows --gap --gap-x --gap-y --text-align --text-wrap --text-decoration --opacity --filter --backdrop-filter --mix-blend --scale --translate --rotate --shadow --shadow-angle --ring --ring-color --ring-offset --ring-offset-color --focus-ring --elevation --radius --radius-t --radius-b --radius-l --radius-r --aspect --position --anchor-name --position-anchor --position-area` (on any element where the kit does not set that property itself: `data-ui="text-2xl" style="--opacity--hover: .8"` works, and so does `--opacity--hover` on a card). Where a primitive or the base does set it, its value wins over a tier alone: the tier then applies only if that rule reads the utility, as a button reads `--px` and `--bg`; otherwise write the base (`--bg--md` alone on a popover keeps the popover's paint). The tier-only rules sit in `@layer defaults`, below every component, vendor, and legacy layer (ADR-0017); the editor and `<ui-debug>` report a tier alone that has no effect. Margin, `--text`, and `--font-size` stay out: the base sets a heading's size, a link's color, and the margins between text blocks, and a tier-only value would reset those at rest.
2. **Breakpoints reach layout and color; states reach color and effects.** `--bg--md`, `--text--lg`, and `--px--md` exist; `--px--hover` and `--shadow--md` do not. The rings, the shadow's angle, `--elevation`, and `--radius` take breakpoints too: `--ring--md`, `--focus-ring--md`, `--shadow-angle--md`, `--elevation--md`, `--radius--md` (the corner utilities `--radius-t`, `-b`, `-l`, `-r` take breakpoints only). The anchor utilities take states too (`--anchor-name--hover`, `--position-area--open`), so editor chrome can follow the hovered block. On a color utility a state beats a breakpoint: `--bg--md: black; --bg--hover: gray` is gray on hover at any width.
3. **Keywords mix with numbers.** `--w: 4; --w--md: auto`, `--w: fit-content; --h: 4`, `--grid-cols: 2; --grid-cols--md: subgrid`, and `--bottom: 0; --bottom--lg: auto` all work: each keyword-bearing utility has explicit keyword rules per tier until CSS `if()` can branch on the value. Keywords must be spelled exactly (`--w--md: auto`). The side insets (`--top`, `--right`, `--bottom`, `--left`) take `auto`; `--inset`, `--inset-x`, and `--inset-y` take lengths only.
4. **A utility on a primitive flattens its states.** `--bg: red` on a button is red on hover too. To keep hover, add the tier (`--bg--hover: darkred`) or set the hook instead (below).
5. **Breakpoints read the nearest container, not the window.** A tier answers to the closest inline-size container: the page's `html`, a layout band's child (so tiers inside a `layout-md` band follow the band), or any `data-ui="container"`. Thresholds are the `--layout-*` widths in rem, the same in any font: `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem, `2xl` 96rem. Mark a card, sidebar, or slot `data-ui="container"` and the tiers inside it follow its width. An element never queries itself: a container's own tiers read the container above it. A container cannot size itself from its content, so give it a definite or stretched width.

6. **Ring widths are signed pixels.** `--ring: 2` is a 2px ring and `--ring: -2` draws it inset; a length works too. A primitive's focus ring takes the same signed width from `--focus-ring` (`--focus-ring: -2` keeps it inside a clipping container), defaulting to the `--ring-width` token. `--shadow-angle` turns the direction shadows are cast in (`0deg` down, `90deg` left, `180deg` up) for the element's `--shadow` and `--elevation` and for the shadows in its subtree, primitives included. `--default-shadow-angle` on `:root` sets it for the whole page.

## Theming primitives: hooks

Every primitive reads `--ui-<identity>-<utility>` hooks that inherit and keep the primitive's own states. Where a primitive has a state, it also reads a state hook such as `--ui-button-bg--hover`; the editor lists exactly which hooks each primitive declares.

```html
<nav style="--ui-button-px: 2; --ui-button-bg--hover: var(--color-muted)">
  …every button inside…
</nav>
```

Order of preference for changing how a primitive looks: preset, then hook on a subtree, then a utility on the one element.

## Layout and typography

- `data-ui="layout"` (or `<ui-layout>`) makes the element a band grid. Children default to the `xl` band. Change the default with `data-layout-size="md"`; place one child with `--band: layout-bleed | layout-full | layout-2xl … layout-sm`, responsive with `--band--md: layout-sm`. A layout nested in a layout aligns to the parent's bands.
- Native `h1`–`h6` carry their role automatically. Give any other element a role with `data-ui="text-h3"`, `text-display`, `text-eyebrow`, or a body size `text-2xs … text-2xl`. An inline link outside `prose` takes `text-link` (`data-ui="text-sm text-link"` stacks it with a size). Override one property with a utility (`--font-size`, `--leading`, `--font-weight`); never rebuild a role from utilities.
- `data-ui="prose"` styles rich text inside it. Give a reading column `--max-w: var(--article-lg); --mx: auto`. `data-ui="not-prose"` on a wrapper stops prose styling for that subtree (a form or widget inside an article).

## Navigation

Pages navigate normally by default, with no transition. To animate full loads, add `@view-transition { navigation: auto; }` to the site's own CSS; `_view-transitions.css` styles it. To keep state across pages (a toast stack, a playing video, an open mini-cart), opt in with `<html data-ui-navigation="swap">` on every page that should swap. A navigation between two opted-in pages replaces the whole `<body>` in place, except elements marked `data-ui-persist="<id>"` that both pages contain: those keep their live DOM, state, and scroll offsets, and their links take `aria-current` from the new page. Nothing else persists, so headers and footers come from the new page unless marked. The window scrolls to the top (or the target) instantly; back and forward restore it.

A region whose content depends on the page, such as a section sidebar, should not persist: give it `data-ui-persist-scroll="<id>"` instead. It renders from the new page and keeps only its scroll offset. Style current-page links with the `current` state (`aria-current`), so a persisted header updates too: `aria-current="page"` with `--bg: transparent; --bg--current: var(--color-muted)` on the link.

```html
<html data-ui-navigation="swap">
  …
  <body>
    <header>…current-page links render fresh on every page…</header>
    <main>…</main>
    <ui-toaster data-ui-persist="toaster"></ui-toaster>
  </body>
</html>
```

`<ui-debug>` lists the persisted elements on each page and warns about a missing or duplicate id, nested persisted elements, and `data-ui-persist` on a page without the opt-in. It checks `data-ui-persist-scroll` the same way, and flags one that sits on or inside a `data-ui-persist` element, which already keeps its scroll.

## Theme

The `theme-dark` or `theme-light` switch on any element (`data-ui="theme-dark"`, usually on `<html>`) forces that scheme for the subtree; without one, the system setting applies. Color utilities and tokens follow automatically when they use `var(--color-<role>)`.

## Do not

- Write a `class` for styling, or a `<style>` block, to get something the utilities can express.
- Invent a `data-*` attribute or a custom property in `style` to style by. A `style` attribute holds only the kit's utilities and `--ui-<identity>-*` hooks; anything else (a token like `--code-border`, a property no utility covers) goes in a BEM-style class (`.block__element--modifier`) with plain CSS in your own stylesheet. `data-*` outside the kit's vocabulary is for your scripts' hooks and state, and the kit never reads `class`.
- Invent tokens: every `var(--…)` must exist in the kit (`src/base/_variables.css`, plus the generated `--shadow-*` tokens in `src/base/_shadows.css`).
- Use 0.4 syntax: `class="ui-button"`, `data-variant`, `data-slot`, utility classes like `p-md` / `@md:grid-cols-3`, `.container`, `class="dark"`.

## Tools

- **`<ui-debug data-debug-domains="localhost">`** in development warns in the console about unknown utilities, wrong values, tiers without a base, flattened states, misplaced presets, and form fields with neither `id` nor `name`.
- **Editor**: the Zazz VS Code extension (`packages/vscode`, also for Cursor) shows the `<ui-debug>` audit as you type, completes utilities (only the tiers each takes), values with resolved tokens, identities, presets, and hooks, and adds hover, inlay hints, highlighting, snippets, and page templates. Without it, `editor/zazz.html-data.json` and `editor/zazz.css-data.json` give flat completions (`"html.customData"`, `"css.customData"` in settings).
- **Formatting**: the `zazz/style-format` ESLint rule puts each utility of a multi-utility `style` on its own line, in cascade order (family, then shorthands first, tiers after their base), and normalizes `--px:6` to `--px: 6`. VS Code applies it on save (`source.fixAll.zazz`, from the extension), the commit hook on staged HTML, and `vp run fmt:html` (repo root) on every file; `vp run ready` checks it.
- **`StyleGuard`** (`primitives/style-guard`) restores utilities when legacy scripts overwrite `style`.
