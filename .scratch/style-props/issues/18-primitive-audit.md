# 18 — Primitive audit: --step-* in component rules → --ui-* per ADR-0008

Type: task
Status: resolved
Blocked by: 17
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/primitives/**/<name>.css (as found)`
- `.scratch/style-props/audit.md`

## Task

For every primitive css: list `var(--step-*)` and literal lengths used directly inside `@layer zazz.components` rules (not in the `:root` token block). For each, apply ADR-0008's four-part test (out of reach / design value / no existing fan-out / demand proof). Promote only passing cases to a `--ui-<name>-*` hook declared on `:root` in `@layer variables` (logical naming per CONVENTIONS §5; additive = non-breaking). Everything else stays; record the reason. Also confirm per primitive that a style prop on the root overrides the component's padding/size (layer order) — spot-check 5 with the page from ticket 17. Write `.scratch/style-props/audit.md` with the table. Do not rename any existing token.

## Answer

Audit: `.scratch/style-props/audit.md`. 161 declarations across 30 primitives (14 primitives have none); the scanner was cross-checked against an `awk` pass over every `var(--step-` outside `@layer variables` and the two agree. One hook added; everything else stays with the failing four-part test recorded per row. No `.html` touched.

**New hook (for ticket 26's "New" list):**

- `autocomplete`: `--ui-autocomplete-option-gap: var(--ui-field-option-gap)` on `:root` in `@layer variables`; `[data-slot~="autocomplete-list"]` and `[data-slot~="autocomplete-group"]` read it instead of a hard `var(--step-px)`. Passes all four: descendant slot (a); spacing (b); no token reached it while the family owner `--ui-field-option-gap` already fans out to combobox, command, menu and select through their `--ui-<name>-option-gap` aliases (c); the documented family contract ("retune a `--ui-field-*` token once and every control follows", `variables.mdx` / `extending.mdx`; fields.css lists autocomplete.css under `@consumedby`; `autocomplete-groups.html` renders the gap) was silently broken for this one list (d). Default resolves to `--step-px` either way, so rendering is unchanged. A bullet is appended under `### autocomplete` in the 0.5.0 CHANGELOG block.

**Stays, by failing test:** `--_ring-*: 0px` plumbing in 13 primitives (b). Variant token swaps (button and toggle sizes, table `sm`, popover's 12 side x align margin rules, tooltip's 4 side rules, navigation-menu popover margins, dialog `screen`, input date/time, combobox multiselect): the token is the hook and inline on the root reaches it (a, c). Root-element literals (button kbd padding, combobox root gap, input-group / password-group / popover borders, select's no-JS listbox, separator `1lh`) (a). Structural guards (`100vi` / `100svh`, `-1px` overlaps, OTP zoom guard and caret, visually-hidden `1px`, rotations, arrow transforms, toaster stack math) (b). Descendant-slot design values with no cited demand (empty-state padding in autocomplete / combobox / command, command footer gap, dialog footer border, legend margin, addon gaps, toaster gaps, tabs vertical track width, lightbox slide padding, mobile-menu header / footer borders, kbd hooks reassigned in button / tooltip scope, the `1px` border widths on popover-family surfaces) (d).

**Layer-order spot check** (ticket 17's approach: a probe page in the scratchpad loading `src/index.css` from a `python3 -m http.server` rooted at `packages/core`, Chrome via `agent-browser`, 1280x900, `--spacing-interval` = 4px): `--px: 8` (32px), `--w: 16rem` and `--h: 4rem` on the root beat the component's padding and size on `.ui-badge` (6px padding), `.ui-input`, `.ui-select`, `.ui-textarea`, `.ui-toggle` (10px field padding), plus `.ui-button` from ticket 17. One nuance worth knowing: textarea's `--h: 4rem` is clamped by its own `min-block-size: 5lh` (about 96px); a min / max interaction, not layer order (set `--min-h` alongside `--h`, or retune the token).

**Follow-ups recorded, not done** (each wires an existing token into a declaration it should already reach, which changes what an override touches, so it is not additive in this ticket's sense): select's `::picker(select)` and multiselect panel gap should read `--ui-select-option-gap`; the input-group / password-group shells hard-code `1px` where `--ui-field-border-width` exists; `[data-slot~="dialog-close"] > svg` hard-codes `--step-4` over the `.ui-button > svg` rule that reads `--ui-button-icon-size`. Two §5 observations: `--ui-field-gap` re-declared on `.ui-field` and `--ui-popover-margin-*` re-declared on placed popovers shadow a `:root` override of those tokens.

`vp test` (18 files, 166 passed, 1 skipped) and `vp check` (216 files formatted, 0 errors; the one warning is the pre-existing `require-array-sort-compare` in `scripts/generate-sri.mjs`) green in `packages/core`.

## Comments
