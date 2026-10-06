# 07 Grid alignment shorthands: `--place-items`, `--place-content`

Status: resolved
Type: task

Derek (2026-10-06): expand `--place` so grids can set both alignment shorthands; keywords only (`safe start`, `end`, `space-between`, …).

## Comments

- 2026-10-06: red — `src/base/families.browser.test.ts`: `--place-items: center` sets `align-items`/`justify-items`, `--place-content: space-between` sets `align-content`/`justify-content`, `safe end` passes through, and a tier-only `--place-content--md` resets to `normal` below the breakpoint. Green — `src/base/utilities.ts`: `place` renamed `place-items` (two utilities writing one property would race), `place-content` added; both keyword mode, flow family, `noBase: "normal"`. `vp run core#generate` regenerated `_utilities-flow.css` and the editor data; `pnpm exec tsc -p packages/core/tsconfig.json` re-emitted `utilities.js` (the task cache skips it). **BREAKING** entry in the CHANGELOG with the rename migration.
- 2026-10-06: migrated the three fragments that used `--place: center` (padding, padding-compose, select-sides), then `vp run fmt:html` for the new cascade position; `AUTHORING.md`, the skill's `tokens.md`, the docs utility sections (flexbox-grid) and value notes updated; extension grammar/snippets regenerated. Core 690 tests, docs 59, extension 22, `lint:html` clean.
