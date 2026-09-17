# 13 — _utilities-color.css style props

Type: task
Status: resolved
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-color.css`

## Task

Hand-write the color style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: bg text border-color.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Raw color values: bg → background-color, text → color, border-color → border-color. Values are expected to be tokens (`--bg: var(--primary)`) or any color. Responsive blocks in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Delivered: `packages/core/src/base/_utilities-color.css` — the color family's style-prop rules, hand-written per the frozen shape. Nothing else touched (`index.css`, `head.ts` and the manifest are ticket 16).

Shape: one `@layer zazz.utilities` block. Three base rules, `:where([style*="--bg:"]) { background-color: var(--bg) }`, `:where([style*="--text:"]) { color: var(--text) }`, `:where([style*="--border-color:"]) { border-color: var(--border-color) }`, then five `@container style(--bp-<bp>: true)` blocks in the order sm, md, lg, xl, 2xl, each repeating the three rules on the suffixed name (`--bg-md` → `var(--bg-md)`). Values pass through unchanged (`raw` kind in `src/props.ts`): a theme token or any `<color>`. Because the registrations are `syntax: "*"`, a token's `light-dark()` stream is substituted at the element and re-resolves against that element's own `color-scheme`. The names follow the ticket-08 collision rule (`--border-color`, not `--border`; `--text` is a color, `--text-size` is the font-size prop).

Header documents: the gate matches the attribute's source text with the colon immediately after the name (`--bg: …` and `setProperty("--bg", …)` match, `--bg : …` does not); an unset prop never applies (the rule exists only on elements whose `style` names it, so there is no `var()` fallback and no cost elsewhere); `--bg:` does not match `--bg-md:` so base and responsive rules are independent, mobile-first by source order. One usage note surfaced by the browser check: pair `--border-color` with `.border` or the width/style longhands, because an inline `border:` shorthand resets `border-color` at inline precedence and beats every layer, including this one. That is ADR-0012's contract (inline style wins), not a bug, so it is documented rather than worked around.

Verification: `vp check` in `packages/core` passes (0 errors; the one warning is pre-existing in `scripts/generate-sri.mjs`). Scratch page (uncommitted, deleted) linking `src/index.css` + `_properties.css` + `_utilities-color.css`, read via `agent-browser` `getComputedStyle` in Chrome 150: `--bg: var(--primary)` → `oklch(0.145 0 0)`, identical to a direct `background-color: var(--primary)`; `--text: rgb(1, 2, 3)` → `rgb(1, 2, 3)`; `--border-color: rgb(4, 5, 6)` with `border-width`/`border-style` longhands → `rgb(4, 5, 6)`; `--bg : …` (space before the colon) and an element with no prop → transparent; `--bg: rgb(10,20,30); --bg-md: rgb(40,50,60)` → `rgb(40, 50, 60)` at 1280px (`--bp-md: true`) and `rgb(10, 20, 30)` at 600px (`--bp-md: false`).

Guidance consulted (`modern-web-guidance`): container style queries are Baseline Newly available (Chrome 111, Safari 18, Firefox 151, 2026-05), inside the repo's two-versions-back policy and already relied on by `_utilities.css`/`_layout.css`; registered custom properties are Baseline since 2024-07. No `@supports` gate needed.

## Comments
