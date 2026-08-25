# 04-meter-progress

Status: resolved
Type: task

New meter + progress primitives; reset-file appearance strip

See ../spec.md and the approved plan for detail.

## Comments

## Answer

progress.css owns --ui-progress-\* (meter aliases geometry 1:1); element box = track, vendor pseudos = fill, one rule per vendor. \_reset.css strips appearance on progress,meter. Indeterminate stripe reduced-motion-gated. Meter optimum fill = --success. Safari fill check pending manual pass.
