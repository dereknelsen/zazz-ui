# 28 — Hand-convert examples to style props

Type: task
Status: resolved
Blocked by: 17, 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/examples/{layout,responsive,products}.html`
- `packages/core/src/primitives/utilities/{padding,gap,width,size}.html`

## Task

Use the `zazz` skill. Where an example currently expresses an open value with a one-off inline style or an awkward class, convert it to a style prop (`style="--gap: 4; --grid-cols: 3; --grid-cols-md: 4"`); leave semantic classes (`p-md`, `gap-md`) where they fit — /SPEC.md §1 "value shape decides". Add a short style-prop demo to each of the four utility fragments (they are what the docs preview). Regenerate heads. Verify rendering with agent-browser at 600/900/1300px; nothing should look different except where you intentionally used a new capability — note those in the Answer.

## Answer

Scope check first: none of the three pages carries an inline `style` or a `<style>` block, and every spacing, size and grid value on them is a scale class (`p-md`, `gap-lg`, `grid-cols-2`, `grid-cols-12`, `col-span-12 @lg:col-span-8`, `basis-full @md:basis-1/2`) or a `data-container` band. Under /SPEC.md §1 and the ADR-0012 ladder those are finite values, so the class is the honest rung and nothing was converted to a prop. `layout.html` and `products.html` are byte-identical to before (the tally hits `w-modal`, `mb-content`, `ms-center` were substrings of `show-modal`, `thumb-content`, `items-center`), so ticket 34 can compare those two pages 1:1.

Deliberate new capability, the one visible change, in `examples/responsive.html`: a "Style props" block between "Flex basis" and "Alignment and text", `style="--grid-cols: 4; --grid-cols-md: 8; --grid-cols-lg: 16; --gap: 1; --gap-lg: 3"` on a plain div with 16 `bg-info` tiles. Each value is open by the ladder's test: 16 tracks is past the `grid-cols-1…12` class scale; `--gap-lg` changes the gap at a breakpoint and there is no `@lg:gap-*` class at all; 3 steps sits between `gap-xs` (2) and `gap-sm` (4). No `.grid` class, since `--grid-cols` implies `display: grid`.

Fragments (what the docs preview): one open-value item appended to each, in `bg-tertiary` so it reads apart from the class scale, labelled in the fragment's own label style, with a source comment naming the scale neighbours. `padding.html` `--p: 5` (between p-sm 4 and p-md 6); `gap.html` `--gap: 3` (between gap-xs and gap-sm; sets `--_gap` like the classes); `width.html` `--w: 12rem` (w-xl is 24 steps, about 6rem, the next stop is w-screen-sm at 40rem; 12rem also fits the root's `max-w-xl` without flex-shrinking the bar); `size.html` `--size: 4rem` (between size-lg at 11 steps and size-xl at 24). Existing items untouched.

Verification in Chrome via agent-browser (own `--session`; the default session turned out to be shared with sibling agents), `python3 -m http.server` rooted at `packages/core`, viewports 600/900/1300 × 900. Fragments were rendered through a scratch page linking `src/index.css`.

| Check | 600 | 900 | 1300 |
| --- | --- | --- | --- |
| Console errors/warnings, three pages + fragments | none | none | none |
| Body width = viewport (no horizontal scroll) | 600 | 900 | 1300 |
| Responsive demo `display` / `--_grid-cols` | grid / 4 | grid / 8 | grid / 16 |
| Responsive demo `column-gap` (`--_gap`) | 3.69px (1 step) | 3.83px (1 step) | 12px (3 steps) |
| Tile width | 136px | 103px | 52.75px, one row, numbers fit |
| `--p: 5` padding | 18.45px | 19.14px | 20px |
| `--gap: 3` column-gap | 11.07px | 11.48px | 12px |
| `--w: 12rem` inline-size | 192px | 192px | 192px |
| `--size: 4rem` inline/block-size | 64px | 64px | 64px |

Screenshots: layout and products render as before at all three widths; the responsive block reads 4 → 8 → 16 columns with the gap opening at lg.

`vp run heads`: 0 files updated (heads already current). `vp check` green (the one warning is the pre-existing `require-array-sort-compare` in `scripts/generate-sri.mjs`); `vp test` 18 files, 172 passed, 9 skipped.

Outside scope, noted for later: `index`, `layout`, `responsive` and `products` all carry `<title>Zazz tests | Overview</title>` (`style-props.html` has its own), so the tab never identifies the page.

## Comments
