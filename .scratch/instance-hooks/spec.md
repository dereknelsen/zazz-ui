# Instance-hooks audit

Status: in progress (2026-08-25)

Full sweep of `packages/ui/src/primitives/<name>/<name>.css` for missing per-instance
override hooks, per ADR-0008 (`docs/adr/0008-instance-override-escape-hatch.md`).

## The rule

Blanket per-property hook variables are rejected: inline `style=""` beats every `@layer`,
so a same-element hook adds nothing. A new public `--ui-*` hook is added **only** when
all four hold:

- **(a) Out of reach** — inline style on the root cannot set the declaration
  (pseudo/vendor shadow part, descendant slot, or state-conditional).
- **(b) Design value** — size, color, spacing, radius, shadow, duration; not structural
  plumbing.
- **(c) No existing fan-out** — no current token already reaches the declaration.
- **(d) Demand proof** — a concrete use case cited in an example fragment or docs page.

The sanctioned per-instance ladder (CONVENTIONS.styles.md §5): utility class →
public `--ui-*` token inline → raw `style=""` same-element one-off → own CSS file.

## Method

1. Demand signals first: every `style=""` in `primitives/**/*.html` and docs usage that
   restates a raw property, works around a missing knob, or double-declares next to a
   hook.
2. For each signal, apply (a)–(c). Only signals passing all four produce a hook.
3. Hooks are declared on `:root` in `@layer variables`, default to the current
   literal/global token (pixel-identical rendering), named per §5, `@tokens` updated.
4. One issue file per primitive **only where a gap was found**; primitives with no gaps
   are recorded below and get no issue file.

## Demand-signal inventory (post example-sweep)

| Location                                                 | Signal                                                                                        | Verdict                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| `navigation-menu/navigation-menu-icon-grid.html` popover | sets `--ui-popover-inline-size` AND restates `inline-size: var(--ui-popover-inline-size)` raw | see `issues/01-navigation-menu.md` |
| `navigation-menu/navigation-menu-simple.html:74`         | `--ui-popover-inline-size: max-content`                                                       | rung 2 working as designed         |
| `navigation-menu/navigation-menu-simple.html:91`         | `max-inline-size: 16ch` on a link label span                                                  | rung 3 — same-element, fails (a)   |
| `toolbar/toolbar.html:29`                                | `--ui-select-inline-size: auto`                                                               | rung 2 working as designed         |
| `toolbar/toolbar.html:43`                                | `max-inline-size: 16ch`                                                                       | rung 3 — same-element, fails (a)   |
| `otp/otp.html:1`                                         | `max-inline-size: max-content` on wrapper                                                     | rung 3 — same-element, fails (a)   |
| `menubar/menubar-help-search.html:49`                    | `min-inline-size: 20rem` on panel content wrapper                                             | rung 3 — same-element, fails (a)   |

## Sweep results

**No gaps found across all 44 primitives** (2026-08-25). One issue file:
`issues/01-navigation-menu.md` — investigated and resolved as no-change.

Method executed:

1. Demand signals: every `style=""` in `primitives/**/*.html` (table above) plus
   `apps/docs/content/**` — the docs' five inline styles are all rung-2 exemplars
   setting public tokens (`--ui-button-background`, `--ui-badge-*`, `--ring-color`,
   `--card`); zero raw-property workarounds. No signal passes test (a).
2. Literal-value scan of all `primitives/*/*.css`: design-value properties with
   non-`var()` values produced 17 hits, all structural/guard values —
   `anchor-size(width)` trigger-matching contracts (autocomplete, combobox, select),
   the OTP iOS zoom guard (`font-size: max(16px, 1em)`) and caret plumbing (1px),
   fullscreen geometry (`100svh`/`100vi` in lightbox, mobile-menu, dialog),
   `separator`'s `min-block-size: 1lh`. Each fails (b) and (d).
3. Hardcoded-color scan (`#hex`, bare `oklch()/rgb()/hsl()` outside `var()`): zero hits.

Conclusion: the existing `--ui-*` fan-out already reaches every out-of-reach design
value. The correctly-scoped hook set plus the ADR-0008 ladder covers instance styling;
no speculative hooks added.
