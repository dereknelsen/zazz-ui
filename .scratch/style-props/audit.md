# Primitive audit: `--step-*` and literal lengths in `@layer zazz.components` (ticket 18)

Status: done (2026-09-17)

Scope: every `packages/core/src/primitives/<name>/<name>.css`, declarations inside
`@layer zazz.components` only (the `:root` token blocks in `@layer variables` are the
override surface and are not audited). Method: the 2026-08 audit method in
`.scratch/instance-hooks/spec.md`, run again on top of ticket 17's page. Every hit is
judged by ADR-0008's four-part test; only a declaration passing all four earns a
`--ui-<name>-*` hook on `:root` in `@layer variables` (additive, logical name, default
= the current value so rendering is pixel-identical). No existing token is renamed.

- **(a) Out of reach**: inline style on the root cannot set it (pseudo / vendor shadow
  part, descendant slot, or state-conditional).
- **(b) Design value**: size, color, spacing, radius, shadow, duration; not plumbing.
- **(c) No existing fan-out**: no current token already reaches the declaration.
- **(d) Demand proof**: a concrete use case cited in an example fragment or docs page.

## Method

1. Scanner (`scan.py`, scratchpad): parse each css, keep the `@layer zazz.components`
   blocks, flatten nested rules, list every declaration whose value contains
   `var(--step-*)` or a literal length/time/angle. Cross-checked against an `awk` pass
   that prints every `var(--step-` outside `@layer variables` with its layer: the two
   agree (55 `--step-*` reads in `zazz.components`; the only other non-variables reads
   are 4 in `@layer reset` in progress.css and slider.css, out of this ticket's scope).
   161 declarations in total across 30 of 44 primitives; 14 primitives have none.
2. Demand signals: every `style=""` in `primitives/**/*.html` (unchanged since 2026-08:
   six, all rung 2 or rung 3, table in `.scratch/instance-hooks/spec.md`),
   `examples/**/*.html` (one, the `--px` demo on `index.html`) and
   `apps/docs/content/**` (six, all rung 2 exemplars or the `--px` demo). No `--ui-*`
   name is referenced anywhere that a primitive does not declare (the two
   `--ui-field-height` / `--ui-toaster-width` mentions in the docs are the "never name
   it this way" counter-examples in `file-anatomy.mdx`).
3. Layer-order check with ticket 17's approach (below).

## Result

**One hook added** (`autocomplete`). Everything else stays, with the failing test
recorded per row. Three follow-ups where an existing token *should* reach a declaration
but does not are listed at the end; they need a wiring change, not a new hook, so they
are out of this ticket's additive scope.

Row key: `variant swap` = a `[data-*]` rule reassigning the primitive's own public token
(§5 "variants swap the token"); the token is the hook, inline on the root reaches it, so
the row fails (a) and (c). `--_ring-*` = the private focus-ring plumbing (`--_ring-width:
0px`, `--_ring-offset-width: 0px`), fails (b) by definition.

| Primitive | Declaration (`zazz.components`) | Four-part test | Action |
| --- | --- | --- | --- |
| accordion | `summary` `--_ring-*: 0px` | (b) fail: private plumbing | stays |
| autocomplete | `[data-slot~="autocomplete-list"]`, `[data-slot~="autocomplete-group"]` `gap: var(--step-px)` | (a) pass: descendant slot. (b) pass: spacing. (c) pass: no token reaches it; the family owner `--ui-field-option-gap` (fields.css) already fans out to combobox, command, menu and select through their `--ui-<name>-option-gap` aliases, but not here. (d) pass: `variables.mdx` and `extending.mdx` publish "retune a `--ui-field-*` token once and every control follows", fields.css lists autocomplete.css under `@consumedby`, and `autocomplete-groups.html` renders the gap; today that documented override silently skips this list. | **promoted**: `--ui-autocomplete-option-gap: var(--ui-field-option-gap)` on `:root` in `@layer variables`; both rules read it. Default is `--step-px` either way, so rendering is unchanged. |
| autocomplete | `[data-slot~="autocomplete-empty"] padding: var(--step-2)` | (a) (b) (c) pass. (d) fail: no fragment or docs case for the empty-state padding (same in combobox, command) | stays |
| badge | `.ui-badge` `--_ring-*: 0px` | (b) fail | stays |
| button-group | `:not([data-orientation="vertical"]) > :not(:first-child) margin-inline-start: -1px`; vertical `margin-block-start: -1px` | (b) fail: border-overlap plumbing (note: tied to `--ui-button-border-width`; a `calc(var(--ui-button-border-width) * -1)` would be a wiring fix, not a hook) | stays |
| button | `.ui-button` `--_ring-*: 0px` | (b) fail | stays |
| button | `[data-size="sm"]`, `[data-size="icon-sm"]` reassign `--ui-button-block-size: var(--step-6)`, `--ui-button-padding: var(--step-2)`, `--ui-button-icon-size: var(--step-3_5)` | variant swap: (a) fail, (c) fail | stays |
| button | `.ui-button :where(kbd)` reassigns `--ui-kbd-min-inline-size`, `--ui-kbd-min-block-size: var(--step-4_5)`, `--ui-kbd-icon-size: var(--step-3)` | (a) pass: descendant. (b) pass. (c) fail: these are kbd's own public hooks, reassigned in scope exactly as kbd.css's header sanctions; an app sets them on the key or in a `.ui-button kbd` rule. (d) fail | stays |
| button | `:has(> kbd…:last-child) padding-inline-end: var(--step-1_5)`, `:first-child` `padding-inline-start`, and the `[data-size="sm"]` pair at `--step-0_5` | (a) fail: lands on the root; inline `padding-inline-end` wins regardless of the `:has()` condition | stays |
| combobox | `:where(ui-combobox, .ui-combobox) gap: var(--step-px)` | (a) fail: root | stays |
| combobox | `[data-slot~="combobox-control"]` `--_ring-*: 0px` | (b) fail | stays |
| combobox | `[data-slot~="combobox-control"]:has(> [data-slot~="combobox-tag"]) padding-inline-start: var(--step-1_5)` | (a) pass: state-conditional on a slot. (b) pass. (c) pass literally (the base rule reads `--ui-combobox-padding-inline-start`; this state rule hard-codes over it). (d) fail | stays. Observation: an instance override of `--ui-combobox-padding-inline-start` is ignored once tags are present. |
| combobox | `[data-slot~="combobox-empty"] padding: var(--step-2)` | (d) fail | stays |
| combobox | `[data-variant="multiselect"]` `--ui-combobox-input-min-inline-size: var(--step-16)` | variant swap | stays |
| command | `[data-slot~="command-footer"] gap: var(--step-2)` | (a) (b) pass. (c) pass (`--ui-command-footer-padding` / `-border` exist; no gap token). (d) fail | stays |
| command | `[data-slot~="command-empty"] padding: var(--step-2)` | (d) fail | stays |
| dialog | `[data-slot~="dialog-close"] > svg inline-size / block-size: var(--step-4)` | (a) pass. (b) pass. (c) fail in spirit: the close button is `.ui-button[data-size="icon"]`, whose `.ui-button > svg` rule already sizes the glyph from `--ui-button-icon-size`; this later rule (same specificity, dialog.css imports after button.css) shadows it with a literal. (d) fail | stays; follow-up 3 |
| dialog | `[data-slot~="dialog-footer"] border-block-start: 1px solid var(--border)` | (a) (b) pass. (c) pass (`--ui-dialog-border` feeds the dialog's own border, not the footer's). (d) fail | stays |
| dialog | `[data-size="screen"]` `--ui-dialog-inline-size: 100vi`, `--ui-dialog-block-size: 100svh`, `max-inline-size: 100vi`, `max-block-size: 100svh` | variant swap + fullscreen geometry guard: (b) fail | stays |
| fields | `.ui-field { --ui-field-gap: var(--step-1) }` | (a) fail: the gap lands on the root, inline reaches it | stays. Observation: a public hook re-declared on the element in the components layer shadows an app's `:root { --ui-field-gap }` for `.ui-field` wrappers (§5 "declare on `:root`, never on the element"); pre-existing, not a four-part case. |
| fields | `.ui-field-group > legend, .ui-radio-group > legend margin-block: 0 var(--step-1_5)` | (a) (b) (c) pass. (d) fail | stays |
| input-group | `.ui-input-group border: 1px solid var(--ui-field-border-color)` | (a) fail: root | stays; follow-up 2 (width literal bypasses `--ui-field-border-width`) |
| input-group | `.ui-input-group` `--_ring-*: 0px` | (b) fail | stays |
| input-group | `[data-slot~="input-group-addon"] gap: var(--step-1)` | (a) (b) pass. (c) pass (`--ui-input-group-gap` is the shell's gap). (d) fail | stays |
| input | `.ui-input` `--_ring-*: 0px` | (b) fail | stays |
| input | `[type="date"], [type="time"], [type="datetime-local"]` `--ui-input-padding-inline-end: var(--step-1_5)` | variant swap | stays |
| lightbox | `[data-slot~="lightbox-content"]`, `[data-slot~="lightbox-thumb-content"]` `--_ring-width: 0px` | (b) fail | stays |
| lightbox | `[data-slot~="lightbox-dialog"] [data-slot~="dialog-content"]` `max-block-size`, `block-size: 100svh`; carousel `max-block-size: 100svh` | (b) fail: fullscreen geometry | stays |
| lightbox | `[data-slot~="lightbox-dialog"] [data-slot~="lightbox-slide"] padding: clamp(var(--space-sm), 4vi, var(--space-lg))` | (a) (b) (c) pass. (d) fail | stays |
| mobile-menu | `[data-slot~="mobile-menu-viewport"] max-block-size: 100svh` | (b) fail | stays |
| mobile-menu | header `border-block-end: 1px solid var(--border)`; footer `border-block-start: 1px solid var(--border)` | (a) (b) (c) pass. (d) fail | stays |
| navigation-menu | popover `--ui-popover-margin-block: var(--step-1_5)`; submenu `--ui-popover-margin-inline: var(--step-1_5)`; `[data-size="screen"]` `--ui-popover-inline-size: 100vi` | variant swap of popover's public hooks: (c) fail | stays |
| navigation-menu | `[data-animation="slide-down"]` viewport `transform: translateY(0.5rem)` (base + `@starting-style`) | (a) pass. (b) borderline (motion distance). (c) pass. (d) fail | stays |
| otp | `.ui-otp-input letter-spacing: 0.5ch`; `font-size: max(16px, 1em)` | (b) fail: slot-alignment plumbing and the iOS zoom guard | stays |
| otp | active-slot caret `::after inline-size: 1px; block-size: 1.2em`; `animation: ui-otp-caret-blink 1.1s …` | (a) pass: pseudo. (b) fail: caret geometry/timing is plumbing; the design value (`--ui-otp-caret-color`) is already a hook. (d) fail | stays |
| password-group | `.ui-password-group border: 1px solid var(--ui-field-border-color)` | (a) fail: root | stays; follow-up 2 |
| password-group | `--_ring-*: 0px` | (b) fail | stays |
| password-group | `[data-slot~="password-group-addon"] gap: var(--step-1)` | (d) fail | stays |
| popover | `[popover] border: 1px solid var(--ui-popover-border-color)` | (a) fail: the popover is the root; color is already hooked | stays |
| popover | 12 `[data-side] × [data-align]` rules reassign `--ui-popover-margin-block` / `--ui-popover-margin-inline: var(--step-1_5)` | variant swap; the same tokens sit on `:root` (popover.css:40-41) | stays. Observation: element-level re-declaration shadows a `:root` override of the margin tokens (§5); pre-existing. |
| radio | `.ui-radio` `--_ring-*: 0px` | (b) fail | stays |
| select | `.ui-select` `--_ring-*: 0px` | (b) fail | stays |
| select | `.ui-select:open::picker-icon`, multiselect icon `transform: rotate(-180deg)` | (b) fail | stays |
| select | `.ui-select::picker(select) gap: var(--step-px)`; `[data-slot~="multiselect-panel"] gap: var(--step-px)` | (a) pass: vendor pseudo / descendant. (b) pass. (c) fail: `--ui-select-option-gap: var(--ui-field-option-gap)` already exists in this file for exactly this purpose (today it is read on `.ui-select`, the trigger) | stays; follow-up 1 |
| select | `::picker(select) border: 1px solid var(--ui-popover-border-color)` | (a) pass. (b) pass. (c) color is hooked; no `-border-width` token exists in the popover family. (d) fail | stays |
| select | `select[multiple].ui-select:not([data-multiselect-enhanced]) padding-block: var(--step-1)` | (a) fail: root (no-JS listbox) | stays |
| select | multiselect option `input[type="checkbox"] inline-size / block-size: 1px` | (b) fail: visually-hidden plumbing | stays |
| separator | `[data-orientation="vertical"] min-block-size: 1lh` | (a) fail: root; (b) fail: guard | stays |
| table | `[data-size="sm"]` `--ui-table-cell-padding-block: var(--step-1)`, `--ui-table-cell-padding-inline: var(--step-1_5)`, `--ui-table-head-block-size: var(--step-8)` | variant swap | stays |
| tabs | `[data-slot~="tabs-label"]` `--_ring-*: 0px` | (b) fail | stays |
| tabs | `[data-orientation="vertical"] [data-slot~="tabs-list"] min-inline-size: var(--step-44)` | (a) (b) (c) pass. (d) fail: `tabs.mdx` documents the orientation only; no fragment or docs page sizes the vertical track | stays |
| textarea | `.ui-textarea` `--_ring-*: 0px` | (b) fail | stays |
| toaster | `[data-position$="center"] inset-inline-start: calc(50vi - var(--ui-toaster-inline-size) / 2)` | (b) fail: centering math | stays |
| toaster | `[data-slot~="toaster-toast"] gap: var(--step-2)`; `[data-slot~="toaster-content"] gap: var(--step-1)` | (a) (b) pass. (c) pass (`--ui-toaster-gap` is the stack gap). (d) fail | stays |
| toaster | `[data-slot~="toaster-toast"] border: 1px solid var(--ui-toaster-border-color)` | (a) pass. (b) pass. (c) color hooked, width not. (d) fail | stays |
| toaster | `--_y: translateY(… 0px …)` (two rules); expanded `::after block-size: calc(var(--ui-toaster-gap) + 1px)` | (b) fail: stack / hit-area plumbing | stays |
| toggle-group | `> :not(:first-child) margin-inline-start: -1px`; vertical `margin-block-start: -1px` | (b) fail | stays |
| toggle | `.ui-toggle` `--_ring-*: 0px` | (b) fail | stays |
| toggle | `[data-size="sm"]`, `[data-size="icon-sm"]` reassign `--ui-toggle-block-size: var(--step-6)`, `--ui-toggle-padding: var(--step-2)`, `--ui-toggle-icon-size: var(--step-3_5)` | variant swap | stays |
| tooltip | `[data-slot~="tooltip-content"] border: 1px solid var(--ui-tooltip-border-color)` | (a) pass. (b) pass. (c) color hooked, width not. (d) fail | stays |
| tooltip | `[data-slot~="tooltip-content"] :where(kbd)` reassigns `--ui-kbd-min-inline-size`, `--ui-kbd-min-block-size: var(--step-4)` | scoped reassignment of kbd's public hooks: (c) fail, (d) fail | stays |
| tooltip | 4 `[data-side]` rules reassign `--ui-tooltip-translate--start: 0, 0.25em, 0` / `0.25em, 0, 0` and `--ui-tooltip-margin-block` / `-inline: var(--step-1)` | variant swap | stays |
| tooltip | `[data-slot~="tooltip-arrow"] transform: translate(-50%, 0%) rotate(45deg)` (+ left / right variants) | (b) fail: geometry | stays |

Primitives with no `--step-*` or literal length in `zazz.components`: alert-dialog,
avatar, breadcrumbs, card, carousel, checkbox, kbd, menu, menubar, meter, progress,
prose, reveal, slider, switch, toolbar, utilities. (progress.css and slider.css read
`--step-*` in `@layer reset` only: the stripe size and the slider track / thumb token
defaults; outside this ticket's scope, noted for completeness.)

## Layer-order spot check (style prop on the root beats the component rule)

Ticket 17's approach, re-run on five primitives that were not on its page: a probe page
(scratchpad `spot.html`, served from a second `http.server`) loads `src/index.css` from
the `packages/core` server, renders a control and a `style="--px: 8; --w: 16rem; --h:
4rem"` twin per primitive, and prints `getComputedStyle` for both. Chrome via
`agent-browser`, viewport 1280×900 (`--spacing-interval` = 4px, so `--px: 8` = 32px).

| Primitive | `padding-inline-start` control → prop | `inline-size` control → prop | `block-size` control → prop |
| --- | --- | --- | --- |
| `.ui-badge` | 6px → 32px | 1280px → 256px | 22px → 64px |
| `.ui-input` | 10px → 32px | 1280px → 256px | 32px → 64px |
| `.ui-select` | 10px → 32px | 1280px → 256px | 32px → 64px |
| `.ui-textarea` | 10px → 32px | 1280px → 256px | 95.94px → 95.94px (see note) |
| `.ui-toggle` | 10px → 32px | 61.95px → 256px | 32px → 64px |

Plus `.ui-button` from ticket 17 (case b: `--px` beats `--ui-button-padding`). The
prop wins on every root-declared padding and size: `zazz.utilities` is ordered after
`zazz.components` (`_layers.css`) and no primitive fights these properties with
`!important`. Textarea's `--h: 4rem` (64px) is clamped by the component's own
`min-block-size: var(--ui-textarea-min-block-size)` (`5lh`, about 96px): a `min` / `max`
interaction, not a layer-order failure. To shrink a textarea below its minimum, set
`--min-h` alongside `--h`, or retune the token.

## Follow-ups (not in scope: a wiring fix, not a new hook)

Each is a place where a token that already exists *should* reach a declaration but does
not. The right fix is to read the existing token, which is pixel-identical by default
but changes what an app's override of that token touches, so it is not "additive" in
the sense this ticket is limited to.

1. `select.css`: `.ui-select::picker(select)` and `[data-slot~="multiselect-panel"]`
   read `gap: var(--step-px)` instead of `var(--ui-select-option-gap)`.
2. `input-group.css` / `password-group.css`: the shell's `border: 1px solid
   var(--ui-field-border-color)` bypasses `--ui-field-border-width` / `-style`, which
   `.ui-input` and `.ui-select` compose at the usage site (§5 border rule). An app
   setting `--ui-field-border-width: 2px` gets 2px inputs inside 1px shells.
3. `dialog.css`: `[data-slot~="dialog-close"] > svg` hard-codes `var(--step-4)` over
   the `.ui-button > svg` rule that already reads `--ui-button-icon-size`.

Two §5 observations, also pre-existing and out of scope: `fields.css` re-declares
`--ui-field-gap` on `.ui-field` and `popover.css` re-declares
`--ui-popover-margin-block` / `-inline` on the placed element, both in
`zazz.components`, which shadows a `:root` override of those tokens for those elements.
