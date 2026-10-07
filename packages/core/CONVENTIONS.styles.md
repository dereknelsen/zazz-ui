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
@layer variables, reset, vendors, legacy, ui, overrides;

@layer legacy {
  @layer imports, components, utilities, migrations;
}

@layer ui {
  @layer components, plugins, utilities;
}
```

Load order lives in [`index.css`](./src/index.css): it `@import`s `_layers.css` first,
then the base partials (including the generated `_properties*.css` and
`_utilities-*.css` utilities layer), then every `primitives/<name>/<name>.css`, with
`_switches.css` last. Everything slots into one of these layers.
Layering (not selector specificity or BEM) is how we control the cascade, so a
plain `[data-ui~="button"]` rule in `components` is overridden by a style utility set in
`style=""` (the `utilities` layer) without `!important`.

The six top-level layers, lowest priority to highest:

- **`variables`**: design tokens, the `:root` custom properties everything reads. Lowest priority.
- **`reset`**: native-element baselines and re-skinned controls.
- **`vendors`**: third-party CSS that does not build on Zazz, via `layer(vendors)`. Above `reset`
  (the reset must not clobber a library's widget styling), below `legacy` (your app CSS keeps
  overriding vendor defaults).
- **`legacy`**: your existing (pre-Zazz) CSS, grouped as four sublayers — `imports` (whole files,
  via `layer(legacy.imports)`), `components`, `utilities`, and `migrations` (temporary shims that
  beat all other legacy CSS). Sits below Zazz, so the framework wins where they overlap, and
  finishing a migration means deleting this one layer. **Never import into bare `layer(legacy)`**:
  un-sublayered rules form an implicit final sublayer that would beat the migration shims.
- **`ui`**: everything Zazz ships, as three sublayers: `components`, then `plugins`
  (Zazz-dependent extensions — above components so an added variant can restyle the primitive it
  extends, via `layer(ui.plugins)`), then `utilities`, which beat everything in `ui`.
- **`overrides`**: the app's deliberate overrides — beats every Zazz layer while staying
  structured. Only unlayered CSS outranks it.

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

`buildHead()` in [`src/head.ts`](./src/head.ts) generates this block, with SRI hashes, for a real page.

A component file is written top-to-bottom in this order:

| #   | Section                  | Layer                  | Required?                     |
| --- | ------------------------ | ---------------------- | ----------------------------- |
| 1   | CSSDoc header            | None                   | always                        |
| 2   | Deprecated css rules     | `@layer legacy`        | when migrating to Zazz        |
| 2   | Component token hooks    | `@layer variables`     | when the component has tokens |
| 3   | Native-element baselines | `@layer reset`         | only if it redraws native UI  |
| 4   | Component rules          | `@layer ui.components` | the component itself          |
| 5   | Generated utilities      | `@layer ui.utilities`  | never in a component file     |

```css
/**
 * button.css: Button ([data-ui~="button"])
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

@layer ui.components {
  :where([data-ui~="button"]) {
    /* rules that consume the hooks above through the utility chain (§5) */
  }
}
```

The four layers, by responsibility:

- **`variables`**: token declarations only (`:root { --x: ... }`). Global tokens live in
  [`_variables.css`](./src/base/_variables.css); each component adds its own namespace here.
  Exceptions in `_variables.css`: `color-scheme`, `interpolate-size`, and the one-frame
  `ui-first-style` animation that holds `--default-transition-duration` at `0s` so primitives
  don't transition in from UA styles when the stylesheet arrives after a style pass.
- **`reset`**: native-element baselines and control internals that must _lose_ to
  component rules (e.g. `::details-content` in [`accordion.css`](./src/primitives/accordion/accordion.css),
  the `::picker` chrome in [`select.css`](./src/primitives/select/select.css), the redrawn switch in
  [`switch.css`](./src/primitives/switch/switch.css)). [`_reset.css`](./src/base/_reset.css) owns the global baseline.
- **`components`**: the actual component (`[data-ui~="button"]`, `[data-ui~="dialog"]`, `[data-ui~="field"]`).
- **`legacy.migrations`**: temporary shims that map old class names to Zazz tokens while you rewrite markup. Delete each rule once the corresponding markup is updated. Lives in an optional `migrations.css` you add and import at the commented slot in [`index.css`](./src/index.css) via `layer(legacy.migrations)`.
- **`utilities`**: the utilities layer, generated from [`utilities.ts`](./src/base/utilities.ts) into
  `_utilities-*.css` (`vp run generate`): attribute-gated rules that read `--p`, `--w--md`,
  `--bg--hover`, … from `style=""`, written with `:where()` for zero specificity. The
  `data-ui` switches (`sr-only`, `pile`) live here too.

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
 *             password-group.css, radio.css ([data-ui~="radio-group"])
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
  --ui-button-bg: var(--color-card);
  --ui-button-bg--hover: var(--color-muted);
  /* metrics */
  --ui-button-min-h: 8;
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

| Tier                 | Example                                                                                                     | Where               |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| Brand/literal scales | `--color-primary-600`, `--color-neutral-100`, `--color-shade-50`                                            | `_variables.css`    |
| Semantic roles       | `--color-background`, `--color-foreground`, `--color-primary`, `--color-border`                             | `_variables.css`    |
| Metrics & systems    | `--spacing`, `--space-*`, `--radius-*`, `--font-family-*`, `--font-size-*`, `--font-weight-*`, `--shadow-*` | `_variables.css`    |
| **Component tokens** | `--ui-button-bg`, `--ui-field-border-color`, `--ui-dialog-rounded`                                          | each component file |

Selected tokens are also **registered as typed `@property`**, inline in
[`_variables.css`](./src/base/_variables.css), so they can be read by container `style()`
queries with typed comparison/range syntax. Theme roles are deliberately **unregistered**:
an unregistered token keeps its `light-dark()` expression live in the token stream, so it
re-resolves against each element's own inherited `color-scheme`. Never register a design
token as `<color>` — that snapshots one resolved arm at the declaring element and kills
re-resolution for every descendant.

### Local component tokens

Every component re-declares a namespace in its own `@layer variables` block, and each
token **defaults to a global token**:

```css
@layer variables {
  :root {
    --ui-button-bg: var(--color-card);
    --ui-button-bg--hover: var(--color-muted);
    --ui-button-min-h: calc(var(--spacing) * 8); /* dual-mode: a scale number or a length */
    --ui-button-rounded: var(--radius-md);
  }
}
```

Naming convention:

- `--ui-{component}-{utility}`: **a hook is named after the utility it backs**:
  `--ui-button-bg`, `--ui-button-text`, `--ui-button-font-size`, `--ui-button-leading`,
  `--ui-button-px`, `--ui-button-min-h`, `--ui-button-rounded`. A hook that backs no utility
  keeps a descriptive name (`--ui-button-icon-size`, `--ui-tooltip-arrow-size`).
- `--ui-{component}-{utility}--{state}`: a **double dash** before one of the seven states
  (`disabled`, `active`, `focus-visible`, `focus-within`, `hover`, `checked`, `open`):
  `--ui-button-bg--hover`, `--ui-field-bg--focus-within`, `--ui-button-bg--active`.
- Theme colors are read through the `--color-*` aliases (`var(--color-primary)`), never a
  bare Shadcn role: `--ring` and friends are utility names and registered non-inheriting.
- **A token is named after the CSS property it feeds, using the _logical_ property
  name**: `-block-size` not `-height`, `-inline-size` not `-width`,
  `-padding-inline` not `-padding-left`. Hooks that mirror a style utility take the
  utility's name instead (`--ui-input-pl`, `--ui-button-px`, `--ui-field-h`). Exceptions: `-line-height` (that _is_ the
  property name — there is no logical variant), and a bare `-size` for square /
  single-value dimensions (`--ui-checkbox-size`, `--ui-button-icon-size`).
- **Full property names, never abbreviations**: `-align-items` not `-align`,
  `-flex-wrap` not `-wrap`, `-radius` (matching `border-radius`'s common short
  form used throughout) — but never a truncated fragment of a multi-word property.
- **Border tokens**: a hook named `-border` always holds a **full CSS shorthand** (it is
  not the `--border` style utility, which takes one color, number, or length)
  (`1px solid var(--color-border)`, or `none`) — fine for decorative, non-varying
  borders (`--ui-table-border`, `--ui-dialog-border`). Interactive controls
  decompose into `-border-width` / `-border-style` / `-border-color`
  (+ `-border-color--{state}`), and the rule composes them:
  `border: var(--ui-x-border-width) var(--ui-x-border-style) var(--ui-x-border-color)`.
  Compose **at the usage site**, never into a `:root` token: a custom property is
  substituted where it is _declared_, so a `:root`-composed shorthand would ignore
  the element-scoped part overrides that variants and states rely on. State rules
  set the `border-color` longhand from the `--{state}` color token.
- **Text color**: `-color` is the text color of a component or part surface (it backs
  the `--color` utility, paired with `-bg`); decoration tints keep descriptive names
  (`--ui-otp-caret-color`, `--ui-dialog-backdrop-color`, `--ui-tooltip-arrow-color`).
- **Cross-component defaults are sanctioned**: a component token may default to
  another component's token (`--ui-button-rounded: var(--ui-field-rounded)`,
  `--ui-toggle-rounded: var(--ui-button-rounded)`) so families stay visually
  coupled. Use a bare alias — never the two-arg `var(--x, fallback)` form; the
  owner file always defines the token. When adding one, update the owner's
  `@consumedby`, your `@requires`, and the `index.css` order (owner registers
  first). The `--ui-field-*` family (fields.css) is the shared owner for controls
  that sit on a line together: inputs, selects, textareas, buttons (metrics),
  tabs, checkbox/radio (surface + border), badges (border/ring).

### Public hooks vs. private internals

A component file declares two kinds of custom property, and the distinction is
load-bearing: do not blur them:

| Kind                    | Looks like                                                             | Lives in                                                        | Declared on              | Apps override?                                          |
| ----------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| **Public theming hook** | `--ui-accordion-summary-padding-block` (`--ui-` + component namespace) | `@layer variables`                                              | `:root`                  | **yes**: the API                                        |
| **Private internal**    | `--_ring-width`, `--_ring-fill` (leading `--_`)                        | the rule that uses it (`components`/`reset`)                    | the element              | **no**: plumbing                                        |
| **Variant private**     | `--_button-bg`, `--_card-bg` (`--_{component}-{utility}`)              | registered `@property … inherits: false` at the top of the file | the element, by a preset | **no**: written by `data-{component}-variant` / `-size` |

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
  are derivable from the identity (`data-ui="button"` → `--ui-button-*`); semantic roles,
  metrics, and brand scales stay unprefixed as the Tailwind/shadcn-compatible theming
  surface (see `docs/adr/0001-dual-form-primitives.md`). `--_` still means _private_
  (below), and it is a footgun for hooks: hooks are usually read on a descendant, so a
  hook registered `@property … inherits: false` never reaches its consumer, and the
  `--_` family trends toward non-inheriting registration.

**Private internals** are transient plumbing: the ring widths flipped on `:focus-visible`
(`--_ring-width`, `--_ring-offset-width`, `--_ring-fill`), or a value composed and reused within
one rule (`--details-content-transition`). They carry the `--_` prefix and are declared
_inside the rule that consumes them_, in `@layer ui.components` or `reset`, **never** in
`@layer variables`. They are not hooks; apps do not touch them. Scoping these to the element
(or `:where(el)`) is correct precisely _because_ they are not meant to be overridden from
`:root`. Two names are off limits: `--_<utility>` (the utilities layer's own private for every utility
in `utilities.ts`, e.g. `--_ring`, `--_gap`) and `--_<utility>-resolved`, which primitives only read.
A static test rejects a hand-written `--_<utility>`.

**Variant privates** are the third kind: `--_{component}-{utility}`, registered at the top of the
file as `@property … { syntax: "*"; inherits: false; }`, written by a preset
(`data-button-variant="primary"` sets `--_button-bg`) and read by the chain ahead of the hook.
Because they never inherit, a variant never leaks into a nested same primitive; an inline hook
does. Every private a file reads must be registered in that file (a static
test checks).

Rule of thumb: if an app should be able to override it, it is a `--ui-{component}-*`
`:root` hook in the variables layer; if it is plumbing the component sets for itself, it is
a `--_` var next to the rule that reads it.

### Rules read one chain; presets write privates

Every utility-backed declaration reads **one chain**, highest precedence first: the utility's
resolver (set by the utilities layer from `style=""`, tiers included), the variant private,
then the hook. Presets then only **write privates**: they never restate the
rule:

```css
@layer ui.components {
  :where([data-ui~="button"]) {
    background-color: var(--_bg-resolved, var(--_button-bg, var(--ui-button-bg)));

    /* dual-mode metrics go through the registered typed pair */
    --_px-len: var(--_px-resolved, var(--_button-px, var(--ui-button-px)));
    --_px-num: var(--_px-resolved, var(--_button-px, var(--ui-button-px)));
    padding-inline: calc(var(--_px-len) + var(--_px-num) * var(--spacing));
  }

  /* a preset changes the private, not the rule */
  :where([data-ui~="button"][data-button-variant="primary"]) {
    --_button-bg: var(--color-primary);
    --_button-bg--hover: oklch(from var(--color-primary) l c h / 0.9);
  }

  :where([data-ui~="button"][data-button-size="sm"]) {
    --_button-min-h: calc(var(--spacing) * 6);
    --_button-rounded: var(--radius-sm);
  }
}
```

Two consequences to keep in mind: a base utility (`--bg`) flattens the primitive's own states,
because the resolver wins in every state; and a hook that is read on a _descendant_
(`--ui-button-icon-size` on the icon, `--ui-table-cell-px` on cells) must stay an inheriting
hook, so presets set the hook there rather than a private. Hover rules sit behind
`@media (hover: hover)`, and every ring-bearing primitive publishes its ring to `--_focus-ring`
so a `--shadow` or `--ring` utility composes with it instead of replacing it.

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
     --ui-button-rounded: var(--radius-full);
   } /* all buttons go pill-shaped */
   ```

3. **Instance**: set the token inline or via a variant/size attribute for a one-off:

   ```html
   <button data-ui="button" style="--ui-button-bg: var(--color-secondary)">One-off</button>
   ```

   For one property on one element, a **utility** is usually the right tool instead
   (`style="--bg: var(--color-secondary)"`); it wins over every hook and variant, and it
   flattens that property across the primitive's states.

Authoring an override never requires touching the package `src/`. That is the point of
the variables layer.

### Instance one-offs: the escape-hatch ladder

For a value that applies to one instance only, reach for (in order):

1. **A utility**, set in `style=""` (`style="--w: 100%; --max-w: 96"`), with
   breakpoint and state tiers (`--w--md: fit-content`, `--bg--hover: …`). Utilities are the
   only thing a kit fragment puts in `style`; a static test enforces it.
2. **A public `--ui-*` hook set inline**, when the value lands where a utility cannot reach
   (a pseudo-element, a vendor shadow part, a descendant slot) or when the primitive's
   states must survive (`style="--ui-button-bg: var(--color-secondary)"`).
3. **A CSS file**, the moment the one-off repeats.

Raw inline properties (`style="max-inline-size: 16ch"`) are for consumer pages, never for
kit fragments. A new `--ui-*` hook is added only when all four hold:
**(a)** a utility on the root cannot set the declaration (pseudo/vendor shadow part,
descendant slot, or state-conditional); **(b)** it is a design value, not structural
plumbing; **(c)** no existing token already reaches it via fan-out; **(d)** a concrete
use case exists in an example fragment or docs page.

@see `docs/adr/0012-props-replace-utility-classes.md` (utilities) and
`docs/adr/0008-instance-override-escape-hatch.md` (the 0.4 ladder it supersedes).

### Dark mode is a hook too

- `color-scheme: light dark` on `:root` enables system dark mode; semantic tokens use
  `light-dark(<light>, <dark>)` so they resolve per `color-scheme`.
- `[data-ui-theme="dark" | "light"]` is a pure `color-scheme` pin on any element — no
  token re-declaration (ADR-0013: one attribute, no `.dark` class). Because theme tokens are unregistered, their `light-dark()`
  expressions re-resolve under the pinned scheme, and scopes nest (a light island
  inside a dark section re-lightens its subtree). Each scope re-asserts
  `color: var(--color-foreground)`: built-in inherited `<color>` properties resolve at the
  ancestor and cross a scheme boundary as a single resolved arm.

---

## 6. Naming & selector conventions

- **Identity is `data-ui`**, a space-separated token list matched with `~=`: every root
  selector is `:where([data-ui~="button"])`, or `:where(ui-tooltip, [data-ui~="tooltip"])`
  for the primitives that also have a tag form (`manifest.ts` `tags`). Zazz never reads or
  writes `class`; a static test rejects class selectors in a migrated stylesheet. One element
  may carry two identities (`data-ui="dialog alert-dialog"`). Native controls that need no
  identity (`input[type="checkbox"]`, `input[role="switch"]`, `<kbd>`) are styled bare in
  `@layer reset` (ADR-0013).
- **Parts are scoped slots**: `data-{primitive}-slot="{part}"` (`data-dialog-slot="header"`,
  `data-input-group-slot="addon"`), a token list matched with `~=`, and every slot selector
  is compounded with its owner's identity
  (`:where([data-ui~="dialog"]) [data-dialog-slot~="header"]`). An element that serves two
  primitives carries both attributes (`data-lightbox-slot="slide" data-carousel-slot="slide"`).
- **Presets and everything else a primitive owns** are `data-{primitive}-{key}`:
  `data-button-variant="primary"`, `data-button-size="icon"`, `data-tabs-orientation="vertical"`,
  `data-popover-side="top"`; JS config is the same shape (`data-carousel-loop="true"`,
  `data-multiselect-placeholder="…"`). Unscoped `data-variant` / `data-size` / `data-slot` /
  `data-orientation` are 0.4 forms and fail the guard.
- **State written by kit JS is `data-{primitive}-state`**, a token list
  (`data-carousel-state="active"`, `data-otp-state="filled active"`,
  `data-toaster-state="front visible"`); CSS keys on `[data-x-state~="token"]`. Native state
  stays native (`:checked`, `:open`, `:popover-open`, `[aria-expanded]`).
- **Globals stay `data-ui-*`**: `data-ui-theme`, `data-ui-guard`.
- **Zero-specificity where overridable**: roots and presets sit inside `:where()` so a utility
  (the `utilities` layer) or a consumer rule wins without `!important`. Order matters
  between equal-specificity rules: a disabled block that must beat a variant comes after it.
- **Logical properties**: prefer `inline-size`/`block-size`, `padding-inline`/`margin-block`,
  `inset-inline-start` so components flip in RTL. **Hook names follow the utility names**
  (`--ui-field-h`, `--ui-field-px`, never `-height`; see §5). Physical `top`/`left` stay only
  where the platform demands them (`anchor()` side keywords) or in direction-neutral
  centering idioms — leave a comment saying why.
- **Focus**: rings render as box-shadows from the ring tokens (`--ring` is the theme input,
  read through `--color-ring`, `--ring-shadow-color`, `--ring-offset-shadow-color`), composed
  on the element as `--_focus-ring` and placed first in the `box-shadow` list:
  `box-shadow: var(--_focus-ring, 0 0 #0000), var(--_shadow-resolved, var(--ui-x-shadow))`.
  The utilities layer's own `box-shadow` emission includes `--_focus-ring` first too, so a
  `--shadow` utility never removes a ring. Every shadow-ringed element keeps a same-geometry
  transparent outline (`--outline-width/style/offset`) for forced-colors modes. Never
  `outline: none` without a replacement.
- **Hover behind the media query**: `@media (hover: hover) { … :hover … }`, so a tapped
  control does not stick in its hover color on touch screens.
- **State exclusion**: express intent with `:not()` (`:hover:not(:disabled)`) rather than
  order-dependent overrides.
- **A `[style*=…]` gate is the subject, never an ancestor.** Style recalc cost in Chromium is
  the number of `[style*=` substrings in the sheet times the length of each element's `style`
  attribute (every gated rule is tested on every styled element and each test scans the whole
  attribute; bodies and `@property` registrations cost nothing — SPEC claim 16). A gate in an
  ancestor compound (`[style*="--x:"] [style*="--y:"]`) is worse: any inline style change then
  invalidates every styled descendant. Publish from the container instead (a non-inheriting
  private read by a `style()` container query, or an inherited private the descendants copy),
  as `_utilities-tier-stuck.css` does. Put a pseudo-class before the gate in a compound
  (`:where(:hover[style*="--hover:"])`): the flag test short-circuits the scan.
- **No `var()` in a universal highlight pseudo-element rule.** `::selection`, `::target-text`,
  `::highlight()`, `::spelling-error`, `::grammar-error` inherit through the highlight chain,
  so style them on `:root` only (`:root::selection { background-color: var(--selection-bg) }`).
  A universal `::selection` rule that reads a custom property makes Chromium recompute every
  descendant's highlight style whenever any custom property changes on an ancestor — on a
  Zazz page, every inline utility change (measured at 196 ms per restyle with 1,000 styled
  children; 0.4 ms on `:root`).
- **Utility names track Tailwind**: `--p`, `--w`, `--bg`, `--leading`, `--rounded` where Tailwind
  has a short name, the CSS property name otherwise. Token names do **not**
  follow Tailwind; they use the tiered `--font-family-*` / `--font-weight-*` (semantic) over
  `--font-family-body` / `--font-family-heading` / `--font-family-mono` (raw) scheme.

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
- **`--_` coordination var in `@layer variables`**: [`toaster.css`](./src/primitives/toaster/toaster.css)
  declares `--_gap` on `:root` inside its variables block. It is the one `--_` var that lives
  in a variables layer: an _inheriting_ coordination default (set on a container, read by
  descendants for `gap`), left unregistered so default inheritance applies. The §5 rule
  ("private internals live next to their rule, never in `@layer variables`") governs
  component hooks; the utilities composition/coordination system is system plumbing, not a
  component. Keep the in-file comment explaining the two `--_` kinds.
- **Legacy isolation during migration**: bring an existing codebase along by importing its
  stylesheet into the `legacy.imports` sublayer (`@import "./your-legacy.css" layer(legacy.imports)`
  at the commented slot in [`index.css`](./src/index.css)); because `legacy` sits below `ui`, the
  framework wins where the two overlap. For class-translation shims while you rewrite markup, add a
  `migrations.css` in `layer(legacy.migrations)` — it beats all other legacy CSS; anything that must
  beat Zazz itself goes in `@layer overrides`. For surgical per-region isolation, reach for `@scope`
  donut scoping rather than an attribute opt-out.

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
       --ui-<component>-background: var(--color-card);
       --ui-<component>-background--hover: var(--color-muted);
       /* metrics */
       --ui-<component>-rounded: var(--radius-md);
     }
   }
   ```

5. Write the rules in `@layer ui.components`, reading each utility-backed hook through the
   chain `var(--_<utility>-resolved, var(--_<component>-<utility>, var(--ui-<component>-<utility>)))`
   (dual-mode utilities through the `--_<utility>-len` / `--_<utility>-num` pair, §5). Spell the root
   `:where([data-ui~="<component>"])`, or `:where(ui-<component>, [data-ui~="<component>"])`
   for a tag-form component, and give the root rule an explicit `display` (an unregistered
   custom tag is `display: inline` by default; skip the declaration only when something
   else governs display, e.g. a `popover` root). Register the file's variant privates
   (`@property --_<component>-<utility> { syntax: "*"; inherits: false; }`) above the layer.
6. Name interior parts `data-<component>-slot="<part>"` and match them with
   `:where([data-ui~="<component>"]) [data-<component>-slot~="<part>"]`, never part classes.
   Roots are never stamped with a slot.
7. Add presets as `[data-ui~="<component>"][data-<component>-variant="…"]` (or `-size`,
   `-orientation`, …) that **only write privates**; hooks read on a descendant are set as
   hooks instead. JS config and state keep the same prefix (`data-<component>-loop`,
   `data-<component>-state="…"`); never mint bare non-`data` attributes, even on tag-form
   elements.
8. If you read another component's tokens, add this file to that file's `@consumedby`.
9. If you redraw native UI, put those rules in `@layer reset` and say why.
