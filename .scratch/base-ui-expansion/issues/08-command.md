# 08-command

Status: resolved
Type: task

ui-command palette (popover + dialog forms, invoker actions, hotkeys)

See ../spec.md and the approved plan for detail.

## Comments

## Answer

ui-command: popover=auto or ui-dialog panel, score ranking default, data-command-hotkey + per-item data-hotkey (global), actions = links + invoker commands, zazz:command-select event, command-actions.ts example script (own manifest id, not in index.ts).

2026-08-25: Fixes from Derek's review — (1) panels set display:flex
unconditionally, overriding the UA display:none on closed popovers/dialogs;
now gated behind :popover-open/.\:popover-open/[open] in command, autocomplete,
combobox, and multiselect CSS. (2) group labels sank below score-ordered items;
pinned with order: -1001. (3) example hints reworked from vim chords (G D) to
standard modifiers with REAL matching data-hotkey accelerators. (4) itemValue
textContent fallback now strips kbd hints from match/commit text.

2026-08-25: Close-fade fix — the open-gated rule also carried flex-direction,
which is not transitioned and snapped to row at close-start while display was
held by the allow-discrete transition, scrambling the input mid-fade. Layout
props moved back to the ungated base rule (inert under display:none); only
display stays gated. Applied to command/autocomplete/combobox/multiselect
panels; verified mid-fade frame with a slowed transition.
