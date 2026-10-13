# Tier-only utilities live in a `defaults` layer below the components

Status: accepted (2026-10-13). Amends ADR-0012 (no-base emissions excluded primitives by selector) and the cascade order in `base/_layers.css`.

## Context

- A tier alone (`--px--md: 8` with no `--px`) works on the utilities whose CSS initial value is the natural value on a plain element (the no-base allowlist, SPEC §3). The rule that makes it work ends its chain in that literal, so below the tier it writes the literal: `padding-inline: 0`.
- That rule sat in `ui.utilities`, the highest kit layer, so it beat every primitive and every base rule. To stop it wiping a primitive's own value at rest, it excluded elements by selector: every primitive root, plus a hand-kept `noBaseExclude` list per utility (a prose list's indent, inline code, form controls, a layout's children, the parts that set their own anchor, popovers).
- The lists were never complete. An audit in 2026-10 found tier-only padding and paint wiping the rest value on popovers, menu popovers, tooltip content, `kbd`, checkboxes, switches, and the combobox control. Deriving the exclusions from every kit rule that sets each property fixed the behavior, but every no-base rule then carried its own `:not()` list and the generated layer grew from 21.4 KB to 23.9 KB with Brotli.
- What the exclusions approximated is a cascade question: does another rule set this property on this element? Layers answer that without selectors.

## Decision

- **A new top-level layer, `defaults`, between `reset` and `vendors`:** `@layer variables, reset, defaults, vendors, legacy, ui, overrides`. The generated `base/_defaults.css` holds every rule gated on a tier alone: the no-base rules, their keyword tier rules (`--grid-cols--md: subgrid`), and the ring and shadow composite's tier copy. Rules gated on a base stay in `ui.utilities`, so a base still beats everything below `overrides`.
- **Above `reset`:** the reset zeroes padding and normalizes elements with `:where(*)`, and a tier alone has to beat that on a plain element.
- **Below every component, vendor, and legacy layer:** any of those that sets the property wins, so the element keeps its own value at rest. Where that rule reads the utility's resolver (a button's `padding-inline: … var(--_px-resolved, …)`), the tier still applies through it.
- **What sits below and styles on purpose is skipped by selector.** A reset rule whose value is not the utility's own literal (inline code's padding, `flex-shrink: 0` on `hr`, `sub`'s `position: relative`), or that is `inherit` on an inherited property (a button's `text-align`), is listed in the rule's `:not()`. A reset rule that writes the literal, `initial`, or `inherit` / `unset` on a property that does not inherit (`* { padding: 0 }`, a link's `text-decoration: inherit`) is what the layer exists to beat. The browser's own stylesheet sits below too; the generator carries a short list of what it styles on purpose (a modal `dialog`'s `position: fixed`).
- **A longhand tier beside its shorthand's base** (`--p: 4; --px--md: 1`) gets its own rule in `ui.utilities`, gated on both, since the shorthand's base would otherwise beat the tier-only rule. A dual longhand falls back to the shorthand's value below the tier. `--basis` and `--shrink` under `--flex` cannot read a part of the shorthand, so their rule sits inside each breakpoint's query and declares nothing below the tier, leaving the shorthand's part in place.
- **The audit reads the same facts.** The generator writes `base/kit-styling.ts` (and the `selectors`, `reads`, and `blocks` fields of `editor/zazz.lint-data.json`, each selector stored once): for each utility, the elements a kit rule reads it on, and for each tier-only utility (the no-base ones and the box-shadow composite), the elements a rule above `defaults` sets its property on at rest, plus the skips. `tier-without-base` fires where a tier alone does nothing: a tier-only utility on an element in `blocks` and not in `reads`, or any other utility not in `reads`. A rule that applies only in a state (a disabled button's opacity) does not count as blocking at rest. A shorthand's base counts as the base for its longhand's tier.

## Considered options

- **Per-utility `:not()` lists in `ui.utilities`, derived from the stylesheets:** correct, but 2.5 KB of Brotli on every page and a selector list that grows with each primitive.
- **Lists only for the visible cases (padding, paint, the composite):** smaller, but it leaves known wrong cases and keeps the hand-kept lists.
- **Below `reset`:** no exclusions at all, but the reset's universal zeroing would beat every tier-only rule, so a tier alone would never apply.

## Consequences

- **Breaking (0.x minor).** The layer order in `base/_layers.css` changes; a project that declares its own order must add `defaults` after `reset`. `noBaseExclude` is gone from the utility table.
- A tier alone now works on a primitive root that does not set the property at rest (`--opacity--hover` on a card or a button, `--items--md` on a vertical field), and needs a base on any element a primitive styles without reading the utility (`--bg--md` on a popover). Vendor and legacy CSS win over a tier alone the same way, which is what `zazz-legacy-baseline` wants.
- The skips cover the kit's reset and the browser styling listed in the generator. Other user-agent styling (a `th`'s centered text) is beaten by a tier alone, as it was before.
- The generated layer is 21.6 KB with Brotli. Its `[style*=]` substring count holds at 1,300 (1,294 before): a tier-only rule's gate no longer also tests for the base (`[style*="--px:"]`), and the shorthand-tier rules spend about as many as that saves.
- Verified by `base/no-base.browser.test.ts` (rest values kept on popovers, menu popovers, `kbd`, checkboxes, `hr`, a plain button's inherited alignment, a modal dialog; a tier alone applying where the kit reads it; a longhand tier beside its shorthand's base) and by the audit tests in core and the language server.
