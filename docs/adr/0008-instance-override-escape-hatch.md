# Instance one-offs use the escape-hatch ladder; no blanket private hook variables

Per-instance styling (this one command palette is `24rem` wide) is served by a sanctioned
ladder, in priority order:

1. **Utility class** — when a scale value fits (`class="w-full max-w-xl"`).
2. **Public `--ui-*` token, set inline** — when the value lands somewhere inline style
   can't reach (`style="--ui-popover-inline-size: max-content"`).
3. **Raw inline style** — for a true same-element one-off
   (`style="max-inline-size: 16ch"`). Legitimate, not a smell.
4. **A CSS file** — the moment the one-off repeats.

We do **not** add blanket per-property hook variables
(`max-inline-size: var(--_max-inline-size, 100%)`) to primitives.

## Context

The CDN delivery (ADR-0005) serves zero-build consumers: no Tailwind JIT, no
arbitrary-value utility generation. That raised the question of what mechanism to bless
for one-off instance values, and a proposal to give every primitive a set of private
`--_*` hook variables settable from the `style` attribute — so all overrides would flow
through low-level, "non-destructive" variables.

## Decision

Bless the ladder above and reject blanket hooks, on two facts:

- **The cascade already solves the same-element case.** Inline `style` declarations beat
  every `@layer` in the stack (`variables` through `migrations`), and no primitive fights
  overridable properties with `!important`. A same-element hook variable therefore adds
  zero capability over writing the property directly in `style=""` — it is pure cost
  (more tokens per file, a second vocabulary to teach). Hook variables earn their keep
  only where inline style **cannot reach**: pseudo-elements and vendor shadow parts (the
  meter fill), descendant slots (`--ui-popover-inline-size` set on a root, read on the
  panel), and state or multi-declaration fan-out (`--ui-button-background--hover`, the
  meter → progress geometry family). That is exactly where the existing `--ui-*` hooks
  already sit.
- **`--_` is private, and stays private.** `CONVENTIONS.styles.md` §5 draws a
  load-bearing line: anything an app may set is a public `--ui-{component}-*` hook
  declared on `:root` in `@layer variables`; `--_*` is plumbing apps never touch, and it
  trends toward non-inheriting `@property` registration — a silent killer for hooks read
  on descendants. Instance-level inline overrides of **public** tokens are already a
  documented surface (§5, override surface #3). Consumer-facing `--_*` would convert
  private names into public API.

New public hooks are added only under the four-part test (all required):

- **(a) Out of reach** — inline style on the root cannot set the declaration (it lands on
  a pseudo/vendor shadow part or a descendant slot, or is state-conditional).
- **(b) Design value** — size, color, spacing, radius, shadow, duration; not structural
  plumbing (display, position, overflow, internal calc machinery).
- **(c) No existing fan-out** — no current token already reaches the declaration.
- **(d) Demand proof** — a concrete use case cited in an example fragment or docs page.

A "no gaps found" audit is a valid outcome. The 2026-08 audit lives in
`.scratch/instance-hooks/`.

## Consequences

- Raw `style=""` for same-element one-offs is documented as legitimate — the cascade
  guarantees it is non-destructive to the kit's layers.
- **CSP caveat**: under a strict `style-src` (no `unsafe-inline`/`unsafe-hashes`) the
  `style` attribute is blocked entirely, which kills rungs 2 and 3 **equally** — a custom
  property set inline is the same attribute. The CSP-safe rungs are 1 and 4. Hook
  variables never were a CSP escape.
- `--_*` is never documented to consumers.
- Adding a `--ui-*` hook later is non-breaking; renaming one is breaking once the CDN
  publishes (ADR-0005 makes `src/` public surface). Demand-driven addition therefore
  carries no pre-publish deadline.
- Example fragments must prefer utilities for scale values; a raw `style=""` in an
  example asserts "no matching utility exists" (rung 3) or demonstrates rung 2.
