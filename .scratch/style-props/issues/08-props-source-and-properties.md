# 08 — src/props.ts + generate-properties.mjs + _properties.css + props.test.ts

Type: task
Status: open
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

## Comments
