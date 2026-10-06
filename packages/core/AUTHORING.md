# Authoring markup with Zazz 0.5

How to write HTML for the Zazz kit: identities, presets, slots, and style utilities. This is the single source for humans, editor rules, and AI assistants. The contract behind it is `SPEC.md`; the vocabulary is `CONTEXT.md`.

Zazz markup has no classes. Every styling decision is one of four things:

| What                        | Where                          | Example                                                  |
| --------------------------- | ------------------------------ | -------------------------------------------------------- |
| **Identity**: what it is    | `data-ui` (space-separated)    | `data-ui="button"`, `data-ui="card group"`               |
| **Preset**: a named variant | `data-<identity>-<key>`        | `data-button-variant="primary"`, `data-layout-size="xl"` |
| **Slot**: a part inside it  | `data-<identity>-slot`         | `<header data-dialog-slot="header">`                     |
| **Utility**: one value      | `style="--<utility>: <value>"` | `style="--px: 6; --bg: var(--color-muted)"`              |

State tokens (`data-<identity>-state="active open"`) are written by the kit's scripts. Read them in selectors; never author them.

## Identity

- One element, one or more tokens: `data-ui="card group"`. Primitives (`button`, `card`, `dialog`, `layout`…), switches (`sr-only`, `pile`, `isolate`, `container`, `divide-x`, `divide-y`), and typography roles (`text-h2`, `text-eyebrow`…) are all tokens.
- Interactive primitives also have a tag form (`<ui-carousel>`, `<ui-tabs>`, `<ui-layout>`). Use the tag where the wrapper would otherwise be a plain `div`.
- Native elements keep their meaning: a button is a `<button data-ui="button">`, a dialog is a `<dialog data-ui="dialog">`, an input is `<input data-ui="input">`. Never put `data-ui="button"` on a `div`.
- Default variant = no preset attribute. Write `data-button-variant="primary"`, never a combined token.

## Presets and slots

- A preset attribute only works on an element whose `data-ui` carries that identity (or the matching `ui-*` tag). `data-button-variant` on a bare `<button>` does nothing.
- Three identities are native or attribute-based instead of a `data-ui` token: popovers are any `[popover]` element (`data-popover-side`, `data-popover-align`), reveal animations are the attributes `data-reveal` / `data-reveal-each` themselves, and `data-transition-layer` names view-transition groups.
- Slots sit on children, inside the identity: `<div data-ui="dialog"><header data-dialog-slot="header">`.
- Copy the real fragment for a primitive from `src/primitives/<name>/<name>.html` and adapt it. Do not reconstruct a primitive's anatomy from memory.

## Style utilities

```html
<div style="--display: grid; --grid-cols: 1; --grid-cols--md: 3; --gap: var(--space-md)">…</div>
```

- **Spelling is exact**: `--<utility>: value`, one space after the colon, declarations separated by `; `. The kit matches the attribute text, so `--px:6` and `--px : 6` silently do nothing.
- **Numbers are scale steps** on spacing, margin and sizing utilities: `--px: 6` is `6 × --spacing`. The space tokens sit on that scale, so write their number and skip the `var()`: `--space-2xs` = 1, `xs` = 2, `sm` = 4, `md` = 6, `lg` = 11, `xl` = 24, `2xl` = 40 (`--gap: 4` is `var(--space-sm)`). Any length works too: `--px: 1.5rem`, `--w: 100%`.
- **Prefer tokens and their shorthands**: scale numbers for spacing (above), `var(--color-<role>)` for color, `var(--radius-*)`, `var(--font-size-*)`. A few utilities take a token by name, at every tier: `--shadow: md` (`2xs … 2xl`, any shadow or `var()` still works; `--shadow-hue: var(--color-primary)` tints an element's and its subtree's shadows, and `--color-shadow` on `:root` tints them all) and `--font-weight: strong` (also `heading`, `body`; standard names such as `medium` are not CSS, so write `500`). `--display` takes flex shorthands that set the direction too: `flex-row`, `flex-col`, their `-reverse` forms, and `inline-flex-…` (`--display: flex-col; --display--md: flex-row`); there is no `--flex-direction` utility. Raw values are the escape hatch.
- **Names are short**, Tailwind-style where Tailwind has one: `--p --px --py --pt --pb --pl --pr`, `--m …`, `--w --h --size --min-w --max-w`, `--bg --text --border --border-color`, `--bg-linear --bg-radial --bg-conic --bg-stops`, `--rounded`, `--inset --inset-x --inset-y --top --right --bottom --left`, `--font-size --leading --tracking --font-weight`, `--items --justify --place --self`, `--grid-cols --grid-rows --col --row --col-span --col-start --col-end --row-span --row-start --row-end`, `--flex --basis --shrink`. Sides are `l`/`t`/`r`/`b` (`--pl`, `--mr`, `--border-l`); they set logical properties, so `l` is the right side in RTL. `--border: <color | number | length>` is a solid border: a color is 1px wide, a number is that many px in `--color-border`, a length is the width in `--color-border`; `--border-width` and `--border-color` win over it. A side takes only the shorthand: `--border-b: 1` is a one-line divider, `--border-l: var(--color-primary)` an accent edge (there is no `--border-b-width`). Borders between direct children are the `divide-x` / `divide-y` switches: `data-ui="divide-y"`, with `--divide: 2` or `--divide: var(--color-muted)` on the container to size or color them. Grids follow Tailwind: `--grid-cols` / `--grid-rows` take a count (`3` is three equal tracks) or `subgrid` (`none` is `--grid-template-cols: none`); a track list goes in `--grid-template-cols: 2fr 1fr` / `--grid-template-rows`. Place items with `--col-span: 2` (`span 2 / span 2`), `--col-start: 2`, `--col-end: -1`, and the `--row-*` twins; span every track with `--col: 1 / -1` (Tailwind's `col-span-full`). Gradients pair a type with its stops: `--bg-linear: to bottom in oklch; --bg-stops: var(--color-shade-600), transparent 20%` (also `--bg-radial: circle at top`, `--bg-conic: from 45deg`); the type takes the gradient's prelude (direction, shape, position, `in <color-space> [<hue> hue]`), any of it optional but not all of it, and `--bg` stays the color underneath. `--bg: none` clears both the color and any gradient, at the base or a state (`--bg--hover: none`). The editor completes the full list (`editor/zazz.css-data.json`).

### Modifiers

`--<utility>--<breakpoint>` or `--<utility>--<state>`, joined with a double hyphen.

| Modifier    | Values                                                                  | Families                                                    |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| Breakpoint  | `sm md lg xl 2xl` (nearest container's width in `ch`, mobile first)     | flow, grid, spacing, margin, sizing, typography, color      |
| State       | `hover active focus-visible focus-within disabled open checked`         | color, effects (`--bg`, `--text`, `--opacity`, `--shadow`…) |
| Group state | `--group-<utility>--hover` reacts to an ancestor with `data-ui="group"` | color, effects                                              |
| Starting    | `--<utility>--starting`: the value a `--transition` animates from       | color, effects                                              |
| Stuck       | `--<utility>--stuck` inside a sticky element (experimental)             | color, effects                                              |
| Pseudo      | `--before-<utility>`, `--after-<utility>`, plus `--before-content: ''`  | sizing, color, `--rounded`                                  |

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

**Starting.** `--<utility>--starting` is the element's `@starting-style` value: when it first renders, or leaves `display: none` (a popover opening, `hidden` removed), it starts there and a `--transition` animates it to its usual value. Without a transition it does nothing visible. It outranks every other state, has no `--group-*` form, and works without a base where the utility has a default (`--opacity`, `--scale`, `--translate`, `--rotate`). The formatter writes it first in its utility's lines.

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

1. **A tier needs a base.** `--text--hover: red` alone does nothing; write `--text: currentColor; --text--hover: red`. These utilities have a natural default and work tier-only: `--flex-wrap --shrink --grid-flow --auto-cols --auto-rows --items --justify --place --self --flex --basis --order --col --row --grid-cols --grid-rows --gap --gap-x --gap-y --text-align --text-wrap --opacity --scale --translate --rotate --shadow --ring --ring-color --ring-offset --ring-offset-color --rounded --aspect --position --overflow --overflow-x --overflow-y --z` (on any element that is not a primitive: typography roles, switches, and prose count as plain, so `data-ui="text-2xl" style="--opacity--hover: .8"` works; a primitive like a button still needs the base).
2. **Breakpoints reach layout and color; states reach color and effects.** `--bg--md`, `--text--lg`, and `--px--md` exist; `--px--hover` and `--shadow--md` do not. On a color utility a state beats a breakpoint: `--bg--md: black; --bg--hover: gray` is gray on hover at any width.
3. **Keywords mix with numbers.** `--w: 4; --w--md: auto`, `--w: fit-content; --h: 4`, and `--grid-cols: 2; --grid-cols--md: subgrid` all work: each keyword-bearing utility has explicit keyword rules per tier until CSS `if()` can branch on the value. Keywords must be spelled exactly (`--w--md: auto`).
4. **A utility on a primitive flattens its states.** `--bg: red` on a button is red on hover too. To keep hover, add the tier (`--bg--hover: darkred`) or set the hook instead (below).
5. **Breakpoints read the nearest container, not the window.** A tier answers to the closest inline-size container: the page's `html`, `body`, `main`, `section`, `header`, `footer`, `article`, a layout band's child (so tiers inside a `layout-md` band follow the band), or any `data-ui="container"`. Thresholds are character counts: `sm` 40ch, `md` 65ch, `lg` 90ch, `xl` 120ch, `2xl` 150ch. Mark a card, sidebar, or slot `data-ui="container"` and the tiers inside it follow its width. An element never queries itself: a container's own tiers read the container above it. A container cannot size itself from its content, so give it a definite or stretched width.

## Theming primitives: hooks

Every primitive reads `--ui-<identity>-<utility>` hooks that inherit and keep the primitive's own states. Where a primitive has a state, it also reads a state hook such as `--ui-button-bg--hover`; the editor lists exactly which hooks each primitive declares.

```html
<nav style="--ui-button-px: 2; --ui-button-bg--hover: var(--color-muted)">
  …every button inside…
</nav>
```

Order of preference for changing how a primitive looks: preset, then hook on a subtree, then a utility on the one element.

## Layout and typography

- `data-ui="layout"` (or `<ui-layout>`) makes the element a band grid. Children default to the `xl` band. Change the default with `data-layout-size="md"`; place one child with `--col: layout-bleed | layout-full | layout-2xl … layout-sm`, responsive with `--col--md: layout-sm`. A layout nested in a layout aligns to the parent's bands.
- Native `h1`–`h6` carry their role automatically. Give any other element a role with `data-ui="text-h3"`, `text-display`, `text-eyebrow`, `text-link`, or a body size `text-2xs … text-2xl`. Override one property with a utility (`--font-size`, `--leading`, `--font-weight`); never rebuild a role from utilities.
- `data-ui="prose"` styles rich text inside it. Give a reading column `--max-w: var(--article-lg); --mx: auto`.

## Navigation

Pages navigate normally by default; the kit animates full loads with CSS view transitions. To keep state across pages (a toast stack, a playing video, an open mini-cart), opt in with `<html data-ui-navigation="swap">` on every page that should swap. A navigation between two opted-in pages replaces the whole `<body>` in place, except elements marked `data-ui-persist="<id>"` that both pages contain: those keep their live DOM and state. Nothing else persists, so headers and footers always come from the new page.

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

`<ui-debug>` lists the persisted elements on each page and warns about a missing or duplicate id, nested persisted elements, and `data-ui-persist` on a page without the opt-in.

## Theme

`data-ui-theme="dark"` or `"light"` on any element (usually `<html>`) forces that scheme for the subtree; without it, the system setting applies. Color utilities and tokens follow automatically when they use `var(--color-<role>)`.

## Do not

- Write a `class` for styling, or a `<style>` block, to get something the utilities can express.
- Invent tokens: every `var(--…)` must exist in the kit (`src/base/_variables.css`).
- Use 0.4 syntax: `class="ui-button"`, `data-variant`, `data-slot`, utility classes like `p-md` / `@md:grid-cols-3`, `.container`, `class="dark"`.

## Tools

- **`<ui-debug data-debug-domains="localhost">`** in development warns in the console about unknown utilities, wrong values, tiers without a base, flattened states, and misplaced presets.
- **Editor**: the Zazz VS Code extension (`packages/vscode`, also for Cursor) shows the `<ui-debug>` audit as you type, completes utilities (only the tiers each takes), values with resolved tokens, identities, presets, and hooks, and adds hover, inlay hints, highlighting, snippets, and page templates. Without it, `editor/zazz.html-data.json` and `editor/zazz.css-data.json` give flat completions (`"html.customData"`, `"css.customData"` in settings).
- **Formatting**: the `zazz/style-format` ESLint rule puts each utility of a multi-utility `style` on its own line, in cascade order (family, then shorthands first, tiers after their base), and normalizes `--px:6` to `--px: 6`. VS Code applies it on save (`source.fixAll.zazz`, from the extension), the commit hook on staged HTML, and `vp run fmt:html` (repo root) on every file; `vp run ready` checks it.
- **`StyleGuard`** (`primitives/style-guard`) restores utilities when legacy scripts overwrite `style`.
