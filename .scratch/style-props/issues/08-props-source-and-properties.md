# 08 — src/props.ts + generate-properties.mjs + _properties.css + props.test.ts

Type: task
Status: resolved
Blocked by: 03
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/props.ts`
- `packages/core/scripts/generate-properties.mjs`
- `packages/core/src/base/_properties.css`
- `packages/core/src/props.test.ts`

## Task

Single source of truth for style props.

1. `src/props.ts`: export `BREAKPOINTS = ["sm","md","lg","xl","2xl"]` and `PROPS`: an array of `{ family, name, property, kind }` — families/names exactly as frozen in `.scratch/style-props/spec.md` (spacing 17 numeric; sizing 7; grid 4; flex 4; color 3; typography 3; position 6 = 44). `property` = the CSS longhand(s) it drives (e.g. px → padding-inline; left → inset-inline-start); `kind` = "step" (multiply by --spacing-interval) | "raw". Follow `CONVENTIONS.scripts.md` (fileoverview docblock, "use strict"). Export a helper `propNames()` that yields every name × (base + suffixes).
2. `scripts/generate-properties.mjs` (style of `generate-heads.mjs`): imports the compiled `src/props.js` (run `tsc -p tsconfig.json` first) and writes `src/base/_properties.css`: CSSDoc header (`@layer none` — @property is layer-independent), then one `@property --<name>[-<bp>] { syntax: "*"; inherits: false; }` per prop × 6, grouped by family with a comment per family. Add `"properties": "node scripts/generate-properties.mjs"` to package.json scripts; do not change `build` (ticket 19 owns it).
3. Commit the generated `_properties.css` (this resolves the dangling `@requires _properties.css` in `_variables.css`/`_utilities.css`).
4. `src/props.test.ts`: the committed file equals the generator output (drift guard); count = 264; every registration has `syntax: "*"` and `inherits: false`; no name collides with an existing `--ui-*`, `--_*` or token declared in `_variables.css` (read it and check `--<name>:` is not declared there).

Do not edit `index.css` (ticket 16).

## Answer

Delivered: `src/props.ts` (registry + `propNames()` + `propertiesCss()` renderer), `scripts/generate-properties.mjs` (thin writer; imports the compiled `src/props.js`, writes only on change), the generated `src/base/_properties.css` (264 registrations, `@layer none`, one comment per family), `src/props.test.ts` (13 tests), and the `properties` script in `package.json`. `index.css`, `head.ts` and `build` untouched (16/19).

Naming follows the spec.md amendment of 2026-09-17 (collision exception, recorded in ADR-0012 too): four roots that collide with token families take the full CSS property name — `border` → `border-color`, `font-size` → `text-size`, `leading` → `line-height`, `tracking` → `letter-spacing`. The `--gap-xs…xl` tokens are removed from `_variables.css` (not aliased; `--gap-sm…xl` are now the `--gap` prop's responsive forms) and `tokens.test.ts` guards that nothing declares or reads them anywhere in `src/**/*.css`. One example still read `var(--gap-md)` inline (`primitives/navigation-menu/navigation-menu-icon-grid.html`); it now reads `--space-md`.

Final prop table (44; `property` is the logical longhand where one exists; `kind` = step: × `--spacing-interval`, raw: passed through). Each takes suffixes `-sm -md -lg -xl -2xl` → 264 names, every one `@property { syntax: "*"; inherits: false; }` with no `initial-value` (the universal syntax leaves the prop guaranteed-invalid until `style=""` sets it, which is what the `[style*="--x:"]` gate needs).

| family | name | property | kind |
| --- | --- | --- | --- |
| spacing | p | padding | step |
| spacing | px | padding-inline | step |
| spacing | py | padding-block | step |
| spacing | ps | padding-inline-start | step |
| spacing | pe | padding-inline-end | step |
| spacing | pt | padding-block-start | step |
| spacing | pb | padding-block-end | step |
| spacing | m | margin | step |
| spacing | mx | margin-inline | step |
| spacing | my | margin-block | step |
| spacing | ms | margin-inline-start | step |
| spacing | me | margin-inline-end | step |
| spacing | mt | margin-block-start | step |
| spacing | mb | margin-block-end | step |
| spacing | gap | gap (also sets --_gap) | step |
| spacing | gap-x | column-gap | step |
| spacing | gap-y | row-gap | step |
| sizing | w | inline-size | raw |
| sizing | h | block-size | raw |
| sizing | min-w | min-inline-size | raw |
| sizing | max-w | max-inline-size | raw |
| sizing | min-h | min-block-size | raw |
| sizing | max-h | max-block-size | raw |
| sizing | size | inline-size, block-size | raw |
| grid | grid-cols | grid-template-columns (implies display: grid; sets --_grid-cols) | raw |
| grid | grid-rows | grid-template-rows | raw |
| grid | col-span | grid-column | raw |
| grid | row-span | grid-row | raw |
| flex | basis | flex-basis | raw |
| flex | grow | flex-grow | raw |
| flex | shrink | flex-shrink | raw |
| flex | order | order | raw |
| color | bg | background-color | raw |
| color | text | color | raw |
| color | border-color | border-color | raw |
| typography | text-size | font-size | raw |
| typography | line-height | line-height | raw |
| typography | letter-spacing | letter-spacing | raw |
| position | top | inset-block-start | raw |
| position | right | inset-inline-end | raw |
| position | bottom | inset-block-end | raw |
| position | left | inset-inline-start | raw |
| position | inset | inset | raw |
| position | z | z-index | raw |

Finding that shaped the names (now resolved): with the original roots, 17 of the 264 registered names were already tokens in `_variables.css` — `--border` (theme role), `--gap-{sm,md,lg,xl}` (ticket 03's aliases) and `--font-size-/--leading-/--tracking-{sm,md,lg,xl}` (type scale). An `@property … inherits: false` registration applies to the name globally, so those `var()` reads would have become guaranteed-invalid below `:root` the moment `_properties.css` is imported. Structural cause: the breakpoint suffixes share the t-shirt vocabulary of the size-scale tokens, so any Tailwind root that is also a Zazz token family collides on its responsive forms. The collision test in `props.test.ts` keeps guarding this for future props.

Verification: `vp test` in `packages/core` 144 passed / 1 skipped (the ticket-27 prefix sweep), `vp check` 0 errors.

## Comments

- 2026-09-17: first pass implemented the frozen list verbatim and left the ticket claimed with the collision test red (17 names). Coordinator recorded the resolution in spec.md (47cca23); second pass applied the renames, removed the `--gap-*` tokens, updated `tokens.test.ts` and ADR-0012, and resolved.
