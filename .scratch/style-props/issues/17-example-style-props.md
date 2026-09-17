# 17 — examples/style-props.html + browser verification

Type: task
Status: open
Blocked by: 16
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/examples/style-props.html`

## Task

Create a permanent regression page `examples/style-props.html` (copy the head block from `examples/layout.html`, then `vp run heads`). Use the `zazz` skill for markup. Cases, each labelled: (a) `<div style="--px: 8; --px-md: 12">`; (b) `<button class="ui-button" style="--px: 8; --px-md: 12">` — utilities layer must beat the component padding; (c) a slotted parent with a child that must NOT inherit (`inherits: false`); (d) `style="--gap: 4"` container with `.basis-1/2` children; (e) `style="--grid-cols: 3"` without `.grid`; (f) `style="--w: 16rem"`; (g) theme override `<style>:root{--ui-field-padding: var(--step-5)}</style>` island showing buttons pick it up while (b) still wins; (h) the documented failure `--mx: auto` (no effect) next to `.mx-auto`.

Verify with agent-browser against a static server at container widths 30rem and 60rem: `eval getComputedStyle` padding/gap/grid-template-columns for a–g. Paste the table into this ticket's Answer.

## Answer

## Comments
