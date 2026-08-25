# Base-UI-inspired primitive expansion

Grow the kit toward Base UI's coverage while staying web-native. Base UI is the
behavioral north star only — everything follows Zazz conventions (layers +
`--ui-*` tokens, `data-slot` parts, popover/anchor CSS, invoker commands,
light-DOM `ZazzElement` + signals, progressive enhancement).

Full approved plan: `~/.claude/plans/base-ui-all-refs-https-base-ui-com-llms-delightful-volcano.md`

## Scope

New primitives: autocomplete, combobox, command, meter & progress, otp.
Updates: dropdown→menu rename + keyboard/hover, menubar, toolbar, alert-dialog
split, navigation-menu rework, select multiselect.

## Decisions locked with Derek (2026-08-24)

1. Multiselect = `ui-multiselect` JS enhancement over a real `<select multiple>`
   (no hyphen in the name). Native listbox is the no-JS fallback.
2. OTP = single real input (`autocomplete="one-time-code"`) + stamped
   presentational slot rail. Not per-character inputs.
3. Hotkeys = vendored `base/hotkeys.ts`. `@tanstack/hotkeys` rejected (0.x alpha
   vs SRI-pinned dep policy).
4. Menu/toolbar ARIA = honest disclosure posture, no `role="menu"`/`"toolbar"`
   in v1; full APG contract is v2.

Settled by convention: docs redirect for `/docs/components/dropdown`; meter
optimum fill `var(--success)`; global `progress, meter` appearance strip in
`_reset.css`; alert-dialog composes `.ui-dialog` + `dialog-*` slots; command
`data-hotkey` accelerators are global while connected; menubar ships no JS in
v1; menu typeahead deferred.

## Sequencing

01 rename → (02 alert-dialog | 03 toolbar | 04 meter-progress in any order) →
05 typeahead engine → 06 autocomplete → 07 combobox → 08 command →
(09 otp | 10 multiselect) → 11 menubar → 12 navigation-menu.
