# Zazz Design Framework

Shared language for the Zazz monorepo: the `@zazz-ui/core` package (`packages/core`), its CLI and editor tooling, and the documentation site (`apps/docs`, Astro + Markdoc, which generates its API reference from the kit's own data).

## Language

### Markup

Three channels carry everything Zazz puts in markup. A tag or `data-ui` token says what an element _is_, a `data-<primitive>-*` attribute picks a preset, a style utility carries a _value_. The `class` attribute belongs to the consumer; Zazz never reads or writes it.

**Primitive**:
One folder under `packages/core/src/primitives/`: a reusable, atomic UI element (styles + optional behavior + example fragments) used to compose layouts and UIs. A primitive is not a layout, template, or full-page pattern.
_Avoid_: component, widget

**Tag form**:
The custom-tag spelling of a primitive (`<ui-tooltip>`). Exists only where the root element would otherwise be a meaningless `<div>`/`<span>`; styleable without registration, registered only when it carries behavior. A semantic native element is never replaced by a tag.
_Avoid_: element version, web component form, `<ui-button>`

**Attribute form**:
The `data-ui` spelling of a primitive (`<div data-ui="tooltip">`, `<button data-ui="button">`). Every primitive has an attribute form; primitives rooted on semantic native elements have only this form. `data-ui` is a space-separated token list: a specialization rides on its base (`data-ui="dialog alert-dialog"`), and switches and typography roles stack on anything.
_Avoid_: class form, `.ui-button`, expanded version, raw form

**Switch**:
A primitive that is only a fixed rule set: no slots, no tag form, no presets, no value (`data-ui="sr-only"`, `data-ui="pile"`). It rides the same `data-ui` token list as any primitive (`data-ui="badge sr-only"`).
_Avoid_: utility class, helper class, modifier class, boolean attribute

**Slot**:
An interior part of a primitive, identified by `data-<primitive>-slot="<part>"` (`data-dialog-slot="header"`). A part that serves two primitives carries two attributes (`data-lightbox-slot="slide" data-carousel-slot="slide"`). Slots replace BEM element classes.
_Avoid_: part, fragment, segment, sub-component, BEM element, `data-slot`, `data-ui-slot`

**Variant**:
An enumerated preset on a primitive, chosen with `data-<primitive>-variant` or `data-<primitive>-size` (`data-button-variant="primary"`, `data-button-size="icon"`). A variant is a named bundle of values private to that element: it never cascades into a nested primitive of the same kind, never adds behavior, and never applies outside its primitive.
_Avoid_: modifier, flavor, theme, BEM modifier, `data-variant`, `data-ui-variant`

**Typography role**:
A named text preset (`text-h1`–`text-h6`, `text-display`, `text-eyebrow`, `text-2xs`–`text-2xl`) that bundles family, size, weight, leading, tracking, and case. Native headings carry their role by default; any element takes a role as an identity token (`data-ui="text-h4"`). Utilities override a role one property at a time.
_Avoid_: text class, heading style, type scale entry, `text-h1` (as a class), `data-ui-text`

**Group**:
An ancestor marked `data-ui="group"` whose interaction state drives group-context utilities on its descendants (`--group-opacity--hover`). Any marked ancestor counts, nearest or not; named groups (`data-group-name`) are reserved and not yet implemented.
_Avoid_: parent hover, container state

### Values

**Style utility** (short: utility, "style util"):
A value carried by one element through a custom property in its `style` attribute (`--p: 4`, `--w--md: fit-content`, `--bg--hover: var(--color-muted)`). A utility may hold a scale number, a raw CSS value, or a token. Utilities belong to the element that sets them and never inherit; a utility written in a stylesheet is not a utility. On a primitive, a utility overrides that property flat, across states, unless a state tier is given.
_Avoid_: prop, style prop, style variable, style token, inline token, utility class (the 0.4 class layer), hook variable

**Modifier**:
The suffixes and leading words that scope a utility: `--[group-][before-|after-]<utility>[--<breakpoint>][--<state>]`. A leading word names a context (`group`) or a pseudo-element (`before`, `after`) and joins with one hyphen; a breakpoint or state joins with a double hyphen (`--w--md`, `--opacity--hover`, `--group-before-bg--hover`). A single hyphen inside a utility name is a sub-property (`--bg-alpha`), never a modifier. Leading words, states, and breakpoints are reserved and never used as utility names.
_Avoid_: variant, prefix, breakpoint class, state class

**Hook**:
A public, inheritable theming token for one primitive, `--ui-{primitive}-{utility}` with the utility's modifier grammar (`--ui-button-bg--hover`), declared in the primitive's own file on `:root`. Set on `:root`, on a subtree, or inline on a primitive, a hook themes that subtree, nested primitives included. A primitive reads its hook last, after utilities and its variant.
_Avoid_: component token, private variable, `--_*`, `--ui-button-background`

### Layout

**Layout**:
The primitive (`<section data-ui="layout">`, `<ui-layout>`) that turns an element into the band grid for its own children. Children sit in the layout's default band (`xl`, changed with `data-layout-size`) unless a `--band` utility places them elsewhere. A layout never styles its parent.
_Avoid_: container, `.container`, wrapper, page grid

**Band**:
One of the named column spans of a layout: `layout-sm`–`layout-2xl` cap and center content at the matching `--layout-*` width (rem), `layout-full` fills the layout minus the gutters, `layout-bleed` runs edge to edge. A band is a width cap; it shares a name and a number with a breakpoint but is not one.
_Avoid_: column, container size, breakpoint

**Breakpoint**:
One of five named inline-size thresholds (`sm` 40ch, `md` 65ch, `lg` 90ch, `xl` 120ch, `2xl` 150ch, chosen for legibility) at or above which a responsive modifier applies. Tiers read the nearest inline-size container (the page containers, a layout band's child, or any `data-ui="container"`), in `ch` of its font. Layout band and component widths are a separate rem scale, `--layout-*`.
_Avoid_: media query, screen size, band, `--is-breakpoint-*`, `--bp-*`

### Distribution

**Vendor**:
The CLI's distribution model: copying kit files into a consumer's project so the consumer owns and edits them; updates are diffs against recorded provenance, not package bumps.
_Avoid_: eject, copy-paste install, scaffold

**HTML web component**:
A light-DOM custom element that augments existing, already-styled markup with behavior. The JS-carrying subset of primitives (today: carousel, lightbox, password-group, tabs, toaster; planned: debug). It never uses shadow DOM and never renders its own content; without JS its markup must still render sensibly.
_Avoid_: shadow-DOM component, "web component" as a catch-all for every primitive
