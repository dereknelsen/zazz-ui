# 10 — _utilities-sizing.css style props

Type: task
Status: resolved
Blocked by: 08
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-sizing.css`

## Task

Hand-write the sizing style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: w h min-w max-w min-h max-h size.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Raw pass-through values (any length/percentage/keyword): w → inline-size, h → block-size, min-w → min-inline-size, max-w → max-inline-size, min-h/max-h likewise, size → both inline-size and block-size. Responsive blocks live in the same file.

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Added `packages/core/src/base/_utilities-sizing.css`: the seven sizing style props (`--w --h --min-w --max-w --min-h --max-h --size`) as raw pass-through rules in `@layer zazz.utilities`, each gated on `:where([style*="--<name>:"])`, followed by five `@container style(--bp-<bp>: true)` blocks in sm, md, lg, xl, 2xl order (mobile-first by source order). Targets match `src/props.ts` exactly: `w` → `inline-size`, `h` → `block-size`, `min-w`/`max-w` → `min-/max-inline-size`, `min-h`/`max-h` → `min-/max-block-size`, `size` → both `inline-size` and `block-size`. 7 × 6 = 42 rules.

The CSSDoc header documents the contract: the prop name must be immediately followed by the colon (`--w: 24rem`, not `--w : 24rem`); an unset prop matches no rule (attribute gate, no `var()` fallback); the gates stay independent (`--w:` is not a substring of `--w-md:`, `--max-w:` or `--min-w:` because the second dash is required); props are `inherits: false` per `_properties.css`.

Not touched, per the ticket: `index.css` and `head.ts` (ticket 16 wires the family files in).

Verification:
- `vp check` in `packages/core`: pass (one pre-existing warning in `scripts/generate-sri.mjs`, unrelated).
- `vp run test` in `packages/core`: pass.
- Chrome via `agent-browser` on an uncommitted scratch page (outside the repo) that linked `src/index.css` plus this file, reading `getComputedStyle`: `--w: 240px` → `inline-size` 240px; `--h: 33px` → `block-size` 33px; `--min-w: 300px` beats `--w: 10px` (300px); `--max-w: 120px` → 120px; `--min-h: 44px` → 44px; `--max-h: 12px` caps `--h: 100px` to 12px; `--size: 64px` → 64 × 64px; an element with no prop keeps `auto` sizing; `--w : 240px` (space before the colon) is ignored; `--w: 320px` on a `.ui-button` wins over the button's own sizing (utilities layer above components, per ADR-0012). Responsive: `--w: 100px; --w-sm: 150px; --w-md: 200px; --w-lg: 250px` computed to 100px at 500px, 150px at 700px, 250px at 1100px viewport.

## Comments
