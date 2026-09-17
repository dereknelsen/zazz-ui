# 17 — examples/style-props.html + browser verification

Type: task
Status: resolved
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

Page: `packages/core/examples/style-props.html` (head block from `layout.html`, `vp run heads` reports it current). Linked from every example page nav + footer, a card on `examples/index.html`, and the docs at `apps/docs/content/docs/templates/style-props.mdx` (+ `meta.json`). Each case carries a `data-case` hook and a `<pre id="results">` at the bottom prints `getComputedStyle` per case, refreshed on resize, so the check below is repeatable without `eval`.

Verified in Chrome (agent-browser) against `python3 -m http.server` rooted at `packages/core`, viewport 480×900 (30rem, `--bp-md: false`) and 960×900 (60rem, `--bp-md: true`). `--spacing-interval` resolves to 3.636px at 480 and 3.854px at 960, so one step is fluid and the numbers below shift with it.

| Case | Element | 30rem (480px) | 60rem (960px) | Expected |
| --- | --- | --- | --- | --- |
| a | div `--px: 8; --px-md: 12` | padding-inline 29.09px (8 steps) | 46.25px (12 steps) | 8 steps below md, 12 at md+ ✓ |
| b | `.ui-button` `--px: 8; --px-md: 12` | 29.09px (control button 18.18px) | 46.25px (control 19.27px) | prop beats `--ui-button-padding` ✓ |
| c | parent `--px: 8` | 29.09px | 30.84px | 8 steps ✓ |
| c | child, no style attr | padding-inline 0px, `--px` = `""` | 0px, `""` | inherits: false ✓ |
| d | `.flex.flex-wrap` `--gap: 4` | gap 14.54px; `--_gap` = `calc(4 * clamp(…))` | gap 15.42px | 4 steps, sets `--_gap` ✓ |
| d | child `.basis-1/2` | flex-basis `calc(50% - 7.272px)`; inline-size 210.91px of 436.36px | `calc(50% - 7.7088px)`; 449.14px of 913.72px | (100% − gap) / 2, two per line ✓ |
| e | div `--grid-cols: 3` (no `.grid`) | display grid; `135.766px 135.766px 135.766px` | grid; `294.297px 294.297px 294.312px` | display: grid + 3 equal tracks ✓ |
| f | div `--w: 16rem` | inline-size 256px | 256px | 16rem ✓ |
| g | plain `.ui-button` under `:root { --ui-field-padding: var(--step-5) }` | padding-inline 18.18px (5 steps) | 19.27px | token override picked up ✓ |
| g | `.ui-button` `--px: 8; --px-md: 12` in the same island | 29.09px | 46.25px | prop still wins ✓ |
| h | div `--w: 16rem; --mx: auto` | margin-inline 0px | 0px | no effect (invalid calc → 0) ✓ |
| h | div `--w: 16rem` `.mx-auto` | margin-inline 90.17px (centered) | 328.86px (centered) | centered ✓ |

Every case behaves as the spec and ADR-0012 say. One finding outside the prop contract, worth knowing for case g: the theme override **must** sit on `:root`. A first draft scoped it to the section (`[data-case="g-island"] { --ui-field-padding: var(--step-5) }`) and the plain button stayed at 2.5 steps (9.09px), because `button.css` declares `--ui-button-padding: var(--ui-field-padding)` on `:root` in `@layer variables`, so the `var()` is substituted once at `:root` and descendants inherit the resolved value. A scoped `--ui-field-padding` never reaches a button; the scoped lever is `--ui-button-padding` itself. The page and the docs entry say so.

`vp check` and `vp test` (18 files, 162 passed, 1 skipped) green in `packages/core`; the only warning is the pre-existing `require-array-sort-compare` in `scripts/generate-sri.mjs`.

## Comments
