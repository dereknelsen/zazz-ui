# 01-menu-rename

Status: resolved
Type: task

Rename dropdown to menu; add menu.ts keyboard nav + interestfor hover example

See ../spec.md and the approved plan for detail.

## Comments

## Answer

Renamed dropdown → menu across kit, examples, docs, and skills; added menu.ts
(arrow-key nav, registered ui-menu), menu-interest.html (interestfor + popovertarget
on one trigger), docs redirect /docs/components/dropdown → /docs/components/menu.
select.css now reads --ui-menu-button-radius (documented via @consumedby).
vp check 0 errors, 46 tests pass.
