# 07-combobox

Status: resolved
Type: task

ui-combobox primitive (hidden-input value, select-look control)

See ../spec.md and the approved plan for detail.

## Comments

## Answer

ui-combobox: select-look control shell, hidden combobox-value input, label matching + data-value submission, revert-on-blur, chevron full-list toggle, aria-selected checkmark. No-JS guidance: use .ui-select.

2026-08-25: Inline variant added to the typeahead engine — a panel WITHOUT
[popover] renders in flow, always open (no show/hide, light dismiss, or
Escape-close; Escape only clears). CSS: panel:not([popover]) displays flex,
sheds the floating shadow. menubar-help-search now uses it (chevron trigger
dropped); autocomplete inherits the variant for free. Verified filter + commit
inside the open Help menu.
