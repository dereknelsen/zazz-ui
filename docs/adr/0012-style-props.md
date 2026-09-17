# Style props are the mechanism for open values; they amend the ADR-0008 ladder without retiring raw inline style

A **style prop** is a custom property set in the `style` attribute (`style="--px: 4"`) and read by a zero-specificity rule in `@layer zazz.utilities` gated on the attribute text (`:where([style*="--px:"])`). Prop names are Tailwind roots with no prefix; the only suffix is a breakpoint (`--px-md`). Style props amend ADR-0008: its "same-element hook variables add nothing" holds for a hook that maps 1:1 onto one property, and style props are admitted precisely because they do three things raw inline style cannot. Rung 3 (raw inline style) stays legitimate.

## Context

ADR-0008 (2026-08) rejected blanket per-property `--_*` hooks on primitives. Its core argument: inline `style` already beats every layer in the stack, so a same-element variable that maps to one declaration adds zero capability over writing that declaration in `style=""`. That argument was made about primitives and about 1:1 hooks.

The 0.5.0 utilities rework ([/SPEC.md](../../SPEC.md), planning record in `.scratch/style-props/`) then had to answer a different question: what mechanism carries **open** values for zero-build consumers (ADR-0005)? A class scale is finite by construction (`p-md`, `w-full`); Tailwind covers the open end with a JIT that emits `p-[13px]` on demand, which a CDN stylesheet cannot do. 0.4.1 ships no numeric classes at all, so an arbitrary padding, width, column count or color was reachable only through rung 3, and rung 3 loses three things the class utilities give for free: the responsive prefixes (`@md:`), the fluid spacing scale (`--spacing-interval`), and the private coordination vars that make `.gap-*`, `.grid-cols-*` and `.basis-1/N` agree with each other.

The proposal, inline custom properties read by utility rules, looks at first like the hook variable ADR-0008 turned down. It had to be checked against that decision rather than slipped past it.

## Decision

- **Value shape decides the mechanism** (/SPEC.md §1). Finite values are classes (`grid`, `hidden`, `bg-primary`, `p-md`). Open values are style props (`style="--px: 4"`). Variants on primitives are `data-*` attributes. Bundles are primitives. No style prop is added for a value a class already covers, and no numeric class is added for an open value.
- **The mechanism.** Each prop is registered `@property { syntax: "*"; inherits: false }`, and each is read by one rule per breakpoint in `@layer zazz.utilities`: the base rule under `:where([style*="--px:"])`, and the responsive rules under the same gate inside `@container style(--bp-md: true)` for each of `sm md lg xl 2xl`. Spacing props multiply: `--p: 4` becomes `calc(4 * var(--spacing-interval))`. `--gap` also sets `--_gap`; `--grid-cols` sets `--_grid-cols` and implies `display: grid`.
- **Naming.** Prop names are Tailwind roots without a prefix (`--px`, `--gap`, `--grid-cols`, `--w`, `--bg`, `--text`); the suffix is a breakpoint and nothing else (`--px-md`). Not `--ui-` (a prop is not a component hook) and not `--_` (a prop is not private).
- **ADR-0008 is amended, not reversed.** The "adds zero capability" test stands; what changed is its answer for three cases. A style prop is justified only where raw inline style cannot do the job:
  1. **Responsive suffixes.** `--px-md` applies inside `@container style(--bp-md: true)`. The `style` attribute has no conditional form; the same value written raw applies at every width.
  2. **Scale multiplication.** A numeric spacing prop is multiplied by `--spacing-interval`, so the value rides the fluid clamp scale and moves with it when the interval is retuned. Raw inline style would carry a hand-written `calc()` that drifts the day the scale changes.
  3. **Coordination with private vars.** `.basis-1/N` and the `.grid-cols-*` widths subtract `--_gap` and read `--_grid-cols`; those are set by the `.gap-*` and `.grid-cols-*` classes today and by `--gap` and `--grid-cols` from 0.5.0. A raw `gap: 1rem` is invisible to every rule that reads `--_gap`.
- **The ladder gains a rung; rung 3 keeps its place.** In priority order: a utility class when a scale value fits; a style prop when the value is open and a prop exists; a public `--ui-*` token set inline when the value lands where inline style cannot reach; raw inline style for a true same-element one-off; a CSS file the moment the one-off repeats. `CONVENTIONS.styles.md` §5 is updated to this ordering in the same release.
- **Primitives do not read style props.** Their theming surface stays the `--ui-*` tokens and the four-part hook test in ADR-0008. Style props and primitives meet only in the cascade: `zazz.utilities` is ordered after `zazz.components` (`_layers.css`), so `style="--px: 8"` on a `ui-button` root wins over the button's own padding. That is the intended contract, and a computed-style check on a `div` and on a `ui-button` verifies it.

## Why

- **The ADR-0008 argument was about capability, not syntax.** A same-element variable that stands in for one declaration is overhead. A variable that fans out (a breakpoint, a scale, a coordination var) is not; the cascade cannot reproduce that fan-out from a raw declaration. Judged by ADR-0008's own test, style props pass and blanket hooks still fail.
- **The rule count is fixed.** One rule per prop per breakpoint is 44 × 6 = 264 rules, regardless of how many distinct values consumers write. A numeric class scale needs a rule per value per property per breakpoint, and still stops at the scale's edge. This is what makes open values affordable without a build step.
- **The attribute gate is honest and cheap.** `[style*="--px:"]` fires only when the attribute names the prop, so an element with no prop matches no rule: no `var()` fallbacks, no fight between an `initial-value` and the primitive's own declaration. The substring `--px:` does not match `--px-md:` (the colon follows `md`), so base and responsive rules stay independent.
- **`inherits: false` keeps props element-scoped.** A `--gap` set on a container must not surface as `--gap` on its children. Anything that has to travel to descendants goes through the private var the prop sets (`--_gap`, `--_grid-cols`), which stay inheriting on purpose (`_utilities.css`).
- **The names are the Tailwind roots** consumers already know, and they are not the `--ui-*` namespace, so no reader confuses "an open utility value on this element" with "re-skin this component".

## Consequences

- **CSP** is unchanged from rungs 2 and 3: under a strict `style-src` (no `unsafe-inline`/`unsafe-hashes`) the `style` attribute is blocked, and a custom property set inline is the same attribute. Style props are not a CSP workaround. The CSP-safe rungs are classes and CSS files, and the docs get a page that says so.
- The gate matches the attribute's source text, so the contract is `--px:` immediately followed by the colon (`style="--px: 4"`). `element.style.setProperty("--px", "4")` serializes to that form; hand-written `--px : 4` does not match.
- Adding a prop is additive (a patch under ADR-0010); renaming or removing one is breaking. Registered property names are global, so the prop set is a published contract.
- `--_gap` and `--_grid-cols` stay private. A style prop is the public way to set them; consumers never write `--_*`.
- Rung 3 remains documented as legitimate. A raw `style=""` in an example fragment now asserts "no class and no prop fits" or demonstrates a `--ui-*` override.
- Primitives keep reading `--ui-*` tokens only. Any primitive rule that reads a style prop directly is a bug against this ADR.
- **Style prop** is the term (CONTEXT.md); "slot" stays reserved for `data-slot` parts (ADR-0002), and "hook variable" for `--ui-*` theming hooks.
- Not decided here: editor autocomplete for props (`css.customData`) and a typed `attr()` attribute form (`data-px="4"`) once Safari ships it. Both are listed under "Not yet specified" in `.scratch/style-props/spec.md`.
