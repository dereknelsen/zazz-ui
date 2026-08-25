# 11-menubar

Status: resolved
Type: task

ui-menubar composing menus; help-search example after combobox

See ../spec.md and the approved plan for detail.

## Comments

## Answer

ui-menubar: thin CSS (surface tokens), items are ui-menus with popovertarget+interestfor for the no-JS hover glide via the popover auto stack. Help-with-combobox example included. No role=menubar.

## Comments

2026-08-25: Reworked per Derek — menubar.css deleted; menubar is now a utility
composition like toolbar (inline-flex items-center gap-px bg-card rounded-md
shadow-sm p-xs) of ui-menu children. Docs + skill row updated; verified the bar
renders and menus anchor/open correctly without the stylesheet.
