# 09 — _utilities-spacing.css style props

Type: task
Status: resolved
Blocked by: 08
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities-spacing.css`
- `packages/core/src/base/_utilities-spacing-responsive.css`

## Task

Hand-write the spacing style-prop file(s). Load the `modern-web-guidance` skill first (verify `@container style()`, `@property`, attribute substring selectors). Read `CONVENTIONS.styles.md` (CSSDoc header, `:where()` zero specificity) and `.scratch/style-props/spec.md` (frozen names, rule shape).

Props: p px py ps pe pt pb m mx my ms me mt mb gap gap-x gap-y.

Shape: everything inside `@layer zazz.utilities`. Base rule per prop: `:where([style*="--<name>:"]) { <property>: <value>; }`. Then five blocks `@container style(--bp-<bp>: true) { :where([style*="--<name>-<bp>:"]) { … } }` in order sm, md, lg, xl, 2xl (mobile-first by source order). Value = `calc(var(--<name>) * var(--spacing-interval))` (unitless step multiplier; `--px: 6` == `.p-md`). Padding/margin map to logical longhands (px → padding-inline, ps → padding-inline-start, pt → padding-block-start, …). `--gap` must also set `--_gap: calc(var(--gap) * var(--spacing-interval))` and use `gap: var(--_gap)` so `.basis-1/N` (reads inheriting `--_gap`, see `_utilities.css` ~l.1168) stays correct; `--gap-x/--gap-y` set `--_gap-x/--_gap-y` likewise (check what `.gap-x-*` sets today and mirror it). SPLIT: base rules in `_utilities-spacing.css`; the five responsive blocks in `_utilities-spacing-responsive.css` (separate opt-in file per /SPEC.md §5). Document that `auto` is invalid here (use `.mx-auto`).

Header must document: no space before the colon in the inline value; unset props never apply (attribute gate). Acceptance: `vp check` passes; a quick scratch html in the worktree (not committed) shows the rule applying in Chrome via agent-browser `eval getComputedStyle`.

## Answer

Delivered: `src/base/_utilities-spacing.css` (17 base rules) and `src/base/_utilities-spacing-responsive.css` (85 rules: five `@container style(--bp-<bp>: true)` blocks, sm → md → lg → xl → 2xl, 17 rules each). 102 rules total, all `:where([style*="--<name>:"])` inside `@layer zazz.utilities`, one per registered spacing name (cross-checked against `_properties.css`: the 102 gates and the 102 `--p … --gap-y-2xl` registrations are the same set). Names and target properties match `src/props.ts` exactly (logical longhands; `p`/`m` are the shorthands). Value is `calc(var(--<name>) * var(--spacing-interval))`. Within each block the order is all sides → axes → sides so a narrower prop wins by source order (`--p: 6; --ps: 0` → inline-start 0). `index.css`/`head.ts` untouched (ticket 16).

`--_gap` coordination: `--gap` sets `--_gap: calc(var(--gap) * var(--spacing-interval))` on the element and then `gap: var(--_gap)`, mirroring `.gap-*` (`--_gap: <len>; gap: var(--_gap)`); `--gap-x` → `--_gap-x` + `column-gap: var(--_gap-x)`, `--gap-y` → `--_gap-y` + `row-gap: var(--_gap-y)`, mirroring `.gap-x-*`/`.gap-y-*`. The `var(--gap)` is substituted on the container (where the `inherits: false` prop lives), so what children inherit through the unregistered `--_gap` is the resolved `calc()`. Same in every responsive block (`--gap-md` → `--_gap`, …). Verified: a `.basis-1/3` child computes `calc(33.3333% - 5.33333px)` under both `style="--gap: 2"` and `class="gap-xs"`.

Headers document: the gate matches the attribute source text, `--px` immediately followed by the colon (`--px: 6` and `--px:6` match, `--px : 6` does not; `setProperty` serializes to the matching form); an unset prop matches no rule, so nothing applies and no `var()` fallback runs; gates are prefix-free (`--p:` ≠ `--px:`/`--pt:`/`--p-md:`, `--gap:` ≠ `--gap-x:`/`--gap-md:`); `auto` is invalid (`--mx: auto` → calc invalid at computed-value time → margin 0; use `.mx-auto`); negative margins work as negative steps; a prop beats a class on the same property (`class="mx-auto" style="--m: 4"` is 4 all round); the responsive file is opt-in and must load after the base file.

Chrome 150 verification (scratch `packages/core/scratch-spacing.html`, uncommitted; links `_layers`, `_variables`, `_properties`, `_utilities`, then the two new files; assertions run in-page via `getComputedStyle` and are read back with `agent-browser get text`): 15/15 pass. `--px: 6` == `.px-md` (24px at 4px interval); `--gap: 2` == `.gap-xs`; `--gap-x: 4`/`--gap-y: 2` → 16px/8px; `--p: 2; --p-md: 8` → 32px inside a 60rem container, 8px inside a 20rem one; `--p: 6; --ps: 0` → start 0 / end 24px; unset → 0; `--px : 6` → no match; `--p-md` alone does not trip the `--p:` gate; `--mx: auto` → 0px; a parent's `--p` does not leak to the child.

Surprises:

- **`tokens.test.ts` conflict (amended, one assertion).** Ticket 08's "reads no `--gap-xs…xl` token anywhere" sweep matches `var(--gap-sm|md|lg|xl)`, which is exactly what the responsive `--gap-<bp>` prop rules must read (spec.md: the prop needs the name). The assertion now excludes `_utilities-spacing-responsive.css` only, with a comment; every other file, including `_utilities-spacing.css` (reads `var(--gap)`, no suffix), stays guarded. `vp test`: 144 passed, 1 skipped.
- **`style()` reads the parent's flag.** A style query resolves against the nearest style container, i.e. the parent, and the parent's `--bp-*` comes from *its* nearest size container. So a prop on a direct child of a size container follows the grandparent container's width, not the parent's; one wrapper element in makes it follow the parent. This is the existing `@md:` class behaviour (same flags), not something this ticket changes, but the docs (ticket 29) should say it.
- **The formatter normalizes inline style.** `vp check --fix` rewrote `style="--px : 6"` to `style="--px: 6"` in the scratch HTML, so the space-before-colon miss can only come from unformatted markup; the scratch sets it at runtime with `setAttribute` to test the gate.
- `npx modern-web-guidance` cannot run from inside the repo (`devEngines` pins pnpm and npm refuses); run it from outside the tree. Guide `design-token-reactivity` confirms `@container style()` is Baseline newly available (Chrome 111, Safari 18, Firefox 151), consistent with the repo's browser policy and the existing `@sm:` prefixes.

## Comments
