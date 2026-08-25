# 02-alert-dialog-split

Status: resolved
Type: task

Move the alert variant into primitives/alert-dialog composing .ui-dialog

See ../spec.md and the approved plan for detail.

## Comments

## Answer

New primitives/alert-dialog/ composing .ui-dialog (markup: ui-dialog ui-alert-dialog + role=alertdialog + closedby=none); alert-dialog.css only remaps --ui-alert-dialog-\* onto dialog tokens. dialog-is-alert.html moved, docs split with cross-links.
