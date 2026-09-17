# Style props: utilities rework for @zazz-ui/core 0.5.0

Status: in progress (2026-09-17)
Spec: [/SPEC.md](../../SPEC.md) (locked decisions + phases). This file records the amendments agreed in planning and the ticket graph.

## Amendments to /SPEC.md (agreed 2026-09-17)

- **Term:** the inline custom-property mechanism (`style="--px: 4"`) is a **style prop**. "Slot" stays reserved for `data-slot` parts (CONTEXT.md). Family file names keep the spec's `_utilities-<family>.css`.
- **`--space-*` are step multiples**, not literal rem: `2xs=--step-1, xs=--step-2, sm=--step-4, md=--step-6, lg=--step-11, xl=--step-24, 2xl=--step-40` (xs–xl byte-identical to 0.4.1's `--gap-*`; stays fluid via `--spacing-interval`). `--gap-xs…xl` are **removed outright** (no aliases): the responsive prop `--gap-md` needs the name, and the codemod rewrites every read.
- **Breakpoint shift is one vocabulary:** flags `--bp-{sm,md,lg,xl,2xl}` = 40/48/64/80/96rem, class prefixes `@sm:…@2xl:` (and `@max-*`), length tokens `--breakpoint-{sm…2xl}`, `.container` band line names and `data-container` values all shift one step (old xs → sm … old xl → 2xl). `--screen-*` viewport flags are new.
- **Spacing base stays `--spacing-interval`** (the spec's `--spacing` is not renamed).
- **No numeric classes exist in 0.4.1**, so `compat-tailwind.css` is **deferred** and the codemod's HTML transform is the breakpoint-prefix shift + `data-container` values (no numeric-class → prop rewrite). No `--compat` flag.
- **Style props (44 × 6):** spacing (numeric × `--spacing-interval`) `p px py ps pe pt pb m mx my ms me mt mb gap gap-x gap-y`; sizing `w h min-w max-w min-h max-h size`; grid `grid-cols grid-rows col-span row-span` (`--grid-cols` implies `display: grid`); flex `basis grow shrink order`; color `bg text border-color` (`--text` is color); typography `text-size line-height letter-spacing`; position `top right bottom left inset z` (logical). Suffixes `-sm -md -lg -xl -2xl`. Each registered `@property { syntax: "*"; inherits: false }`; rules gated on `:where([style*="--x:"])` in `@layer zazz.utilities`; family files import after `_utilities.css`/`_layout.css`. `--gap` also sets `--_gap`; `--grid-cols` sets `--_grid-cols`.
- **Prop naming exception (2026-09-17, ticket 08):** a prop name is the Tailwind root *unless* the root, or its responsive forms (`<root>-sm…-2xl`), collides with an existing Zazz token family. Collisions found: `--border` (Shadcn role), `--font-size-*`, `--leading-*`, `--tracking-*` (type scale), `--gap-*` (old size tokens). Resolution: `border` → `border-color`; `font-size` → `text-size`; `leading` → `line-height`; `tracking` → `letter-spacing`; the `--gap-*` tokens are removed. `props.test.ts` guards against future collisions.
- **Dist** is built by `scripts/build-dist.mjs` (lightningcss bundle+minify, no targets): `layers.css`, `base.css`, `utilities-core.css`, `utilities-<family>.css`, `utilities-spacing-responsive.css`, `utilities.css`, `primitives/<name>.css`, `zazz.css`; `src/` per-file grain stays (ADR-0005).
- **Codemod** ships as `zazz-ui migrate` in `packages/cli`; rules in `packages/core/migrations/0.5.0.json` (in the tarball); CHANGELOG stays hand-written and a test guards the JSON ↔ table drift.
- **ADR-0012** amends ADR-0008 (style props add responsive suffixes, scale multiplication and coordination that raw inline style lacks).
- **Release** is manual (ADR-0010): the PR leaves 0.5.0 ready; no version bump, no publish; 0.4.2 is skipped.

## Not yet specified

- **zazz-tailwind plugin / CLI helper** that adds Zazz layers + tokens to a Tailwind `index.css` for users who want numeric utilities — the replacement for the deferred `compat-tailwind.css`.
- Editor support (VS Code `css.customData` for style-prop autocomplete).
- Typed `attr()` attribute form (`data-px="4"`) once Safari ships.

## Tickets

Format: see `docs/agents/issue-tracker.md`. Frontier = open, unblocked, unclaimed; lowest number first.

- [01 — Baseline numbers for 0.4.1](issues/01-baseline-numbers.md) — blocked by: — · S
- [02 — ADR-0012: style props amend ADR-0008; CONTEXT.md term](issues/02-adr-0012-style-props.md) — blocked by: — · S
- [03 — Tokens: --space-\*, --gap-\* aliases, --bp-\*, --screen-\*, --breakpoint-\* shift](issues/03-tokens.md) — blocked by: — · M
- [04 — \_utilities.css sweep: --gap-→--space-, flags, breakpoint prefix shift](issues/04-utilities-sweep.md) — blocked by: 03 · L
- [05 — \_layout.css: flags, band names, data-container, @max-\*, new 2xl](issues/05-layout-shift.md) — blocked by: 03 · M
- [06 — Base + primitive token sweep (--gap-\*, --breakpoint-\*)](issues/06-token-sweep-primitives.md) — blocked by: 03 · S
- [07 — tokens.test.ts: guard the new token contract](issues/07-tokens-test.md) — blocked by: 03 · S
- [08 — src/props.ts + generate-properties.mjs + \_properties.css + props.test.ts](issues/08-props-source-and-properties.md) — blocked by: 03 · M
- [09 — \_utilities-spacing.css style props](issues/09-utilities-spacing.md) — blocked by: 08 · M
- [10 — \_utilities-sizing.css style props](issues/10-utilities-sizing.md) — blocked by: 08 · S
- [11 — \_utilities-grid.css style props](issues/11-utilities-grid.md) — blocked by: 08 · S
- [12 — \_utilities-flex.css style props](issues/12-utilities-flex.md) — blocked by: 08 · S
- [13 — \_utilities-color.css style props](issues/13-utilities-color.md) — blocked by: 08 · S
- [14 — \_utilities-typography.css style props](issues/14-utilities-typography.md) — blocked by: 08 · S
- [15 — \_utilities-position.css style props](issues/15-utilities-position.md) — blocked by: 08 · S
- [16 — Wiring: index.css imports, head.ts BASE lists, package.json exports, manifest base entries](issues/16-wiring.md) — blocked by: 09, 10, 11, 12, 13, 14, 15 · S
- [17 — examples/style-props.html + browser verification](issues/17-example-style-props.md) — blocked by: 16 · S
- [18 — Primitive audit: --step-\* in component rules → --ui-\* per ADR-0008](issues/18-primitive-audit.md) — blocked by: 17 · M
- [19 — build-dist.mjs + lightningcss + vite.config.ts + build order](issues/19-build-dist.md) — blocked by: 16 · M
- [20 — DIST_CSS in manifest + dist.test.ts](issues/20-dist-manifest-test.md) — blocked by: 19 · S
- [21 — /combine/ dry run + README dist section](issues/21-combine-dry-run.md) — blocked by: 19, 20 · S
- [22 — migrations/0.5.0.json + files entry + migrations.test.ts](issues/22-migration-rules.md) — blocked by: 03, 05, 08 · S
- [23 — Migrate engine (pure) + unit tests](issues/23-migrate-engine.md) — blocked by: — · M
- [24 — zazz-ui migrate command + registration + zazz.json stamp + README](issues/24-migrate-command.md) — blocked by: 23 · M
- [25 — Migrate e2e test](issues/25-migrate-e2e.md) — blocked by: 22, 24 · S
- [26 — CHANGELOG 0.5.0 entry](issues/26-changelog-0-5-0.md) — blocked by: 01, 22 · S
- [27 — Repo-wide codemod run (serial, sole owner)](issues/27-codemod-run.md) — blocked by: 04, 05, 06, 16, 22, 24 · S
- [28 — Hand-convert examples to style props](issues/28-examples-style-props.md) — blocked by: 17, 27 · M
- [29 — Docs: style-props page + responsive rewrite](issues/29-docs-style-props-responsive.md) — blocked by: 27 · M
- [30 — Docs: optimize.mdx + csp.mdx](issues/30-docs-optimize-csp.md) — blocked by: 21, 27 · M
- [31 — Docs: Upgrading to 0.5](issues/31-docs-upgrading.md) — blocked by: 24, 26, 30 · S
- [32 — Docs prose sweep of existing pages](issues/32-docs-prose-sweep.md) — blocked by: 27 · M
- [33 — Agent docs: zazz skill, CONVENTIONS ladder rung, READMEs, AGENTS.md](issues/33-agent-docs.md) — blocked by: 02, 08, 27 · M
- [34 — Regression: examples-migrated.test.ts + computed-style comparison vs 0.4.1](issues/34-regression-check.md) — blocked by: 27, 28 · S
- [35 — Release-ready checklist + after-numbers](issues/35-release-ready.md) — blocked by: 18, 20, 21, 25, 26, 29, 30, 31, 32, 33, 34 · S

## Decisions so far

<!-- one line per resolved ticket; gist + link -->

- 01: 0.4.1 baseline in `CHANGELOG.md` under `## 0.5.0 (unreleased)`: 304,258 B raw, 29,125 br (zlib q11), 39,174 CDN br, 2,189 rules, `_utilities.css` 159,583 B, coverage on `layout.html` 60,226 used / 244,032 unused (style rules only: Chrome's panel figure counts whole `@layer` blocks as used, see the ticket). Re-run `.scratch/style-props/measure.mjs` for ticket 35's after-numbers. ([01](issues/01-baseline-numbers.md))
- 08: `src/props.ts` is the prop registry (`BREAKPOINTS`, `PROPS`, `propNames()`, `propertiesCss()`); `vp run properties` regenerates `src/base/_properties.css` (264 × `syntax: "*"; inherits: false`, no initial-value, `@layer none`) from the compiled `src/props.js`. Names per the collision exception above (`border-color`, `text-size`, `line-height`, `letter-spacing`); `--gap-xs…xl` tokens removed from `_variables.css`, guarded by `tokens.test.ts`; `props.test.ts` guards drift, count, shape and future collisions. ([08](issues/08-props-source-and-properties.md))
- 11: `_utilities-grid.css` — `--grid-cols` (display: grid, sets `--_grid-cols`, `repeat(N, minmax(0, 1fr))`), `--grid-rows` (sets `--_grid-rows`, `repeat(N, auto)` as `.grid-rows-N`), `--col-span` / `--row-span` clamped by `min()` to the parent's `--_grid-*` exactly as the classes are; base + sm…2xl blocks in `@layer zazz.utilities`, gated on `[style*="--x:"]`. Verified in Chrome. ([11](issues/11-utilities-grid.md))
- 16: `index.css` imports `_properties.css` after `_variables.css` and the eight style-prop files (`spacing`, `spacing-responsive`, `sizing`, `grid`, `flex`, `color`, `typography`, `position`) after `_utilities.css` + `_layout.css`; `head.ts` `BASE_CSS_PRE/POST` mirror it (16 base links in the granular CDN head) and `head.test.ts` diffs the list against `index.css`; `package.json` exports `./dist/*`; `manifest.ts` needed nothing. Gap for a later ticket: the CLI's `V1_BASE_CSS` in `packages/cli/src/plan.ts` still lists the 0.4.1 seven. ([16](issues/16-wiring.md))
- 22: `packages/core/migrations/0.5.0.json` ships in the tarball (`files`): 15 token rules (`--is-breakpoint-*`→`--bp-*`, `--breakpoint-*` shift, `--gap-*`→`--space-*`), 10 class-prefix shifts (`@*:` and `@max-*:`), 5 `data-container` attr-value shifts, 2 manual needles (`className={`, `[`); no `class` rules. `src/migrations.test.ts` validates it with the CLI's own `loadRules` and holds the CHANGELOG drift guard: rename row = table row whose first two cells are single code spans; forward half skipped until ticket 26, reverse half live. ([22](issues/22-migration-rules.md))
