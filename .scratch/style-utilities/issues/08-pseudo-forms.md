# 08 Pseudo-element forms for layout, position, and effects utilities

Status: resolved
Type: task

Derek (2026-10-06): a callout wanted `--before-position`, `--before-inset-y`, `--before-left`, `--before-display`; pseudo forms only existed for sizing, color, and `--rounded`.

## Comments

- 2026-10-06: red — `src/base/pseudo.browser.test.ts`: a `::before` accent bar (position, inset-y, left, display, z, opacity, width) and a spaced, transformed `::after` (padding, translate, transition, font-size). Green — `pseudo: true` on display, position, inset/inset-x/inset-y/top/right/bottom/left, z, opacity, scale, translate, rotate, transition, p/px/py/pt/pr/pb/pl, aspect, visibility, pointer-events, outline, font-size, font-weight. The generator already handled every mode (dual pairs registered on the pseudo-element, others read the inherited unregistered property); `emit: none` composites (shadow, ring, gradients) and the `border` shorthands stay without pseudo forms. Regenerated `_utilities-pseudo.css` (42 rules) and the editor data; `AUTHORING.md`, the skill's `tokens.md`, the pseudo-elements docs page, and the CHANGELOG updated; extension grammar/snippets regenerated.
