# 33 — Agent docs: zazz skill, CONVENTIONS ladder rung, READMEs, AGENTS.md

Type: task
Status: resolved
Blocked by: 02, 08, 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `.claude/skills/zazz/SKILL.md`
- `.claude/skills/zazz/PATTERNS.md`
- `.claude/skills/zazz/DESIGN.md`
- `.claude/skills/zazz/references/tokens.md`
- `packages/core/CONVENTIONS.styles.md`
- `README.md`
- `AGENTS.md`

## Task

Update the agent-facing docs to the new vocabulary: `references/tokens.md` §1 (space scale replaces gap-first rule; aliases deprecated) and §7 (bp flags, screen flags, 2xl, band names); `SKILL.md` golden rules (value-shape rule; "open value → style prop"; breakpoint names); `PATTERNS.md`/`DESIGN.md` any example markup. `CONVENTIONS.styles.md` §5 escape-hatch ladder gains rung 1b "a style prop, when the value is open but the property is one of the 44" (cite ADR-0012) and §2 file anatomy lists `_properties.css` + the family files. Root `README.md` and `AGENTS.md`: mention style props and the modular dist in one line each where the kit is described. Keep the docs' existing structure.

## Answer

Updated the eight agent-facing files to the 0.5.0 vocabulary (ticket 27 had already applied the mechanical renames; this pass adds the concepts). Structure and voice of every file kept; only the sections named below changed.

- **`.claude/skills/zazz/SKILL.md`** — golden rules gain **Value shape decides the mechanism** (finite → class, open → style prop, variant → `data-*`, bundle → primitive; ADR-0012) with the 44 prop names by family, the collision exception (`border-color`, `text-size`, `line-height`, `letter-spacing`), responsive suffixes gated on the nearest size container, and the contract nuances from tickets 09/13/17/18 (colon directly after the name, unset prop applies nothing, no inheritance, `--mx: auto` invalid, pair `--border-color` with `.border`, a prop on a `ui-*` root beats the primitive, not a CSP workaround). **Spacing** rule: `--space-*` (`2xs`…`2xl`) first, a spacing prop for an open step count, `--step-*` escape hatch, `--gap-*` gone. New **Breakpoints** rule: `sm md lg xl 2xl` = 40/48/64/80/96rem across prefixes, suffixes, `--breakpoint-*`, `--bp-*`, `--screen-*`, bands. Customizing §2 records the `:root` theme-override finding (a scoped `--ui-field-*` never reaches a button; scope with `--ui-button-*`); §3 points open instance values at props. Building step 3/4, a Do/Don't pair, and a reference-index row for `src/props.ts` + `examples/style-props.html`.
- **`references/tokens.md`** — rule 2 now reads class → style prop in markup, `--space-*` → `--step-*` in CSS. §1 rewritten: the seven-step space scale as step multiples, `--gap-*` removed (not aliased; `--gap-md` is the prop's responsive form), `2xs`/`2xl` token-only, the spacing props, sizing props, `--step-*` demoted to a CSS-file escape hatch. §7 rewritten: breakpoints as one vocabulary with the three token forms (`--breakpoint-*` lengths, `--bp-*` container flags on the nearest size container with the parent-resolution nuance, `--screen-*` viewport flags), responsive props and the grid/flex/position/color/typography props. §2/§3/§12 get one line each pointing open colors and offsets at `--bg`/`--text`/`--border-color` and `--top`…`--z`.
- **`DESIGN.md`** — spacing table gains `--space-2xs` 4px and `--space-2xl` 160px; one-scale note plus a prop example for off-scale amounts; Breakpoints section gains the shared-vocabulary line. **`PATTERNS.md`** — the tokens pointer now lists `@sm:`…`@2xl:` and style props; example markup needed no change (it uses scale values only).
- **`packages/core/CONVENTIONS.styles.md`** — §2 load order now names `_variables.css` → `_properties.css` → base → primitives → `_utilities.css`/`_layout.css` → the eight family files, states that `_properties.css` is generated from `src/props.ts` by `scripts/generate-properties.mjs` (`vp run properties`, `props.test.ts` guards drift and collisions), lists the modular dist `build-dist.mjs` emits, and adds the prop rules to the `utilities` layer bullet. §5 ladder gains **rung 1b** (style prop when the value is open and the property is one of the 44; cites ADR-0012), the rung-3 paragraph says primitives never read props, and the `@see` cites ADR-0012 as the amendment. The tier table already read `--space-*` after ticket 27.
- **`CONVENTIONS.scripts.md`** — the build sentence: `vp pack` emits `dist/zazz.js`; `scripts/build-dist.mjs` owns every `dist/*.css`. **`README.md`** / **`AGENTS.md`** — one line each in the `packages/core` description on style props and the modular dist (`CLAUDE.md` is a symlink to `AGENTS.md`, so it follows).

Formatting: `vp check` reports all 8 files correctly formatted (the "no files to lint" line is the linter having no `.ts`/`.js` in the set). The pre-commit hook's first pass broke two code spans that crossed a line break in `SKILL.md` (it de-indents continuation lines inside a span); rewrote those so no code span spans a line. `*` inside code spans (`--space-*`, `--bp-*`, `@max-*`) survived intact. No `vp test` impact: no source touched.

Left alone on purpose: the `## Contents` numbering quirk in `tokens.md` (pre-existing); `zazz-new-design-style/SKILL.md` and `zazz-figma-*` skills (not in this ticket's file list); docs-site pages (tickets 29–32).

## Comments
