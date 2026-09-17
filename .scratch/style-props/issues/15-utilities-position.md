# 15 — _utilities-position.css style props

Type: task
Status: resolved
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-position.css`

## Task

Hand-write the position style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: top right bottom left inset z.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Raw values mapped to logical properties (0.3.0 convention): top → inset-block-start, bottom → inset-block-end, left → inset-inline-start, right → inset-inline-end, inset → inset, z → z-index. Responsive blocks in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Added `packages/core/src/base/_utilities-position.css` (not yet wired: `index.css`/`head.ts` are ticket 16). Everything sits in `@layer zazz.utilities`: six base rules `:where([style*="--<name>:"]) { <property>: var(--<name>); }` for `top right bottom left inset z`, then five `@container style(--bp-<bp>: true)` blocks in order sm, md, lg, xl, 2xl, each repeating the six rules on the suffixed names (36 rules, 6 × 6). Values pass through raw onto the logical properties from `src/props.ts`: `--top` → `inset-block-start`, `--right` → `inset-inline-end`, `--bottom` → `inset-block-end`, `--left` → `inset-inline-start`, `--inset` → `inset`, `--z` → `z-index`. The props never set `position`. Within a block the prop order is the registry order, so `--inset-md` set alongside `--top-md` wins by source order (documented in the scratch check below).

The CSSDoc header records the contract: the gate matches the attribute's source text, so the prop name must be followed immediately by the colon (`--top: 1rem` / `--top:1rem` match, `--top : 1rem` never does; `setProperty` serializes to the matching form); `--top:` does not match `--top-md:`; an unset prop matches no rule (attribute gate), so there is no `var()` fallback and no initial-value; responsive suffixes are mobile-first and gated on the `--bp-*` flags from `_variables.css`, with the `@uses` note flagging `style()` queries as Baseline Newly available (base rules still apply without support). `@requires layers.css, _variables.css, _properties.css`; `@consumedby index.css`.

Verification: `vp check` in `packages/core` 0 errors (1 pre-existing warning in `scripts/generate-sri.mjs`); `vp run test` green. Chrome check via `agent-browser` on an uncommitted scratch page (`examples/_scratch-position.html`, loading `index.css` + `_properties.css` + `_utilities-position.css`, deleted afterwards): at a 600px viewport `style="--top: 12px; --left: 24px; --z: 7"` computed `inset-block-start: 12px`, `inset-inline-start: 24px`, `z-index: 7`; `--top: 10px; --top-md: 40px; --inset-md: 5px` computed `10px` with the md block inactive; `--top : 99px` (space before the colon) computed `0px`; a prop-less sibling computed `0px`/`auto`. At 1200px the same responsive element computed `5px` on all four sides (md block active; `--inset-md` after `--top-md` in source order).

## Comments
