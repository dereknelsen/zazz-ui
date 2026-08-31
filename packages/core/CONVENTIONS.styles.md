# Zazz CSS Conventions

How the stylesheets in `@zazz-ui/core` (`src/`) are documented and structured: base partials in `src/base/`, one co-located `src/primitives/<name>/<name>.css` per component.

This is the source of truth for two things:

1. **CSSDoc**: a small, JSDoc-shaped comment vocabulary for file headers.
2. **File anatomy**: the cascade-layer structure every file follows, with special
   attention to the per-component **variables layer** that exposes theming "hooks".

---

## 1. Why CSSDoc (and not KSS)

[KSS](https://github.com/kss-node/kss) is the best-known CSS documentation format, but
it predates the platform we build on: `@layer`, `@property`, `light-dark()`, anchor
positioning, container `style()` queries, `@starting-style`, and `:has()`. Rather than
bend a 2010-era format around modern CSS, we use a minimal **JSDoc-shaped** convention.

CSSDoc is intentionally lightweight:

- It documents **files**, not every rule. The cascade layers and token names carry most
  of the structure; comments fill in intent, dependencies, and browser caveats.
- It is **machine-greppable**. `grep -r '@requires' src/ --include='*.css'` builds a dependency
  graph; `grep '@uses' …` inventories which modern CSS features the system relies on.
- It **keeps existing prose**. The tags relabel what the headers already said.

---

## 2. File anatomy

Cascade order is declared once, in [`_layers.css`](./src/base/_layers.css), and must load first:

```css
@layer variables, reset, legacy, zazz, migrations;

@layer zazz {
  @layer components, utilities;
}
```

Load order lives in [`index.css`](./src/index.css): it `@import`s `_layers.css` first,
then the base partials, then every `primitives/<name>/<name>.css`, with `_utilities.css` and
`_layout.css` last. Everything slots into one of these layers.
Layering (not selector specificity or BEM) is how we control the cascade, so a
plain `.ui-button` rule in `components` can still be overridden by a `utilities` class
without `!important`.

The five top-level layers, lowest priority to highest:

- **`variables`**: design tokens, the `:root` custom properties everything reads. Lowest priority.
- **`reset`**: native-element baselines and re-skinned controls.
- **`legacy`**: your existing (pre-Zazz) CSS, when you import it with `layer(legacy)`. Sits below Zazz, so the framework wins where they overlap.
- **`zazz`**: everything Zazz ships, as two sublayers: `components` then `utilities`.
- **`migrations`**: temporary shims for old markup mid-migration. On top, so a shim can beat even a utility. Add a `migrations.css` and uncomment its slot in `index.css` when you need it.

For loading, link the single `index.css` bundle: it `@import`s every layer in cascade order,
so there is nothing to keep in sync. For transfer size, enable **brotli or gzip** on the server.
CSS this regular compresses to about 10-15% of its raw size, which beats hand-splitting into parallel
`<link>` tags and adds no maintenance overhead.

```html
<link rel="stylesheet" href="../src/index.css" />
```

(Package consumers import the same bundle as `@zazz-ui/core/index.css`.)

Do not pair it with a `<link rel="preload" as="style">` for the same file: a same-document
stylesheet link is already the highest-priority, render-blocking fetch, so the preload is
redundant (`preload` is for late-discovered resources like web fonts or JS-injected CSS).

See [`examples/index.html`](./examples/index.html) for a complete working example.

A component file is written top-to-bottom in this order:

| #   | Section                  | Layer                    | Required?                     |
| --- | ------------------------ | ------------------------ | ----------------------------- |
| 1   | CSSDoc header            | None                     | always                        |
| 2   | Deprecated css rules     | `@layer legacy`          | when migrating to Zazz        |
| 2   | Component token hooks    | `@layer variables`       | when the component has tokens |
| 3   | Native-element baselines | `@layer reset`           | only if it redraws native UI  |
| 4   | Component rules          | `@layer zazz.components` | the component itself          |
| 5   | Utility classes          | `@layer zazz.utilities`  | only if it ships utilities    |

```css
/**
 * button.css: Button (.ui-button)
 *
 * @layer      variables, components
 * @requires   layers.css, _variables.css, _reset.css
 * @uses       color-mix(), oklch(from ...) (variant hover/active tints)
 * @uses       text-box: vertical trim (patchy browser support)
 * @tokens     --ui-button-* (@layer variables)
 */
@layer variables {
  :root {
    /* the component's override hooks: see §5 */
  }
}

@layer zazz.components {
  .ui-button {
    /* rules that consume the hooks above */
  }
}
```

The four layers, by responsibility:

- **`variables`**: token declarations only (`:root { --x: ... }`). Global tokens live in
  [`_variables.css`](./src/base/_variables.css); each component adds its own namespace here.
- **`reset`**: native-element baselines and control internals that must _lose_ to
  component rules (e.g. `::details-content` in [`accordion.css`](./src/primitives/accordion/accordion.css),
  the `::picker` chrome in [`select.css`](./src/primitives/select/select.css), the redrawn switch in
  [`switch.css`](./src/primitives/switch/switch.css)). [`_reset.css`](./src/base/_reset.css) owns the global baseline.
- **`components`**: the actual component (`.ui-button`, `.ui-dialog`, `.ui-field`).
- **`migrations`**: temporary shims that map old class names to Zazz tokens while you rewrite markup. Delete each rule once the corresponding markup is updated. Lives in an optional `migrations.css` you add and import at the commented slot in [`index.css`](./src/index.css).
- **`utilities`**: atomic, override-anything classes ([`_utilities.css`](./src/base/_utilities.css)),
  written with `:where()` for zero specificity.

---

## 3. The CSSDoc header standard

Every `.css` file opens with a JSDoc block comment (`/** … */`). A free-text summary
line comes first, then block tags. Within a block, tag **values align to a common
column** (tag name padded to 11 chars + a space) so headers scan like a table.

### Tag reference

| Tag                   | Required        | Meaning                                                                                              |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| _(summary)_           | yes             | First line: `<name>.css: Component (.selector)`. Kept verbatim.                                      |
| `@layer`              | yes             | Cascade layers this file contributes to, in order: `variables, components`.                          |
| `@requires`           | yes             | Load-order dependencies: files that must load before this one. `none` for `layers.css`.              |
| `@uses`               | optional        | One modern CSS API/feature per line, with an inline note. Flag support caveats here.                 |
| `@tokens`             | when owned      | The token namespace this file exposes = its override hooks, e.g. `--ui-button-* (@layer variables)`. |
| `@consumedby`         | when applicable | Reverse dependency: files that build on this one.                                                    |
| `@see`                | optional        | External URL or cross-file reference. (Replaces the old block `@link`.)                              |
| `@example`            | optional        | Usage markup. Used where authoring is non-obvious (`reveal.css`).                                    |
| `@version` / `@since` | optional        | Optional, for versioned subsystems (`reveal.css`).                                                   |

### Rules

- **Open with `/**`** (two stars), close with `\*/`. One space-star-space per line.
- **Summary line is verbatim**: do not reword existing component descriptions.
- **`@requires`** is one comma-separated line; wrap long lists and indent the
  continuation to the value column. Always include `layers.css` (every file needs the
  layer order) plus any token/component files it reads.
- **`@uses`** gets one tag per feature. Put the browser-support caveat in the note
  (`Chromium 135+`, `patchy browser support`, `@supports gated`). This tells the
  reader what might need a fallback.
- **`@tokens`** names the namespace, not every token (the tokens self-document via
  naming: see §5). Note tier ownership for shared families:
  `--ui-field-* (Tier 3 owner; @layer variables)`.
- **`@consumedby`** mirrors `@requires` from the other direction. If you add a file that
  `@requires _foo.css`, add it to `_foo.css`'s `@consumedby`.

### Worked example

The header from [`fields.css`](./src/primitives/fields/fields.css), showing every tag in use:

```css
/**
 * fields.css: Shared form field family (Tier 3 owner for --ui-field-*)
 *
 * @layer      variables, components
 * @requires   layers.css, _variables.css
 * @uses       :user-invalid: validation after commit (not while typing)
 * @uses       :has(:user-invalid): label/hint/error crossfade
 * @uses       @starting-style + visibility allow-discrete: hint <-> error swap
 * @uses       color-mix(): destructive field tint on invalid
 * @tokens     --ui-field-*, --ui-field-group-* (Tier 3 owner; @layer variables)
 * @consumedby input.css, textarea.css, select.css, input-group.css,
 *             password-group.css, radio.css (.ui-radio-group)
 */
```

---

## 4. Comment styles inside a file

Three comment styles, each with a job:

**Section banners** separate major regions inside a layer. Keep the existing
75-column rule style:

```css
/* ===========================================================================
  BUTTON VARIANTS
  =========================================================================== */
```

**Token group labels** are short lowercase tags inside a `@layer variables` block.
They group related hooks; they do **not** document individual tokens (the names do):

```css
:root {
  /* surface */
  --ui-button-background: var(--card);
  --ui-button-background--hover: var(--muted);
  /* metrics */
  --ui-button-block-size: var(--step-8);
}
```

**Inline rule comments** explain intent (the _why_, not the _what_) above a
declaration or rule. Reserve them for non-obvious choices (a fallback, a calc, a hack):

```css
/* thumb centered on the track via a calc'd negative margin so retuning
     either size keeps it aligned. */
```

---

## 5. The variables layer = theming "hooks"

This is the heart of the system. Components never hard-code values; they read **tokens**,
and tokens are layered so an application can re-skin the system at three different scopes
without editing a single rule.

### Tiered tokens

Global tokens live in [`_variables.css`](./src/base/_variables.css) under `@layer variables`,
organized in tiers (literal scales → semantic roles → component primitives):

| Tier                 | Example                                                                                                  | Where               |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| Brand/literal scales | `--primary-600`, `--neutral-100`, `--shade-50`                                                           | `_variables.css`    |
| Semantic roles       | `--background`, `--foreground`, `--primary`, `--muted`, `--border`                                       | `_variables.css`    |
| Metrics & systems    | `--step-*`, `--radius-*`, `--gap-*`, `--font-family-*`, `--font-size-*`, `--font-weight-*`, `--shadow-*` | `_variables.css`    |
| **Component tokens** | `--ui-button-background`, `--ui-field-border-color`, `--ui-dialog-radius`                                | each component file |

Selected tokens are also **registered as typed `@property`**, inline in
[`_variables.css`](./src/base/_variables.css), so they can be read by container `style()`
queries with typed comparison/range syntax. Theme roles register with `syntax: "*"` so
`light-dark()` re-resolves correctly under a descendant's `color-scheme`.

### Local component tokens

Every component re-declares a namespace in its own `@layer variables` block, and each
token **defaults to a global token**:

```css
@layer variables {
  :root {
    --ui-button-background: var(--card);
    --ui-button-background--hover: var(--muted);
    --ui-button-block-size: var(--step-8);
    --ui-button-radius: var(--radius-md);
  }
}
```

Naming convention:

- `--{component}-{property}`: `--ui-button-background`, `--ui-dialog-radius`.
- `--{component}-{property}--{state}`: a **double dash** before the state:
  `--ui-button-background--hover`, `--ui-field-background--focus`,
  `--ui-button-background--active`.
- **A token is named after the CSS property it feeds, using the _logical_ property
  name**: `-block-size` not `-height`, `-inline-size` not `-width`,
  `-padding-inline` not `-padding-left`. Exceptions: `-line-height` (that _is_ the
  property name — there is no logical variant), and a bare `-size` for square /
  single-value dimensions (`--ui-checkbox-size`, `--ui-button-icon-size`).
- **Full property names, never abbreviations**: `-align-items` not `-align`,
  `-flex-wrap` not `-wrap`, `-radius` (matching `border-radius`'s common short
  form used throughout) — but never a truncated fragment of a multi-word property.
- **Border tokens**: a token named `-border` always holds a **full shorthand**
  (`1px solid var(--border)`, or `none`) — fine for decorative, non-varying
  borders (`--ui-table-border`, `--ui-dialog-border`). Interactive controls
  decompose into `-border-width` / `-border-style` / `-border-color`
  (+ `-border-color--{state}`), and the rule composes them:
  `border: var(--ui-x-border-width) var(--ui-x-border-style) var(--ui-x-border-color)`.
  Compose **at the usage site**, never into a `:root` token: a custom property is
  substituted where it is _declared_, so a `:root`-composed shorthand would ignore
  the element-scoped part overrides that variants and states rely on. State rules
  set the `border-color` longhand from the `--{state}` color token.
- **Text color**: `-foreground` is the text color of a component or part surface
  (paired with `-background`); `-{part}-color` is reserved for non-text
  decorations (`--ui-otp-caret-color`, `--ui-separator-color`,
  `--ui-dialog-backdrop-color`, icon/arrow tints).
- **Cross-component defaults are sanctioned**: a component token may default to
  another component's token (`--ui-button-radius: var(--ui-field-radius)`,
  `--ui-toggle-radius: var(--ui-button-radius)`) so families stay visually
  coupled. Use a bare alias — never the two-arg `var(--x, fallback)` form; the
  owner file always defines the token. When adding one, update the owner's
  `@consumedby`, your `@requires`, and the `index.css` order (owner registers
  first). The `--ui-field-*` family (fields.css) is the shared owner for controls
  that sit on a line together: inputs, selects, textareas, buttons (metrics),
  tabs, checkbox/radio (surface + border), badges (border/ring).

### Public hooks vs. private internals

A component file declares two kinds of custom property, and the distinction is
load-bearing: do not blur them:

| Kind                    | Looks like                                                             | Lives in                                     | Declared on | Apps override?   |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ----------- | ---------------- |
| **Public theming hook** | `--ui-accordion-summary-padding-block` (`--ui-` + component namespace) | `@layer variables`                           | `:root`     | **yes**: the API |
| **Private internal**    | `--_ring-width`, `--_ring` (leading `--_`)                             | the rule that uses it (`components`/`reset`) | the element | **no**: plumbing |

**Public hooks** are the override API. They default to a global token, are read by the
component (often on a descendant), and apps re-skin by reassigning them. Two rules keep
them overridable:

- **Declare them on `:root`, never on the element.** A custom property declared _directly
  on_ an element (even via a zero-specificity `:where(details)`) beats a value
  _inherited_ from `:root`, because inheritance only fills in when the element has no
  declared value of its own. So `:where(details) { --ui-accordion-summary-padding-block: … }`
  would shadow an app's `:root { --ui-accordion-summary-padding-block: … }` and silently kill
  the "component default" override surface (redefine the token on `:root` to re-skin every
  instance: see below). Locality is already covered: each component declares its hooks at
  the top of its own file.
- **Prefix them `--ui-{component}-`.** Component hooks carry the `ui-` brand prefix and
  are derivable from the root class (`.ui-button` → `--ui-button-*`); semantic roles,
  metrics, and brand scales stay unprefixed as the Tailwind/shadcn-compatible theming
  surface (see `docs/adr/0001-dual-form-primitives.md`). `--_` still means _private_
  (below), and it is a footgun for hooks: hooks are usually read on a descendant, so a
  hook registered `@property … inherits: false` never reaches its consumer, and the
  `--_` family trends toward non-inheriting registration.

**Private internals** are transient plumbing: the ring widths flipped on `:focus-visible`
(`--_ring-width`, `--_ring-offset-width`, `--_ring`), or a value composed and reused within
one rule (`--details-content-transition`). They carry the `--_` prefix and are declared
_inside the rule that consumes them_, in `@layer zazz.components` or `reset`, **never** in
`@layer variables`. They are not hooks; apps do not touch them. Scoping these to the element
(or `:where(el)`) is correct precisely _because_ they are not meant to be overridden from
`:root`.

Rule of thumb: if an app should be able to override it, it is a `--ui-{component}-*`
`:root` hook in the variables layer; if it is plumbing the component sets for itself, it is
a `--_` var next to the rule that reads it.

### Rules reference a token once; variants swap the token

Component rules read the token a single time. Variants and sizes then only **reassign
token values**: they never restate the rule:

```css
@layer zazz.components {
  .ui-button {
    background-color: var(--ui-button-background); /* referenced once */
  }

  /* a variant changes the value, not the rule */
  .ui-button[data-variant="primary"] {
    --ui-button-background: var(--primary);
    --ui-button-background--hover: oklch(from var(--primary) l c h / 0.9);
  }

  .ui-button[data-size="sm"] {
    --ui-button-block-size: var(--step-6);
    --ui-button-radius: var(--radius-sm);
  }
}
```

This is what keeps the files small and the system consistent: one declaration of
`background-color`, many token values.

### The three override surfaces (the hooks)

Because rules resolve tokens lazily, an app can intervene at any of three scopes:

1. **Global**: redefine a semantic token in `_variables.css` (or on `:root` in app CSS):

   ```css
   :root {
     --radius-md: 0;
   } /* squares every component's medium radius */
   ```

2. **Component default**: redefine a component token on `:root`/a scope to re-skin
   every instance of that component:

   ```css
   :root {
     --ui-button-radius: var(--radius-full);
   } /* all buttons go pill-shaped */
   ```

3. **Instance**: set the token inline or via a variant/size attribute for a one-off:

   ```html
   <button class="ui-button" style="--ui-button-background: var(--secondary)">One-off</button>
   ```

Authoring an override never requires touching the package `src/`. That is the point of
the variables layer.

### Instance one-offs: the escape-hatch ladder

For a value that applies to one instance only, reach for (in order):

1. **A utility class**, when a scale value fits (`class="w-full max-w-xl"`).
2. **A public `--ui-*` token set inline**, when the value lands where inline style cannot
   reach (`style="--ui-popover-inline-size: max-content"`).
3. **Raw inline style** for a true same-element one-off (`style="max-inline-size: 16ch"`).
   Legitimate, not a smell: inline style beats every layer in the stack, so it is
   non-destructive by cascade definition.
4. **A CSS file**, the moment the one-off repeats.

Because of rung 3, primitives do **not** carry per-property hook variables for values
inline style can already set. A new `--ui-*` hook is added only when all four hold:
**(a)** inline style on the root cannot set the declaration (pseudo/vendor shadow part,
descendant slot, or state-conditional); **(b)** it is a design value, not structural
plumbing; **(c)** no existing token already reaches it via fan-out; **(d)** a concrete
use case exists in an example fragment or docs page.

@see `docs/adr/0008-instance-override-escape-hatch.md` for the decision record.

### Dark mode is a hook too

- `color-scheme: light dark` on `:root` enables system dark mode; semantic tokens use
  `light-dark(<light>, <dark>)` so they resolve per `color-scheme`.
- A manual `.dark` class re-declares the same semantic tokens (descendant `color-scheme`
  alone will not re-resolve an already-inherited `light-dark()` color: keep these tokens
  **unregistered** so they re-resolve late).
- Inverted surfaces (dark popovers/menus over a light page) flip via a container style
  query: `@container style(--use-inverted-popovers: true)` on `[popover]`. Opt a single
  popover out with `data-use-inverted-menu="false"`.

---

## 6. Naming & selector conventions

- **Roots are dual-form**: every primitive has a `ui-`-prefixed class form
  (`.ui-button`, `.ui-input-group`); primitives whose root would otherwise be a
  generic `<div>`/`<span>` also have a tag form (`<ui-tooltip>`). The two are kept
  equivalent by spelling every root selector `:where(ui-x, .ui-x)` (never one form
  alone). Primitives rooted on semantic native elements (`<button>`, `<dialog>`,
  `<select>`, …) are class-form only ("the most semantic tag wins"; see
  `docs/adr/0001-dual-form-primitives.md`).
- **Interior parts are slots, not classes**: `data-slot="{primitive}-{part}"`
  (`data-slot="input-group-addon"`, `data-slot="dialog-header"`). The attribute is a
  space-separated token list, like `class`: one element may serve two primitives
  (`data-slot="lightbox-slide carousel-slide"`), so selectors always use the token
  matcher `[data-slot~="…"]`, never exact `=`. Classes never name parts, roots are
  never stamped with `data-slot`, and there are no BEM `__` or modifier classes; use
  attributes for state (see `docs/adr/0002-data-slot-parts.md`).
- **Variants & sizes**: data attributes (`[data-variant="primary"]`, `[data-size="sm"]`,
  `[data-side]`, `[data-align]`, `[data-animation]`). They read as state and double as
  token-override hooks.
- **Zero-specificity where overridable**: wrap reset and utility selectors in `:where()`
  so they sit at specificity 0 and stay overridable
  (`:where(input[type="range"])`, `:where(.grid)`).
- **Logical properties**: prefer `inline-size`/`block-size`,
  `padding-inline`/`margin-block`, `inset-inline-start` so components flip in RTL.
  **Token names follow suit** (`--ui-field-block-size`, never `--ui-field-height`;
  see §5 naming convention). Physical `top`/`left` stay only where the platform
  demands them (`anchor()` side keywords) or in direction-neutral centering idioms
  (`left: 50%` + `translate: -50%`) — leave a comment saying why.
- **Focus**: rings render as box-shadows from Tailwind/shadcn-compatible tokens:
  `--ring` (color), `--ring-width`, `--ring-offset-width`, `--ring-offset-color`,
  composed as `--ring-offset-shadow` + `--ring-shadow` (`--shadow-ring`) and layered
  with the component's own shadow. Every shadow-ringed element also keeps a
  same-geometry transparent outline (`--outline-width/style/offset`) so
  forced-colors/high-contrast modes still show focus. Never `outline: none`
  without a replacement.
- **State exclusion**: express intent with `:not()` (`button:hover:not(:disabled)`)
  rather than order-dependent overrides.
- **Utility names track Tailwind**: atomic utilities reuse Tailwind's vocabulary where
  one exists: weights `.font-thin … .font-black` (plus semantic `.font-body` /
  `.font-heading` / `.font-strong`), families `.font-sans` / `.font-serif` / `.font-mono`, sizes `.text-sm`,
  etc., so they read predictably to Tailwind users. Token names do **not** follow
  Tailwind; they use the tiered `--font-family-*` / `--font-weight-*` (semantic) over
  `--font-body` / `--font-heading` / `--font-mono` (raw) scheme.

---

## 7. Allowed variations

These deviate from the canonical shape on purpose: document the reason in-file:

- **Split `@layer variables` blocks**: [`dialog.css`](./src/primitives/dialog/dialog.css) declares motion
  tokens up top and sizing tokens in a second block lower down. Label the second block.
- **Component living in `@layer reset`**: [`switch.css`](./src/primitives/switch/switch.css) redraws the
  native `input[role="switch"]`, so it belongs in `reset` (it must lose to component
  overrides). Note it in `@tokens`.
- **`@supports`-gated progressive enhancement**: [`popover.css`](./src/primitives/popover/popover.css),
  [`tabs.css`](./src/primitives/tabs/tabs.css), and [`select.css`](./src/primitives/select/select.css) gate anchor positioning
  / `base-select` behind `@supports` with a documented fallback. Always describe the
  fallback in the `@uses` note.
- **Per-sibling value math**: `sibling-index()` / `sibling-count()` (Baseline 2026;
  no Firefox yet, so `@supports (order: sibling-index())`-gate them with a fallback) fit
  calculations that vary by position among siblings: staggered `animation-delay`/
  `transition-delay` (implemented: the [`reveal.css`](./src/primitives/reveal/reveal.css) stagger,
  with `reveal.js` writing per-child delays as the unsupported-engine fallback), equal
  widths (`calc(100% / sibling-count())`), hue spreads. They are
  **value functions only, not selector logic**: they cannot replace enumerated
  `:nth-child()`/`:nth-of-type()` chains that correlate one element's index with
  another's (the [`tabs.css`](./src/primitives/tabs/tabs.css) panel-visibility chain documents
  why that enumeration is irreducible).
- **Attribute-hook components**: [`carousel.css`](./src/primitives/carousel/carousel.css) and
  [`lightbox.css`](./src/primitives/lightbox/lightbox.css) style `[data-*]` hooks whose behaviour comes from
  the co-located `<name>.ts` script (loaded as its emitted `<name>.js`). Declare the JS
  dependency in a `@uses` line.
- **Extended header**: [`reveal.css`](./src/primitives/reveal/reveal.css) keeps `@version`/`@since`/
  `@example` plus a data-attribute table because it is a configurable subsystem, not a
  single component.
- **`--_` coordination var in `@layer variables`**: [`_utilities.css`](./src/base/_utilities.css)
  declares `--_gap` on `:root` inside its variables block. It is the one `--_` var that lives
  in a variables layer: an _inheriting_ coordination default (set on a container, read by
  descendants for `gap`), left unregistered so default inheritance applies. The §5 rule
  ("private internals live next to their rule, never in `@layer variables`") governs
  component hooks; the utilities composition/coordination system is system plumbing, not a
  component. Keep the in-file comment explaining the two `--_` kinds.
- **Legacy isolation during migration**: bring an existing codebase along by importing its
  stylesheet into the `legacy` layer (`@import "./your-legacy.css" layer(legacy)` at the
  commented slot in [`index.css`](./src/index.css)); because `legacy` sits below `zazz`, the
  framework wins where the two overlap. For shims that must beat Zazz while you rewrite
  markup, add a `migrations.css` at the top of the stack. For surgical per-region isolation,
  reach for `@scope` donut scoping rather than an attribute opt-out.

---

## 8. Adding a new component

1. Create `src/primitives/<component>/<component>.css` (alongside the component
   example fragments: the primary example is `<component>.html`, secondary
   examples are `<component>-<variant>.html`) and register it in load order
   (after anything it `@requires`); add the `@import` to
   [`index.css`](./src/index.css).
2. **Decide the root form** (ADR-0001): root is a semantic native element
   (`<button>`, `<dialog>`, `<select>`, …) → **class-form only** (`.ui-<component>`);
   root would otherwise be a generic `<div>`/`<span>` → **dual-form**
   (`<ui-<component>>` + `.ui-<component>`).
3. Start with the CSSDoc header skeleton:

   ```css
   /**
    * <component>.css: <Component> (ui-<component> | .ui-<component>)
    *
    * @layer      variables, components
    * @requires   layers.css, _variables.css
    * @uses       <feature>: <note / support caveat>
    * @tokens     --ui-<component>-* (@layer variables)
    */
   ```

4. Declare the token hooks, each defaulting to a global token:

   ```css
   @layer variables {
     :root {
       /* surface */
       --ui-<component>-background: var(--card);
       --ui-<component>-background--hover: var(--muted);
       /* metrics */
       --ui-<component>-radius: var(--radius-md);
     }
   }
   ```

5. Write the rules in `@layer zazz.components`, referencing each token once. For a
   dual-form component, spell every root selector `:where(ui-<component>, .ui-<component>)`
   (never one form alone) and give the root rule an explicit `display` (an
   unregistered custom tag is `display: inline` by default; skip the declaration only
   when something else governs display, e.g. a `popover` root).
6. Name interior parts with `data-slot="<component>-<part>"` and match them with
   `[data-slot~="…"]`, never part classes. Roots are never stamped with `data-slot`.
7. Add variants/sizes as `[data-*]` selectors that **only reassign tokens**. Config
   and state attribute keys stay bare (`data-variant`, `data-<component>-loop`); never
   mint bare non-`data` attributes, even on tag-form elements.
8. If you read another component's tokens, add this file to that file's `@consumedby`.
9. If you redraw native UI, put those rules in `@layer reset` and say why.
