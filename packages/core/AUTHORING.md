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

- One element, one or more tokens: `data-ui="card group"`. Primitives (`button`, `card`, `dialog`, `layout`…), switches (`sr-only`, `grid-pile`), and typography roles (`text-h2`, `text-eyebrow`…) are all tokens.
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
- **Numbers are scale steps** on spacing, margin and sizing utilities: `--px: 6` is `6 × --spacing`. Any length works too: `--px: 1.5rem`, `--w: 100%`, `--gap: var(--space-md)`.
- **Prefer tokens**: `var(--space-2xs … 2xl)` for spacing, `var(--color-<role>)` for color, `var(--radius-*)`, `var(--font-size-*)`, `var(--shadow-*)`. Raw values are the escape hatch.
- **Names are short**, Tailwind-style where Tailwind has one: `--p --px --py --pt --pb --pl --pr`, `--m …`, `--w --h --size --min-w --max-w`, `--bg --text --border --border-color`, `--rounded`, `--font-size --leading --tracking --font-weight`, `--items --justify --place --self`, `--grid-cols --col --row`, `--flex --basis --shrink`. Sides are `l`/`t`/`r`/`b` (`--pl`, `--mr`, `--border-l`); they set logical properties, so `l` is the right side in RTL. `--border: <color | number | length>` is a solid border: a color is 1px wide, a number is that many px in `--color-border`, a length is the width in `--color-border`; `--border-width` and `--border-color` win over it. `--grid-cols` / `--grid-rows` take a count (`3` is three equal tracks); a track list goes in `--grid-template-cols: 2fr 1fr` / `--grid-template-rows`. The editor completes the full list (`editor/zazz.css-data.json`).

### Modifiers

`--<utility>--<breakpoint>` or `--<utility>--<state>`, joined with a double hyphen.

| Modifier    | Values                                                                  | Families                                                    |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| Breakpoint  | `2xs xs sm md lg xl 2xl` (min-width, mobile first)                      | flow, grid, spacing, margin, sizing, typography             |
| State       | `hover active focus-visible focus-within disabled open checked`         | color, effects (`--bg`, `--text`, `--opacity`, `--shadow`…) |
| Group state | `--group-<utility>--hover` reacts to an ancestor with `data-ui="group"` | color, effects                                              |
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

Rules that bite:

1. **A tier needs a base.** `--text--hover: red` alone does nothing; write `--text: currentColor; --text--hover: red`. These utilities have a natural default and work tier-only: `--flex-direction --flex-wrap --shrink --grid-flow --auto-cols --auto-rows --items --justify --place --self --flex --basis --order --col --row --grid-cols --grid-rows --gap --gap-x --gap-y --text-align --text-wrap --opacity --scale --translate --rotate --shadow --ring --ring-color --ring-offset --ring-offset-color --rounded --aspect --position --overflow --overflow-x --overflow-y --z` (on plain elements; a primitive still needs the base).
2. **Breakpoints are layout, states are paint.** `--bg--md` and `--px--hover` do not exist.
3. **Sizing keywords switch the element to raw values.** Once an element has `--w: fit-content` (or `auto`, `min-content`, `max-content`) on any sizing or margin utility, its other sizing numbers must be lengths: `--w: fit-content; --h: 4rem`, not `--h: 4`.
4. **A utility on a primitive flattens its states.** `--bg: red` on a button is red on hover too. To keep hover, add the tier (`--bg--hover: darkred`) or set the hook instead (below).
5. **`body` cannot use breakpoint tiers.** Put responsive utilities on a child.

## Theming primitives: hooks

Every primitive reads `--ui-<identity>-<utility>` hooks that inherit and keep the primitive's own states. Where a primitive has a state, it also reads a state hook such as `--ui-button-bg--hover`; the editor lists exactly which hooks each primitive declares.

```html
<nav style="--ui-button-px: 2; --ui-button-bg--hover: var(--color-muted)">
  …every button inside…
</nav>
```

Order of preference for changing how a primitive looks: preset, then hook on a subtree, then a utility on the one element.

## Layout and typography

- `data-ui="layout"` (or `<ui-layout>`) makes the element a band grid. Children default to the `lg` band. Change the default with `data-layout-size="md"`; place one child with `--col: layout-bleed | layout-full | layout-xl … layout-2xs`, responsive with `--col--md: layout-sm`. A layout nested in a layout aligns to the parent's bands.
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
- **Editor**: VS Code and Cursor complete `data-ui` tokens, presets, slots, utilities, tiers and token values from `editor/zazz.html-data.json` and `editor/zazz.css-data.json` (`"html.customData"`, `"css.customData"` in settings).
- **Formatting**: `vp run fmt:html` (repo root) runs oxfmt on HTML, then puts each utility of a multi-utility `style` on its own line and normalizes `--px:6` to `--px: 6`. The commit hook runs it on staged HTML, and `vp run ready` checks it.
- **`StyleGuard`** (`primitives/style-guard`) restores utilities when legacy scripts overwrite `style`.
