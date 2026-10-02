# Zazz 0.5.0 spec: style utilities, `data-ui`, and the end of utility classes

Status: revision 3.1, 2026-09-28, after the second validation pass; resolver variables added during implementation. Decisions and rationale live in [ADR-0012](docs/adr/0012-props-replace-utility-classes.md) and [ADR-0013](docs/adr/0013-data-ui-markup-namespace.md), each with dated amendments; vocabulary lives in [CONTEXT.md](CONTEXT.md). This file is the mechanical contract, written so an agent can validate it without the conversation that produced it. No decisions are pending.

## How to validate this spec

1. Read [CONTEXT.md](CONTEXT.md) first; use its terms (utility, modifier, hook, switch, band, group) verbatim in your report.
2. Work through the **claims register** (§14) in order. For each claim, run the stated check in a real browser or against the repo, and mark it **confirmed**, **refuted**, or **blocked** with the evidence (a file path, a screenshot, a computed-style readout, a byte count).
3. Where a claim is refuted, propose the smallest change to the contract that restores it, and say which other sections it touches.
4. Read §1–§13 looking for a case the rules leave undefined or two rules that contradict. Add each one to the report as a **gap** with a concrete markup example.

Done means: every claim in §14 carries a verdict with evidence, every gap carries an example, and nothing is marked "seems fine". Prototype pages go in `packages/core/examples/spec/`, named after the claim number.

## 1. The three channels

| Channel  | Says                                      | Spelled as                                                           |
| -------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Identity | what the element _is_                     | `<ui-tooltip>` (tag form) or `data-ui="tooltip"` (attribute form)    |
| Preset   | which named bundle applies                | `data-<primitive>-<key>` (`data-button-variant`, `data-layout-size`) |
| Value    | a specific number, length, color, keyword | a utility in `style=""` (`--p: 4`)                                   |

The `class` attribute is the consumer's. Zazz CSS contains no class selectors and Zazz JS never touches `className` or `classList`.

Before and after, one element each:

```html
<!-- 0.4 -->
<button class="ui-button w-full @md:w-fit px-6 opacity-90 hover:opacity-100" data-variant="primary">
  Save
</button>

<!-- 0.5 -->
<button
  data-ui="button"
  data-button-variant="primary"
  style="--w: 100%; --w--md: fit-content; --px: 6; --opacity: .9; --opacity--hover: 1"
>
  Save
</button>
```

## 2. Markup namespace

- **Tag form** exists only where the root would otherwise be a generic `<div>`/`<span>`. Semantic natives keep their tag and take the attribute form: `<button data-ui="button">`, `<dialog data-ui="dialog">`. `<ui-button>` never exists.
- **`data-ui`** is a space-separated token list, matched with `[data-ui~="button"]`, never `=`. Aliasing: `:where(ui-tooltip, [data-ui~="tooltip"])`. A specialization rides on its base (`data-ui="dialog alert-dialog"`); switches (`sr-only`, `grid-pile`) and typography roles (`text-xl`) stack on anything (`data-ui="badge text-xs"`).
- **Presets and everything else a primitive owns** are `data-<name>-<key>`: `data-button-variant="primary"`, `data-button-size="icon"`, `data-layout-size="xl"`, `data-scroll-fade-axis="y"`, `data-tabs-state="active"` (token list, written by kit JS), `data-carousel-loop="true"` (JS config, parsed with the prefix `data-carousel-`). Slots are `data-<name>-slot="<part>"` (`data-dialog-slot="header"`), matched with `~=`; a part shared by two primitives carries two attributes.
- **Globals** with no owning primitive stay `data-ui-*`: `data-ui-theme="dark"` on `<html>`, `data-ui-navigation="swap"` on `<html>` and `data-ui-persist="<id>"` on any element (§17).
- **Kit JS writes** only `data-ui`, `data-<name>-state`, and `data-ui-theme`.
- **Every `data-<name>-*` selector compounds with the identity**: `[data-ui~="button"][data-button-variant="primary"]`, `:where(ui-dialog, [data-ui~="dialog"]) [data-dialog-slot~="header"]`. `parseDataAttributes` runs only on elements carrying the identity. A third-party attribute of the same shape (Flowbite's `data-carousel-item`, `data-tabs-toggle`) on an element without the identity matches nothing.

## 3. Utilities architecture

Three kinds of rules, all in `@layer zazz.utilities`, all at zero specificity via `:where()`.

**Registrations** (`src/base/_properties.css`, generated):

```css
@property --w {
  syntax: "*";
  inherits: false;
} /* base utility */
@property --w--md {
  syntax: "*";
  inherits: false;
} /* one per allowed tier; generic setters read these */
@property --_w {
  syntax: "*";
  inherits: false;
} /* base layer variable, set only from the style gate */
@property --_w-md {
  syntax: "*";
  inherits: false;
} /* tier layer variable, one per allowed tier */
@property --_w-len {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
} /* dual-mode pair */
@property --_w-num {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
@property --_focus-ring {
  syntax: "*";
  inherits: false;
} /* published by primitives on :focus-visible */
```

A `syntax: "*"` registration with no `initial-value` is guaranteed-invalid when unset, and a declaration that copies an absent utility is invalid at computed-value time and becomes guaranteed-invalid too. Both fall through a `var()` fallback. That is the whole mechanism. Pseudo-element utilities (`--before-*`, `--after-*`) are never registered, because `::before` must inherit them from its host.

**Resolvers and base rules**, one pair per utility. The resolver is gated on any spelling of the utility and holds the precedence chain in a registered, non-inheriting `--_<utility>-resolved`; the base rule is gated exactly on the base, copies it into its layer variable, and emits from the resolver:

```css
:where([style*="--w:"], [style*="--w--"]) {
  --_w-resolved: var(
    --_w-2xl,
    var(--_w-xl, var(--_w-lg, var(--_w-md, var(--_w-sm, var(--_w-xs, var(--_w-2xs, var(--_w)))))))
  );
}
:where([style*="--w:"]) {
  --_w: var(--w);
  --_w-len: var(--_w-resolved);
  --_w-num: var(--_w-resolved);
  inline-size: calc(var(--_w-len) + var(--_w-num) * var(--spacing));
}
:where([style*="--opacity:"], [style*="--opacity--"]) {
  --_opacity-resolved: var(
    --_opacity-disabled,
    var(
      --_opacity-active,
      var(
        --_opacity-focus-visible,
        var(
          --_opacity-focus-within,
          var(
            --_opacity-hover,
            var(
              --_opacity-checked,
              var(
                --_opacity-open,
                var(--_opacity-g-disabled, /* … group tiers in the same order … */ var(--_opacity))
              )
            )
          )
        )
      )
    )
  );
}
:where([style*="--opacity:"]) {
  --_opacity: var(--opacity);
  opacity: var(--_opacity-resolved);
}
```

When nothing in the chain is set, the resolver is guaranteed-invalid, which is what lets a primitive read `var(--_px-resolved, var(--_button-px, var(--ui-button-px)))` in one line (§9): the utilities layer computes every chain exactly once, and no chain is ever repeated inside a primitive.

Precedence, highest first: own states (`disabled`, `active`, `focus-visible`, `focus-within`, `hover`, `checked`, `open`), then group states in the same order, then breakpoints descending, then the base. Breakpoint families and state families are disjoint in 0.5.0, so a chain holds one kind of tier plus the base.

**Setters**, one rule per tier, gated generically, copying every utility that tier applies to:

```css
@container style(--cqi-md: true) {
  :where([style*="--md:"]) {
    --_display-md: var(--display--md);
    --_w-md: var(--w--md);
    --_p-md: var(--p--md);
    /* … every breakpoint-able utility */
  }
}
@media (hover: hover) {
  :where([style*="--hover:"]:hover) {
    --_bg-hover: var(--bg--hover);
    --_opacity-hover: var(--opacity--hover);
    /* … every state-able utility */
  }
  :where([data-ui~="group"]:hover [style*="--group-"]) {
    --_bg-g-hover: var(--group-bg--hover);
    /* … every state-able utility */
  }
}
```

`[style*="--md:"]` matches `--w--md:` and `--p--md:` and nothing else (`--cqi-md:` contains `-md:` but not `--md:`). A false match, such as a consumer's `--x--md:`, only copies absent utilities and changes nothing.

**No-base emissions**, for utilities whose CSS initial value is the natural value on a plain element. These are gated on any tier of the utility, end their chain in that initial value as a literal, and exclude primitives (which carry their own chain, §9):

```css
:where(:is([style*="--grid-cols:"], [style*="--grid-cols--"]):not([data-ui], ui-layout, ui-carousel, /* … every tag form, generated */)) {
  grid-template-columns: repeat(
    var(--_grid-cols-2xl, /* … */ var(--_grid-cols, 1)),
    minmax(0, 1fr)
  );
}
```

| Utility                                      | Property                                                     | Literal chain end |
| -------------------------------------------- | ------------------------------------------------------------ | ----------------- |
| `--grid-cols`, `--grid-rows`                 | `grid-template-columns`, `grid-template-rows` via `repeat()` | `1`               |
| `--grid-flow`                                | `grid-auto-flow`                                             | `row`             |
| `--auto-cols`, `--auto-rows`                 | `grid-auto-columns`, `grid-auto-rows`                        | `auto`            |
| `--items`, `--justify`, `--place`            | `align-items`, `justify-content`, `place-items`              | `normal`          |
| `--flex`                                     | `flex`                                                       | `0 1 auto`        |
| `--basis`                                    | `flex-basis`                                                 | `auto`            |
| `--self`                                     | `align-self`                                                 | `auto`            |
| `--order`                                    | `order`                                                      | `0`               |
| `--col`, `--row`                             | `grid-column`, `grid-row`                                    | `auto`            |
| `--gap`, `--gap-x`, `--gap-y`                | `gap`, `column-gap`, `row-gap`                               | `0`               |
| `--text-align`                               | `text-align`                                                 | `start`           |
| `--text-wrap`                                | `text-wrap`                                                  | `wrap`            |
| `--flex-wrap`                                | `flex-wrap`                                                  | `nowrap`          |
| `--shrink`                                   | `flex-shrink`                                                | `1`               |
| `--opacity`                                  | `opacity`                                                    | `1`               |
| `--scale`, `--translate`, `--rotate`         | `scale`, `translate`, `rotate`                               | `none`            |
| `--rounded`                                  | `border-radius`                                              | `0`               |
| `--aspect`                                   | `aspect-ratio`                                               | `auto`            |
| `--position`                                 | `position`                                                   | `static`          |
| `--overflow`, `--overflow-x`, `--overflow-y` | `overflow`, `overflow-x`, `overflow-y`                       | `visible`         |
| `--z`                                        | `z-index`                                                    | `auto`            |

`--shadow` and the `--ring*` utilities need no row: every chain in their shared `box-shadow` composite already ends in a literal, so the composite is emitted a second time gated on any of their tiers (primitives excluded). The no-base gates also match the `--group-<utility>--<state>` form.

So `--display: grid; --grid-cols--md: 3` on a `<div>` is one column below md and three above.

**Consequences of this shape**

- **Every other utility needs a base value on the same element for a tier to apply.** `--display--md: none` alone does nothing; `--display: block; --display--md: none` works (Tailwind's `block md:hidden`). `--display` cannot join the allowlist because its initial value, `inline`, is wrong for a `<div>`. On a primitive, tiers of the utilities in its hook list work without a base (§9); tiers of other utilities follow the plain-element rule.
- **Absent never clobbers.** An absent tier falls through the chain; an absent base means no emission, or the literal initial value on the allowlist.
- **A utility is flat across states unless a state tier is given**, on plain elements and primitives alike. `--bg: var(--color-secondary)` on a button is secondary at rest and on hover; add `--bg--hover` or set the hook instead (§9).
- **Pseudo-elements** use per-utility exact gates and no tiers: `:where([style*="--before-content:"])::before { content: var(--before-content) }`. Pseudo × breakpoint and pseudo × state are stacking and are deferred.
- **Stacking** (`--bg--md--hover`) adds a tier per combination and its registrations; nothing else changes. Deferred.
- **Border shorthand**: `--border`, `--border-x`, `--border-y`, and `--border-l/t/r/b` each take a color, a number, or a length, sorted by registered typed channels (a value that fails a channel's syntax falls back to its initial value):

  | Value                                   | Width       | Color            |
  | --------------------------------------- | ----------- | ---------------- |
  | a color (`red`, `var(--color-primary)`) | `1px`       | that color       |
  | a number (`2`, `-2`)                    | `abs(n)` px | `--color-border` |
  | a length (`3px`, `var(--space-2xs)`)    | that length | `--color-border` |

  Style is `solid` unless `--border-style` is set. Per side, highest first: the side longhand (`--border-l-width`, `--border-l-color`), the all-sides longhand (`--border-width`, `--border-color`), the side shorthand, the axis shorthand, `--border`. So `--border-color: #000` beats `--border: #fff`, and `--border-width: 2px; --border-l: red` is a 2px red left border. The shorthands take state tiers like the rest of the color family and need a base; on a primitive they flatten its border states like any base utility.

- **`--ring*` and `--shadow`** compose into `box-shadow: var(--_focus-ring, 0 0 #0000), <ring list or 0 0 #0000>, <shadow chain or 0 0 #0000>`, so a shadow or ring utility never removes a primitive's focus ring.
- Longhands come after shorthands within every emission block (`--p` before `--px` before `--pt`).

## 4. Utility names

Rule: Tailwind's short name where Tailwind has one that differs from the CSS property; otherwise the CSS property name. A utility name never equals an inheriting token name (the color token family is `--color-*`, so `--border`, `--ring`, and `--shadow` utilities are free). Directional utilities name the physical side, `l`/`t`/`r`/`b` (`--pl`, `--mr`, `--left`, `--border-l-width`), and still set the logical property (`padding-inline-start`, `margin-inline-end`, `inset-inline-start`, `border-inline-start-width`), so they flip in RTL. Reserved, never a utility name: `ui`, `group`, `before`, `after`, every state, every breakpoint. So `--ring` is only the ring-width utility: the ring's theme color is the `--color-ring` role (set on `:root`), which the kit reads through the inheriting `--ring-shadow-color` and `--ring-offset-shadow-color` tokens. Hand-written stylesheets never use a `--_<utility>` name: those are the utilities layer's privates; they read `--_<utility>-resolved` and set the `--_<utility>-len` / `--_<utility>-num` pair.

Modes: **dual** takes a scale number (× `--spacing`) or a `<length-percentage>`; **raw** is passed verbatim; **keyword** is one keyword passed verbatim; **integer** is a typed `<integer>`.

| Family           | Utilities                                                                                                                                                                                              | Mode                                                   | Tiers       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------- |
| Display and flow | `--display`, `--flex-direction`, `--flex-wrap`, `--grid-flow`, `--auto-cols`, `--auto-rows`, `--items`, `--justify`, `--place`, `--self`, `--flex`, `--shrink`, `--basis`, `--order`, `--col`, `--row` | keyword / raw                                          | breakpoints |
| Grid             | `--grid-cols`, `--grid-rows`                                                                                                                                                                           | integer → `repeat(n, minmax(0, 1fr))`                  | breakpoints |
|                  | `--grid-template-cols`, `--grid-template-rows`                                                                                                                                                         | raw                                                    | breakpoints |
|                  | `--grid-fit`                                                                                                                                                                                           | length → `repeat(auto-fit, minmax(min(v, 100%), 1fr))` | breakpoints |
| Spacing          | `--p --px --py --pt --pb --pl --pr`, `--gap --gap-x --gap-y`, `--inset --top --bottom --left --right`                                                                                                  | dual                                                   | breakpoints |
| Margin           | `--m --mx --my --mt --mb --ml --mr`                                                                                                                                                                    | dual, plus `auto` (§6)                                 | breakpoints |
| Sizing           | `--w --h --size --min-w --max-w --min-h --max-h`                                                                                                                                                       | dual, plus keywords (§6)                               | breakpoints |
|                  | `--aspect`                                                                                                                                                                                             | raw                                                    | breakpoints |
| Typography       | `--font-size`, `--font-weight`, `--font-family`, `--font-style`, `--leading`, `--tracking`, `--text-align`, `--text-transform`, `--text-wrap`, `--line-clamp`, `--whitespace`, `--text-decoration`     | raw / keyword                                          | breakpoints |
| Color            | `--text` (text color), `--bg`, `--bg-alpha`, `--border`, `--border-x`, `--border-y`, `--border-{l,t,r,b}`, `--border-color`, `--border-width`, `--border-style`, `--border-{l,t,r,b}-{width,color}`    | raw                                                    | states      |
| Effects          | `--opacity`, `--shadow`, `--ring`, `--ring-color`, `--ring-offset`, `--ring-offset-color`, `--scale`, `--translate`, `--rotate`, `--transition`                                                        | raw                                                    | states      |
| Box              | `--rounded`, `--overflow --overflow-x --overflow-y`, `--outline`, `--cursor`, `--isolation`, `--pointer-events`, `--visibility`, `--z`                                                                 | raw / keyword                                          | none        |
| Pseudo only      | `--before-*`, `--after-*` for `content`, the sizing family, the color family, `--rounded`                                                                                                              | raw                                                    | none        |

- `--bg` emits `background-color: oklch(from <bg chain> l c h / calc(alpha * <bg-alpha chain, default 1>))`.
- `--ring*` and `--shadow` compose into one declaration: `box-shadow: <ring list or 0 0 #0000>, <shadow chain or 0 0 #0000>`, so neither kills the other. Primitive focus rings compose into the same list through their hooks.
- Theme colors are the `--color-*` roles (`--color-primary`), declared once as `light-dark()` pairs on `:root`; there are no bare Shadcn names, so a utility name (`--text`, `--border-color`) never collides with a token.

## 5. Dual mode

`--p: 4` → `--_p-len` fails and takes `0px`, `--_p-num` is `4`, padding is `4 × --spacing`. `--p: 6rem` → `--_p-len` is `6rem`, `--_p-num` takes `0`. `--p: var(--space-md)` resolves before the type check and behaves as a length. `--p: 0` parses as both and sums to zero.

- One typed pair per dual utility, never shared: custom properties compute once per element.
- The unit is fluid: `--spacing: clamp(0.225rem, …, 0.25rem)`. A consumer pins it with `:root { --spacing: .25rem }`. Named sizes are `--space-2xs … --space-2xl`, multiples of `--spacing`; there is no separate numeric step scale.

## 6. Margin and sizing keywords

Dual mode cannot pass a keyword (`auto`, `fit-content`, `min-content`, `max-content`) through the typed pair, and an emission cannot branch per value, so keywords need a second, raw emission. Decided: the **element switches its sizing or margin family to raw emission** when its `style` contains a keyword of that family. Gates are exact, per utility and per tier, because the tier suffix sits between the utility and the colon. The dual rule itself is ungated; the raw twin follows it in source at the same (zero) specificity, so on a keyword element the twin's declaration wins and the dual rule's typed pair is dead:

```css
:where([style*="--w:"]) {
  /* dual emission as in §3 */
}
/* the sizing keyword list: 7 utilities × 4 keywords × 8 tiers = 224 substrings, generated */
:where([style*="--w:"]:is([style*="--w: auto"], [style*="--w--2xs: auto"], /* … */ [style*="--max-h--2xl: max-content"])) {
  inline-size: var(
    --_w-2xl,
    /* … */ var(--_w)
  ); /* raw: keywords and lengths pass, numbers do not */
}
```

The margin family has its own list: 7 utilities × `auto` × 8 tiers = 56 substrings. Both families keep the base requirement. `--w: 100%; --w--md: auto` and `--w: 100%; --w--md: fit-content` therefore work, and `--overflow: auto` on the same element changes nothing, because only the exact utility forms are in the lists. The rule a user learns: **on an element that uses a sizing keyword, sizing numbers must be lengths** (`--h: 1rem`, not `--h: 4`); the debug tool flags a number there.

Claim 16 gates this. If per-frame cost fails with the full lists, the fallback is `auto` and `fit-content` at every tier (112 + 56 substrings) with `min-content` and `max-content` at the base tier only (14). Rejected: value-gated emission rules per utility, tier, and keyword; raw-only margin and sizing.

## 7. Modifiers

Grammar: `--[group-][before-|after-]<utility>[--<breakpoint>][--<state>]`. Leading words join with one hyphen; breakpoint and state join with a double hyphen. Examples: `--before-content: ''`, `--group-opacity--hover: 1`, `--w--md: fit-content`, `--bg--focus-visible: var(--color-ring)`.

| Tier           | Values                   | Selector                                             | Families                                                    |
| -------------- | ------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- |
| Breakpoint     | `2xs xs sm md lg xl 2xl` | `@container style(--cqi-md: true)`                   | display and flow, grid, spacing, margin, sizing, typography |
| State          | `hover`                  | `:hover` inside `@media (hover: hover)`              | color, effects                                              |
|                | `active`                 | `:active`                                            |                                                             |
|                | `focus-visible`          | `:focus-visible`                                     |                                                             |
|                | `focus-within`           | `:focus-within`                                      |                                                             |
|                | `disabled`               | `:is(:disabled, [aria-disabled="true"])`             |                                                             |
|                | `open`                   | `:is([open], :popover-open, [aria-expanded="true"])` |                                                             |
|                | `checked`                | `:is(:checked, [aria-checked="true"])`               |                                                             |
| Group state    | same seven               | `[data-ui~="group"]<state> [style*="--group-"]`      | color, effects                                              |
| Pseudo-element | `before after`           | `::before`, `::after`                                | sizing, color, `--content`, `--rounded`                     |

Any ancestor marked `data-ui="group"` counts (Tailwind's semantics). **Named groups are reserved, not implemented**: `data-ui="group" data-group-name="card"` on the ancestor and `--group-card-opacity--hover` on the descendant; a group name never equals a utility name. Stacking across tiers is deferred; the grammar already allows it.

## 8. Breakpoints and flags

| Name  | rem | px   |
| ----- | --- | ---- |
| `2xs` | 24  | 384  |
| `xs`  | 30  | 480  |
| `sm`  | 40  | 640  |
| `md`  | 48  | 768  |
| `lg`  | 64  | 1024 |
| `xl`  | 80  | 1280 |
| `2xl` | 96  | 1536 |

Tokens `--breakpoint-2xs` … `--breakpoint-2xl`. Layout bands (§12) cap at the same widths.

```css
@property --cqi-md {
  syntax: "true | false";
  inherits: true;
  initial-value: false;
}
html {
  container-type: inline-size;
  container-name: html;
}
@container html (width >= 48rem) {
  body {
    --cqi-md: true;
  }
}
```

Every descendant inherits the flag and a style query reads the parent's computed value, so breakpoint setters match everywhere below `body`; `body` itself cannot use responsive utilities. Viewport flags `--vi-*` use the same thresholds via `@media` on `:root`. Because the flag is an inherited custom property, a subtree can pin it (`style="--cqi-md: false; --cqi-lg: false"`) to render its mobile layout inside a preview pane; document this.

## 9. Primitives

A primitive's declarations read the utilities layer's resolver variable for each utility in its hook list, then a variant private, then the hook. The chain itself lives only in the utilities layer (§3). Hooks are declared in the primitive's file:

```css
@layer variables {
  :root {
    --ui-card-bg: var(--color-card);
    --ui-card-bg--hover: var(--ui-card-bg);
    --ui-card-px: 6; /* hooks may be dual-mode numbers */
    --ui-card-ring: 0 0 0 2px var(--color-ring);
  }
}
@property --_card-bg {
  syntax: "*";
  inherits: false;
} /* variant privates, one per hook, generated */
@layer zazz.components {
  :where([data-ui~="card"]) {
    --_px-len: var(--_px-resolved, var(--_card-px, var(--ui-card-px)));
    --_px-num: var(--_px-resolved, var(--_card-px, var(--ui-card-px)));
    padding-inline: calc(var(--_px-len) + var(--_px-num) * var(--spacing));
    background-color: var(--_bg, var(--_card-bg, var(--ui-card-bg)));
    @media (hover: hover) {
      &:hover {
        background-color: var(
          --_bg-hover,
          var(--_bg, var(--_card-bg--hover, var(--ui-card-bg--hover)))
        );
      }
    }
    &:focus-visible {
      --_focus-ring: var(--ui-card-ring);
    }
    box-shadow: var(--_focus-ring, 0 0 #0000), var(--_shadow, var(--ui-card-shadow));
  }
  :where([data-ui~="card"][data-card-variant="muted"]) {
    --_card-bg: var(--color-muted);
  }
}
```

Precedence inside a primitive, highest first: the utility's resolver (own state tiers, then breakpoints, then the base utility), variant private, hook. A base utility with no state tier therefore flattens the primitive's own state hooks, by design. Three consequences:

- **Tiers work without a base on a primitive** for the utilities in its hook list: `--px--md: 6` alone on a button applies at md and the hook applies below, because the tier setter fires from the `style` gate and the primitive's own chain picks it up. Utilities stay inline-only: layer variables are only ever set from `style` gates, so a stylesheet `--px` on a button does nothing.
- **A utility flattens that property across states** (`--bg` on a button is the same color on hover). To retheme a primitive and keep its states, set its hook or add the state tier. The debug tool warns when a state-bearing utility lands on a primitive whose hook list has that state.
- **Focus rings survive shadow and ring utilities**: the primitive publishes its ring into `--_focus-ring` on `:focus-visible`, and both its own `box-shadow` and the utilities emission include that variable first.

**Hooks are subtree theming.** `--ui-{primitive}-{utility}` carries the utility's modifier grammar (`--ui-button-bg--hover`) and inherits. It may be set on `:root`, on any subtree selector (`.sidebar { --ui-button-px: 2 }`), or inline on a primitive, and it themes that element and its nested primitives of the same kind.

**Variants are per element.** A variant writes registered, non-inheriting privates (`--_card-bg`), read ahead of the hook, so a variant never cascades into a nested same primitive (card-in-card, menu-in-menu). On one element a variant therefore beats an inline hook; "a muted card with a red background" is written with a utility (`--bg`) or another variant.

- **Exposure**: each primitive's hook list is its 0.4 hook list renamed to utility names, then audited for edge cases, naming drift, and missing hooks or attributes. The rename table ships in the changelog.
- **No class markup inside primitives**: example fragments and JS-generated markup carry `data-ui*`, `data-<name>-*`, and utilities only.

## 10. Typography

- **Roles** are identity tokens: `data-ui="text-h1"` … `text-h6`, `text-display`, `text-eyebrow`, `text-link`, `text-2xs` … `text-2xl` (including `text-md`). Native `h1`–`h6` get their role in the reset without a token. Roles live in the `reset` layer: a component rule beats a role, and a utility beats both. A role sets family, size, weight, leading, tracking, case, `text-wrap`, and `font-optical-sizing` from the atomic tokens (`--font-size-*`, `--leading-*`, `--tracking-*`, `--font-weight-*`, `--font-family-*`).
- **Utilities** override one property at a time: `--font-size: var(--font-size-xl)`, `--leading: 1.2`, `--font-weight: 500`. There is no `--font` shorthand utility.
- `data-ui="prose"` is the rich-text switch.

## 11. Compound utilities

| Bucket          | Test                                            | Result                                  | 0.4 classes                                                                                                                                                 |
| --------------- | ----------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utility         | several properties move together with one value | one utility                             | `size-*`, `line-clamp-*`, `ring`, `aspect-*`, `flex-1`, `inset-0`, `overflow-x-auto`, `outline-none`, `grid-rows-subgrid`, `truncate` (→ `--line-clamp: 1`) |
| Switch          | fixed rule set, no value                        | `data-ui="{name}"` token                | `sr-only`, `grid-area-pile` (→ `grid-pile`)                                                                                                                 |
| Small primitive | fixed rule set with an axis or size             | `data-ui="{name}"` plus `data-{name}-*` | `scroll-fade-*` (→ `data-ui="scroll-fade" data-scroll-fade-axis="y"`), `container` (→ layout, §12)                                                          |

Typography roles (`text-h1`, `text-eyebrow`, `--font-weight: var(--font-weight-strong)`) are covered by §10. A switch that grows a second `data-<name>-*` attribute is a primitive and moves under `src/primitives/`.

## 12. Layout

- `data-ui="layout"` (or `<ui-layout>` where the wrapper would be a div) turns the element itself into the band grid for its children. Nothing styles a parent.
- Band lines are prefixed because a `<custom-ident>` cannot start with a digit: `[layout-bleed-start] [layout-full-start] [layout-2xl-start] … [layout-2xs-start] … [layout-2xs-end] … [layout-2xl-end] [layout-full-end] [layout-bleed-end]`. `grid-column: layout-md` resolves through the implicit named area.
- Children default to the `lg` band; `data-layout-size="xl"` changes the default for that layout's children; `--col: layout-bleed`, `--col: layout-md`, `--col: span 2`, `--col--lg: layout-xl` place one child.
- A layout inside a band uses `grid-template-columns: subgrid` and keeps the parent's line names.
- Band widths equal the breakpoint widths; `layout-full` is the layout minus `--gutters`; `layout-bleed` is edge to edge.

## 13. Developer tooling

- **Editor**: one HTML custom-data file enumerating `data-ui` tokens (primitives, switches, roles) and every `data-<name>-<key>` attribute with its values; one CSS custom-data file for utility names inside `style` if the format accepts `--` names (claim 21).
- **`<ui-debug data-debug-domains="localhost, staging.example.com">`** (`src/primitives/debug/debug.ts`, `zazz-ui add debug`): an HTML web component. On a listed domain it walks `[style*="--"]` once (and on mutation) and warns on: unknown utility names, a wrong mode (`--w: fit` under dual, a number on a keyword-mode element per §6), a tier without a base on a utility outside the §3 allowlist, a modifier on a family that has none, a state-bearing utility on a primitive whose hook list has that state (hover flattened), a raw property shadowing a utility (`style="padding: 10px; --p: 4"`), a whitespace form the gates cannot match (`--w:auto`), and a `data-<name>-*` attribute whose primitive is not in `data-ui`. On an unlisted domain it removes itself and logs once: `Style utility debug tools are still loaded in this domain, but not enabled. If this is intentional, you can ignore this warning by setting data-debug-warnings="false".`
- **Style guard** (`src/primitives/style-guard/style-guard.ts`, optional, production; `zazz-ui add style-guard`): a `MutationObserver` with `attributeFilter: ["style"]` on the subtree that snapshots an element's `--` declarations on first sight and re-applies them only when a write drops **all** of them at once, which is the `el.style.cssText = …` and `.attr('style', …)` signature; a single `removeProperty('--p')` is intentional and stays removed. `data-ui-guard="off"` opts an element out. It cannot repair a template that emits two `style` attributes; the parser keeps the first. Document that as an authoring error.

## 14. Claims register

Each claim states the check and the expected result. Mechanics claims need Chrome, Firefox, and Safari at the two-versions-back floor; size claims need the generated files.

| #   | Claim                                                                                                                                                                                                                                                                                     | Check                                                                                                                                                                                                                                | Expected                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A registered property whose value fails its syntax computes to its `initial-value`; a `syntax: "*"` registration with no initial value is guaranteed-invalid when unset and falls through a `var()` fallback.                                                                             | `--_p-len: var(--p)` with `--p: 4`; `var(--_w-md, 1px)` with `--_w-md` never set.                                                                                                                                                    | `0px`; `1px`. All three engines.                                                                                                                                                                                                  |
| 2   | Dual mode resolves `4`, `6rem`, `100%`, `0`, and `var(--space-md)` (a `clamp()`).                                                                                                                                                                                                         | Five elements, computed `padding`.                                                                                                                                                                                                   | `4 × --spacing`, `6rem`, `100%`, `0`, the clamp value.                                                                                                                                                                            |
| 3   | `[style*="--p:"]` matches after `el.style.setProperty('--p', 4)` on an element that had no `style` attribute.                                                                                                                                                                             | Set in JS, read computed padding.                                                                                                                                                                                                    | Padding applies.                                                                                                                                                                                                                  |
| 4   | Gate exactness: `[style*="--p:"]` misses `--px:`, `--p--md:`, `--top:`, `--before-p:`; `[style*="--md:"]` matches `--w--md:` and misses `--cqi-md:`.                                                                                                                                      | Elements carrying only those utilities.                                                                                                                                                                                              | As stated.                                                                                                                                                                                                                        |
| 5   | An unregistered pseudo-element utility inherits into `::before`; a registered `inherits: false` one does not.                                                                                                                                                                             | `--before-content: ''` both ways; inspect `::before`.                                                                                                                                                                                | Unregistered renders; registered does not.                                                                                                                                                                                        |
| 6   | A modifier utility on a parent never reaches a child's chain.                                                                                                                                                                                                                             | Parent `--opacity--hover: .5`; child `--opacity: .9; --w--hover: 1px` (so the child matches the hover setter); hover the child.                                                                                                      | Child stays at `.9`.                                                                                                                                                                                                              |
| 7   | The flag set once on `body` matches breakpoint setters on every descendant.                                                                                                                                                                                                               | Element five levels deep with `--p: 4; --p--md: 8`; resize across 768 px.                                                                                                                                                            | Padding switches at 768 px.                                                                                                                                                                                                       |
| 8   | `html { container-type: inline-size }` changes no layout on any primitive fragment (breakpoint flags held at their values).                                                                                                                                                               | Diff screenshots.                                                                                                                                                                                                                    | Pixel-identical.                                                                                                                                                                                                                  |
| 9   | Chain precedence: own state beats group state; `active` beats `hover`; the highest matching breakpoint wins.                                                                                                                                                                              | `--opacity: .9; --opacity--hover: .8; --opacity--active: .6` pressed while hovered; a group with `--group-opacity--hover: .3` and a child with its own `--opacity--hover: .8`; `--w: 1rem; --w--sm: 2rem; --w--lg: 3rem` at 1100 px. | `.6`; `.8`; `3rem`.                                                                                                                                                                                                               |
| 10  | A primitive's chain honors, in order: an inline utility, a variant, an inline hook, a subtree hook (`.sidebar { --ui-button-px: 2 }`), a `:root` hook; `--px--md: 6` alone on a button applies at md and the hook below; a consumer stylesheet setting `--px` on the button does nothing. | Seven buttons.                                                                                                                                                                                                                       | As stated.                                                                                                                                                                                                                        |
| 11  | `grid-column: layout-md` resolves via implicit named areas, and a subgrid child sees the same names.                                                                                                                                                                                      | Layout prototype with a nested layout.                                                                                                                                                                                               | Both children align to the `md` band.                                                                                                                                                                                             |
| 12  | A typography role token followed by `--font-size` and `--font-weight` utilities yields the role's family and leading with the overridden size and weight.                                                                                                                                 | `<p data-ui="text-lg" style="--font-size: var(--font-size-xl); --font-weight: 500">`.                                                                                                                                                | Computed `font-family`, `line-height`, `font-size`, `font-weight`.                                                                                                                                                                |
| 13  | `oklch(from var(--bg) l c h / calc(alpha * var(--bg-alpha, 1)))` renders in all three engines, including when `--bg` is a `light-dark()` value.                                                                                                                                           | Two swatches.                                                                                                                                                                                                                        | Correct color and alpha.                                                                                                                                                                                                          |
| 14  | Selector inventory: report the number of rules whose selector contains `[style*=` and the number of `[style*=` substrings in total for the generated utilities layer.                                                                                                                     | Generate the file (a script is acceptable), count both.                                                                                                                                                                              | Two numbers; no cap. Claims 15 and 16 are the budget. Measured 2026-09-30 (`scripts/budget.test.ts`): 40 files, 349 rules, 298 gated on `[style*=`, 2,405 `[style*=` substrings.                                                  |
| 15  | Byte budget: the generated `_properties.css` plus utilities compress to under 10 KB with Brotli; report raw and registration count too.                                                                                                                                                   | `brotli -c file \| wc -c`.                                                                                                                                                                                                           | Numbers. Waived 2026-09-30: raw 295,595 B, Brotli 13,238 B against 1,945 registrations; the test ratchets at 16 KB (15,036 B Brotli and 2,211 registrations on 2026-10-01, after the no-base allowlist and the border shorthand). |
| 16  | Per-frame cost: 50 elements whose `style` attribute is rewritten every animation frame (jQuery `.animate()` or a `requestAnimationFrame` loop), on a page with the full utilities layer, stay under 1 ms of style work per frame in Chrome.                                               | Performance panel, "Recalculate Style" per frame; repeat with 0.4's `_utilities.css`.                                                                                                                                                | Both numbers. Manual: `examples/spec/per-frame.html` (Performance panel).                                                                                                                                                         |
| 17  | `[data-ui~="button"]` selectors cost no more than `.ui-button` did.                                                                                                                                                                                                                       | Same page, 500 buttons, identity swapped.                                                                                                                                                                                            | Recalc numbers for both. Manual: the identity swap on `examples/spec/per-frame.html`.                                                                                                                                             |
| 18  | ~1,500 `@property` registrations add no measurable recalc cost.                                                                                                                                                                                                                           | The claim 16 page with and without `_properties.css`.                                                                                                                                                                                | Difference under measurement noise. Manual: `examples/spec/per-frame.html?no-utilities` removes the registrations.                                                                                                                |
| 19  | `@media (hover: hover)` around hover setters leaves touch emulation without sticky hover.                                                                                                                                                                                                 | Chrome touch emulation, tap a `--opacity--hover` element.                                                                                                                                                                            | Opacity unchanged after tap.                                                                                                                                                                                                      |
| 20  | Prettier and the repo formatter leave `style="--p: 4; --w--md: fit-content"` in a form the gates still match.                                                                                                                                                                             | Format an example, diff.                                                                                                                                                                                                             | Colon directly after the name survives.                                                                                                                                                                                           |
| 21  | VS Code completes utility names inside a `style` attribute from a CSS custom-data file that lists `--` names, and completes `data-ui` tokens and `data-<name>-*` values from HTML custom data.                                                                                            | Author both files, open an example.                                                                                                                                                                                                  | Report which of the four completions work. Files: `packages/core/editor/zazz.{html,css}-data.json` (`vp run generate`), wired in `.vscode/settings.json`; the `style=""` completion of `--` names is checked by hand in VS Code.  |
| 22  | No-base rules: `--display: grid; --grid-cols--md: 3` on a `<div>` is one column below md and three above; `--display--md: none` alone does nothing and the debug tool names the element; `--grid-cols--md: 3` inline on a `<ui-layout>` leaves its bands intact below md.                 | Three elements, resize across 768 px.                                                                                                                                                                                                | As stated.                                                                                                                                                                                                                        |
| 23  | §6 keyword switch: `--w: 100%; --w--md: auto` is `auto` at md and `100%` below; `--w: 100%; --w--md: fit-content` likewise; `--overflow: auto; --w: 4` is `4 × --spacing` wide; `--w: fit-content; --h: 4` leaves `block-size` unset and the debug tool flags the number.                 | Four elements.                                                                                                                                                                                                                       | As stated.                                                                                                                                                                                                                        |
| 24  | The style guard restores utilities after `el.setAttribute('style', 'display:none')` and after `el.style.cssText = 'color: red'`; leaves `el.style.removeProperty('--p')` alone; skips `data-ui-guard="off"`; does not loop with a `requestAnimationFrame` writer.                         | Five elements, guard on.                                                                                                                                                                                                             | As stated; frame rate unchanged.                                                                                                                                                                                                  |
| 25  | `<ui-debug>` on an unlisted domain removes itself and logs the documented warning once; with `data-debug-warnings="false"` it logs nothing.                                                                                                                                               | Two pages.                                                                                                                                                                                                                           | As stated.                                                                                                                                                                                                                        |
| 26  | A variant does not cascade into a nested same primitive; an inline hook does.                                                                                                                                                                                                             | `<div data-ui="card" data-card-variant="muted"><div data-ui="card">` and `<div data-ui="card" style="--ui-card-bg: red"><div data-ui="card">`.                                                                                       | Inner card default in the first; red in the second.                                                                                                                                                                               |
| 27  | An inline utility on a primitive flattens that property across states, and the debug tool says so; an inline hook keeps the states.                                                                                                                                                       | `<button data-ui="button" style="--bg: var(--color-secondary)">` and `<button data-ui="button" style="--ui-button-bg: var(--color-secondary)">`, hovered.                                                                            | First: same color at rest and hover, one warning. Second: hover hook applies.                                                                                                                                                     |
| 28  | A focus ring survives `--shadow` and `--ring` utilities on a primitive.                                                                                                                                                                                                                   | `<button data-ui="button" style="--shadow: 0 4px 8px #0003">`, focused via keyboard.                                                                                                                                                 | Ring visible above the shadow.                                                                                                                                                                                                    |
| 29  | A third-party attribute of the Zazz shape on an element without the identity matches no Zazz rule and is ignored by the parser.                                                                                                                                                           | `<div data-carousel-item data-carousel-loop="true">` on a page with the carousel loaded.                                                                                                                                             | No style, no options parsed.                                                                                                                                                                                                      |
| 30  | `aria-expanded="true"` triggers the `open` tier.                                                                                                                                                                                                                                          | A popover trigger with `--bg--open: …` toggled.                                                                                                                                                                                      | Background changes with the attribute.                                                                                                                                                                                            |

## 15. Exclusions and known costs

- Strict CSP (`style-src` without `unsafe-inline`) blocks the `style` attribute and with it every utility. Out of scope for 0.5.0; the CSS-file path is hooks for primitives and real properties for everything else.
- Rich-text sanitizers that strip `style` strip utilities; `data-ui="prose"` covers CMS content.
- `body` cannot use responsive utilities (§8).
- Outside the §3 allowlist and a primitive's hook list, a tier without a base value does nothing. The debug tool catches it in development.
- Utilities cost more characters than classes for numeric values; primitives carrying hook defaults offset most of it. DevTools' `element.style` pane toggles each utility individually, which is the class-toggle workflow by another name.

## 16. Delivery

- 0.5.0, breaking under the 0.x contract (ADR-0010). No 0.4.2, no codemod; the changelog carries before/after tables per family and the hook rename table.
- Files: `src/base/_properties.css` (registrations, generated, split per tier as `_properties-<tier>.css`), `src/base/_utilities-tier-<name>.css` (one setter file per tier), `src/base/_utilities-<family>.css` (emissions per family), `src/base/style-guard.ts`, `src/primitives/layout/`, `src/primitives/scroll-fade/`, `src/primitives/debug/`, typography roles in `_typography.css`, editor custom data under `packages/core/editor/`.
- Distribution: `dist/zazz.css` and `dist/zazz.js` unchanged; à la carte CSS via jsDelivr `/combine/` over `src/` paths emitted by `buildHead`; JS via the existing per-file import map. No `dist/` split.
- Order of work: tokens (`--space-*`, `--color-*` roles, `--breakpoint-*`, hook rename) → generator for `_properties.css` and the tiers → emissions per family → primitives → layout, typography, scroll-fade, debug, guard → examples and docs → measure against claims 14–18.
- **À la carte utilities**: tiers and families are separate files by construction. Omitting a tier file leaves its layer variables unset, so every chain still falls through correctly; omitting a family file drops its emissions. The default bundle includes everything; `buildHead` and the CLI accept a list of families and tiers to trim it, and the debug tool can report which tiers and families a page actually uses.

## 17. Navigation

ADR-0014. `navigation.js` intercepts a same-origin navigation only when the current `<html>` carries `data-ui-navigation="swap"`; it fetches the destination and, if that page carries the attribute too, swaps in place, otherwise hands the navigation back to the browser.

- **What swaps**: the `<body>` (children and attributes) and `document.title`. Nothing outside the body changes; `<head>` differences between pages need a full load.
- **What persists**: elements with `data-ui-persist="<id>"` present in both pages. The live element replaces the destination's element with the same id (`moveBefore()` where supported, else a plain move). Ids are unique per page.
- **Never intercepted**: reloads (`navigationType === "reload"`), hash changes, downloads, form submissions, cross-origin navigations, and navigations the browser marks as not interceptable.
- **After a swap**: refresh hooks run on the new body (`refreshAll`), and focus moves to the first `h1` in `<main>`, else to `<main>`, else to the body.
- **Without the opt-in**: native navigation, animated by `@view-transition { navigation: auto }` from `_view-transitions.css`.
- **Debug** (`<ui-debug>`, §13): on a swap page, an info line lists the persisted elements; warnings for a `data-ui-persist` without an id, a duplicate id, a persisted element inside another, and `data-ui-persist` on a page without the opt-in.
