# Props replace utility classes; primitives read props with hook fallback

> Terminology, 2026-10-01: "props" are now called **style utilities** ("style utils"); see CONTEXT.md. The decision below is unchanged.

Status: accepted (2026-09-25). Supersedes [ADR-0008](./0008-instance-override-escape-hatch.md).

The utilities layer of class-per-value rules is removed. Values are carried by **props**: custom properties set in an element's `style` attribute (`--p: 4`, `--w--md: fit-content`, `--opacity--hover: .65`) and read by one attribute-gated rule per prop. Primitives read the same props, falling back to a `:root` hook, so a variant, an inline override, and global theming all go through one vocabulary. Ships as `@zazz-ui/core` 0.5.0 (breaking under the ADR-0010 0.x contract); no 0.4.2 deprecation release.

## Context

- `_utilities.css` is 160 KB of a 304 KB `dist/zazz.css` and 1,370 rule blocks, enumerating every scale step per property per breakpoint. Named steps (`gap-sm`) were an attempt to keep it small; it grew anyway.
- The target audience is legacy systems: server-templated values (`style="--grid-cols: <%=N%>"`), customer JavaScript that rewrites class lists, and no build step. A class utility cannot take an arbitrary value under a breakpoint or a state without a build; a prop can.
- ADR-0008 rejected blanket inline hook variables because inline `style` already beats every layer for a same-element raw property. That reasoning holds for raw properties and does not hold for props: a prop adds scale-number resolution, breakpoint / state / pseudo-element modifiers, and a value that primitives can read. Inline styles remain a bad idea; inline props are a different thing.

## Decision

**Three channels.** Identity and presets are attributes (ADR-0013); values are props. No utility classes remain. Compound utilities sort into three buckets: several properties that move together with one value become a prop (`--size`, `--line-clamp`, `--ring`, `--aspect`, `--flex`, `--inset`); a fixed rule set with no value becomes a switch (`data-ui="sr-only"`); a fixed rule set with an axis or size becomes a small primitive (`data-ui="scroll-fade" data-ui-axis="y"`).

**Prop rules.** In `@layer zazz.utilities`, one rule per prop, gated on the attribute string with the colon included so `--p:` never matches `--px:` or `--p--md:`, wrapped in `:where()` for zero specificity: `:where([style*="--p:"]) { … }`. Props are inline-only by construction: a stylesheet that sets `--p` fires nothing. Absent means zero, never no-op, so **every rule is self-contained**: its own gate, its own private pair, its own property declaration. Gates are never shared or widened; state rules are never nested under the base rule, and they come last in source order (base, pseudo-elements, breakpoints, states) so a state beats a breakpoint for the same prop, matching Tailwind's outcome. Hover rules sit in `@media (hover: hover)`.

**Naming.** Tailwind's short name where Tailwind has one distinct from the CSS property (`--p`, `--w`, `--bg`, `--leading`, `--tracking`, `--rounded`, `--col`, `--size`); otherwise the CSS property name (`--display`, `--color`, `--font-weight`, `--opacity`). Text color is `--color`; font size and family go through `--font` (the `font` shorthand) with `--text-*` composite tokens on top of the atomic `--font-size-*`, `--leading-*`, `--tracking-*` tokens. **A prop name must never equal an inheriting token name**: there is no `--border` shorthand prop (only `--border-width`, `--border-color`, `--border-style`), and props reference colors through the `--color-*` aliases, never the bare Shadcn names, so neither a cycle nor an inheritance leak is possible.

**Dual-mode spacing.** Spacing props accept a scale number or a length in one slot via a per-prop registered pair: `--_p-len` (`<length-percentage>`, initial `0px`) and `--_p-num` (`<number>`, initial `0`); whichever parses survives, the other falls to its initial value. Pairs are per prop, never shared, because custom properties compute once per element. The unit is fluid: `--spacing: var(--spacing-interval)`; consumers pin it with one declaration. Sizing and margin props are raw-only (they accept keywords).

**Registration.** Base props are registered `@property { syntax: "*"; inherits: false; }`. Modifier names are never registered: a modifier is only read by the rule gated on its own attribute on the same element, so its gate is its isolation. Pseudo-element props (`--*--before`, `--*--after`) are left unregistered because `::before` must inherit them from its host.

**Modifiers.** Four states (`hover`, `active`, `focus-visible`, `disabled`), two pseudo-elements (`before`, `after`), seven breakpoints. Partitioned, no stacking: breakpoints apply to layout, spacing, sizing, and typography props; states to color, opacity, border, transform, and shadow props; pseudo-elements to sizing, color, content, and radius. Stacking (`--p--md--hover`) is additive and deferred.

**Breakpoints.** Seven, `2xs` through `2xl`, shared by container flags, viewport flags, and layout bands. Thresholds: 24, 30, 40, 48, 64, 80, 96 rem. Tailwind v4's five steps are kept exactly for the names they share (`sm`–`2xl`); `xs` at 30 rem (480 px) is the common phone-landscape step, and `2xs` at 24 rem (384 px) separates small phones from the 390–430 px majority. Container flags are `--cqi-*`, registered `syntax: "true | false"; inherits: true`, set **once on `body`** by `@container html (width >= …)` with `html { container-type: inline-size }`; descendants inherit the flag and style-query their parent. Viewport flags are `--vi-*` via `@media` on `:root`. Consequence: `body` itself cannot use responsive props.

**Primitives read props.** Every prop-exposed declaration in a primitive reads the prop with the hook as fallback: `--_px-len: var(--px, var(--ui-button-px))`. Hooks are renamed to mirror props, `--ui-{primitive}-{prop}` with the same modifier grammar (`--ui-button-bg--hover`). Each primitive exposes exactly the props that correspond to its existing hooks (the 2026-08 audit), then audited for edge cases, naming drift, and missing props or attributes. **Variants set props; only `:root` theming writes hooks.** Primitives never carry utility markup internally.

**Typography roles** are `data-ui-text` (`h1`–`h6`, `display`, `eyebrow`, `lead`, `xs`–`xl`); native headings get their role in the reset. Roles carry what `font` cannot (tracking, case, balance, optical sizing); props override one property at a time.

**Layout** becomes a primitive with both forms (`<section data-ui="layout">`, `<ui-layout>`) that grids its own children; nothing hoists to a parent. Band lines are named `[md-start] … [md-end]` so a child writes `--col: md` (raw `grid-column`; also `--col: bleed`, `--col: span 2`, `--col--lg: xl`). Default band is `lg`, changed per layout with `data-ui-size`. Nested layouts use `grid-template-columns: subgrid` and inherit the band lines.

**Distribution.** `/combine/` over `src/` paths is the à la carte CSS grain, emitted by `buildHead`; no `dist/` split (ADR-0005 stands). Combine is CSS-only; JS stays `dist/zazz.js` or per-file with the import map. No codemod ships with 0.5.0.

## Considered options

- **Coexist** (props beside classes): rejected; doubles the vocabulary and keeps the 160 KB.
- **Full modifier matrix with stacking** (40 props × 7 breakpoints × 4 states): about 1,280 rules and 115–180 KB raw, more than today. The partition (~330 rules, ~28 KB raw) is the size lever.
- **Nested state rules with fallback chains** (`var(--p--hover, var(--p))`): fewer selectors, but unregistered modifiers then inherit from ancestors, forcing registration of every variant (~60 KB).
- **A universal prop reader** (`:where(*) { padding: … }`): zeroes every primitive's padding, since absent means zero.
- **Stylesheet-authored props** via a second trigger attribute: rejected; props are a markup channel, stylesheets have the real property.
- **Bare flag names** (`--md`): rejected as generic inheriting names that any theme could clobber.
- **A compat class file for strict CSP**: rejected; it keeps alive the thing being removed. The CSP path, when needed, is a `data-ui-style` shim that copies into `el.style` via CSSOM (not blocked by `style-src`).

## Consequences

- **Excluded for now**: strict-CSP static HTML (the `style` attribute is blocked outright) and CMS sanitizers that strip `style`. Recorded, not solved.
- Raw sizes before and after: utilities 160 KB → ~28 KB; the monolith roughly halves, since primitives are 257 KB raw. The 80 %+ figure exists only in the à la carte grain.
- Rewrite of most of the 35 primitives, `_layout.css`, `_typography.css`, every example fragment, and the docs' utilities pages.
- Kit `data-*` config prefixes and attribute keys change per ADR-0013.
- **Open verification items** (mechanics, not the decision): dual-mode pair and `::before` inheritance in Safari; a style-recalc benchmark on one heavy legacy page (thousands of rows with `style` attributes); registration and rule byte counts once the prop list is final.
- `if()`, typed `attr()`, and `@function` will simplify the gating and dual-mode machinery when they reach the browser floor; the prop names and modifier grammar are designed to survive that swap unchanged.

## Amendment (2026-09-28): validation pass

An independent validation of `SPEC.md` refuted three mechanics and exposed contract gaps. The decision stands; the mechanics change as follows.

- **Primitives read hooks, never props.** §"Primitives read props" is withdrawn. A primitive reads only its `--ui-{primitive}-{prop}` hooks, for base values and for states (`--ui-card-bg--hover`). Variants set hooks on the element; `:root` theming sets them globally; nothing else writes them. Hooks are declared in the primitive's own file in `@layer variables { :root { … } }`, except theme tokens (`--color-*`) and reset defaults, which live in `_variables.css`. Inline props reach a primitive only through the utilities layer, which wins by layer order. Consequences: a prop written in a stylesheet does nothing anywhere (one mental model); primitives never read a modifier prop, so the inheritance leak the review found cannot occur; the CSP and BEM fallback is "set hooks in a CSS file". Hooks inherit, so a variant on a menu cascades into nested submenus; that is accepted as a feature.
- **Utilities are layer variables plus one emission per prop.** "Every rule is self-contained" is withdrawn in favor of two rule kinds. _Setter_ rules, one per modifier tier rather than per prop, are gated generically (`[style*="--md:"]`) and copy every prop's modifier into a registered, non-inheriting layer variable (`--_w-md: var(--w--md)`); a copy of an absent prop is guaranteed-invalid. _Emission_ rules, one per prop, gated on the base (`[style*="--w:"]`), read a fixed precedence chain across the layer variables and fall through invalid tiers. Modifier props are registered `inherits: false` because generic setters read them. This keeps the `style`-bucket selector count near 115 instead of 570 and makes stacking a pure addition. The cost is the rule **a modifier needs a base value on the same element**; for a primitive the hook is the base.
- **Stacking is a pure addition, deferred.** Breakpoints and states ship independent in 0.5.0. Breakpoint × state (`--bg--md--hover`) costs roughly 1,000 more registrations and is added when a page needs it.
- **Grammar gains contexts and pseudo-elements as reserved leading words**: `--[group-][before-|after-]<prop>[--<breakpoint>][--<state>]`. A backslash separator was evaluated and rejected: `\` is the CSS escape character in the `style` attribute as in a stylesheet, so `--before\bg` parses to `--before` + U+000B + `g`. Reserved names: every state, breakpoint, pseudo-element, and context word, and `ui`.
- **Seven states**: `hover`, `active`, `focus-visible`, `focus-within`, `disabled` (also `[aria-disabled="true"]`), `open` (also `[open]`, `:popover-open`), `checked` (also `[aria-checked="true"]`). Group context is `data-ui="group"` on an ancestor. Hover rules sit in `@media (hover: hover)`.
- **Margin and sizing are dual-mode.** Keywords (`auto`, `fit-content`, `min-content`, `max-content`) cannot pass the typed pair, so an element whose `style` contains a sizing keyword in value form switches that family to a raw emission at every tier. On such an element sizing numbers must be lengths; the debug tool flags a number there. Rejected: value-gated rules per prop, tier, and keyword (about 280 selectors) and raw-only margin and sizing.
- **`--grid-cols` is an integer** (`repeat(n, minmax(0, 1fr))`); `--grid-template-cols` is raw; `--grid-fit: 12rem` restores the 0.4 auto-fit behavior.
- **Typography**: roles are identity tokens (`data-ui="text-xl"`, `data-ui="text-h2"`), see ADR-0013. The `--font` shorthand prop is withdrawn; `--text` is font size (Tailwind's name, free because color is `--color`), beside `--leading`, `--tracking`, `--font-weight`, `--font-family`.
- **Composition**: `--ring`, `--ring-color`, `--ring-offset`, `--ring-offset-color`, and `--shadow` compose into one `box-shadow` list with transparent placeholders. Longhands come after shorthands within every tier. Layout band lines are `[layout-md-start]`, since a `<custom-ident>` cannot start with a digit; a child writes `--col: layout-md`.
- **Developer feedback**: editor custom data for attributes, values, and prop names, plus `<ui-debug>`, an HTML web component enabled per domain (`data-debug-domains`) that walks `[style*="--"]` once and warns on unknown props, wrong mode, missing base values, modifiers on families that have none, and raw properties shadowing props. An optional style guard (`MutationObserver` on `style`, re-applying dropped `--` declarations) is a separate production file.
- **Size budget replaced**: the target is about 115 selectors in the `style` bucket and a Brotli size under 10 KB; raw size is dominated by `@property` registrations (~1,500) and is not a target. Per-frame `style` mutation cost on animated elements is the performance claim that matters, not full recalc.

## Amendment 2 (2026-09-28): second validation pass

- **Primitives read the layer-variable chain, terminated by a variant private and then the hook** (`var(--_bg-hover, var(--_bg, var(--_card-bg--hover, var(--ui-card-bg--hover))))`). Amendment 1's "primitives read hooks only" is withdrawn: it left an inline prop flattening every state of a primitive by layer order, erased focus rings under `--shadow`, and made the promise "`--px--md: 6` alone on a button works" false, since a hook never creates a `style` gate. The utilities base rule now also copies the base prop into a base layer variable (`--_px: var(--px)`), so props stay inline-only while primitives pick up tiers with no base. A prop still flattens that property across states, by design, on primitives and plain elements alike; the debug tool warns.
- **Hooks are subtree theming**: set on `:root`, on any subtree selector, or inline on a primitive; they inherit, so an inline hook on a card themes nested cards. **Variants write registered non-inheriting privates** (`--_card-bg`) read ahead of the hook, so a variant never cascades into a nested same primitive; on one element a variant beats an inline hook.
- **Focus rings** are published by primitives into a shared non-inheriting `--_focus-ring` that every `box-shadow` emission includes first.
- **No-base emissions** for an allowlist of props whose CSS initial value is the natural value on a plain element (`grid-cols`, `grid-rows`, `grid-flow`, `auto-cols`, `auto-rows`, `items`, `justify`, `place`, `flex`, `basis`, `order`, `col`, `row`, `gap`, `text-align`, `text-wrap`): gated on any tier, chain ends in that value as a literal, primitives excluded. `--display: grid; --grid-cols--md: 3` works. `--display` keeps the base requirement (its initial `inline` is wrong for a div). `revert-layer` through a `var()` fallback was rejected as unverified and contrary to the kit's recorded gotcha.
- **Keyword gates are exact, per prop and per tier** (`--w: auto`, `--w--md: auto`, …): about 280 substrings in four `:is()` lists, measured by the per-frame claim; a reduced list is the written fallback. The earlier `w: auto` form matched `--overflow: auto` and missed tiers.
- Selector count is reported, not capped; Brotli size and per-frame cost are the budget. Tiers and families ship as separate files so a page can include only what it uses.
- `open` also matches `[aria-expanded="true"]`. Named groups (`data-group-name`, `--group-<name>-<prop>`) are reserved, not implemented. The style guard restores props only when a write drops all of them at once, and `data-ui-guard="off"` opts out.

## Amendment 3 (2026-09-29): implementation findings

- **`--ring` stays the shadcn theme input.** The `ring` prop registers `--ring` non-inheriting, so the kit reads the ring through inheriting aliases (`--color-ring`, `--ring-shadow-color`, `--ring-offset-shadow-color`) and themes keep setting `--ring` on `:root`. `--ring-color` and `--ring-offset-color` are no longer tokens.
- **Generated private names are reserved.** `--_<prop>` is the utilities layer's base private for every prop; hand-written stylesheets rename any local that collides (`--_ring` → `--_ring-fill`) and a static test enforces it.
- **Primitives read theme colors through `--color-*`**, never bare Shadcn roles, enforced by a static test; the bare roles remain the theme input.
