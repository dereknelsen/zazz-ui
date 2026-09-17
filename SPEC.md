## Decisions locked (the spec)

1. **Finite values → classes** (`grid`, `hidden`, `bg-primary`, `p-md`); **open values → slots** (`style="--px: 4"`); **variants on primitives → `data-*` attributes**; **bundles → primitives**.
2. **Slot names = Tailwind roots** (`--px`, `--gap`, `--grid-cols`, `--w`, `--bg`, `--text`); responsive suffix `--px-md`; every slot gets `@property { syntax: "*"; inherits: false }`.
3. **Tokens:** `--space-2xs`…`--space-2xl` (one family, replaces per-property size tokens); `--bp-{sm,md,lg,xl,2xl}` container flags at 40/48/64/80/96rem; `--screen-*` viewport flags; `--ui-*` for primitive defaults; Shadcn color tokens unchanged.
4. **Selectors:** `[style*="--px:"]` in `utilities` layer; responsive rules inside `@container style(--bp-md: true)`; `--grid-cols` implies `display: grid`.
5. **Distribution:** `zazz.css` (all), `base.css`, `utilities.css`, `utilities-<family>.css`, `utilities-spacing-responsive.css`, `primitives/<name>.css`, `layers.css`, `compat-tailwind.css` (opt-in numeric classes); `/combine/` documented; `@import` only in `src/`.

## Phase 0 — Baseline

1. Run DevTools Coverage on `examples/layout.html`; record used/unused bytes.
2. `curl -sI -H "Accept-Encoding: br" https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.4.1/dist/zazz.css` → record transfer size.
3. `grep -c "{" dist/zazz.css` → record rule count.
4. Save all three in `CHANGELOG.md` under "0.4.1 baseline". These are the before-numbers the release notes need.

## Phase 1 — Tokens

1. Add `--space-2xs`…`--space-2xl` as literal rem in `_variables.css`.
2. Rename `--is-breakpoint-*` → `--bp-*` with the Tailwind scale; add `--screen-*` via `@media` on `:root`.
3. Point every `.p-*`, `.m-*`, `.gap-*` class at `--space-*`; delete the old per-property size tokens.
4. Verify: docs site renders identically. Commit as `tokens: space scale + bp flags`.

## Phase 2 — Slot utilities

1. Create `src/base/_properties.css` with one `@property` per slot.
2. One file per family: `_utilities-spacing.css`, `-sizing.css`, `-grid.css`, `-flex.css`, `-color.css`, `-typography.css`, `-position.css`. Base rule + five `@container style(--bp-*)` blocks each.
3. Move numeric class scales (`p-4`, `w-64`, `grid-cols-3`) out of the main files into `_compat-tailwind.css`. Nothing is deleted; it's relocated.
4. Verify: a scratch page with `style="--px: 8; --px-md: 12"` on a `div` and on a `ui-button`; confirm the `utilities` layer wins in both.

## Phase 3 — Primitives

1. Per primitive: replace hard-coded paddings/sizes with `--ui-<name>-*` tokens read from `:root`.
2. Remove any internal utility-class usage; primitives depend on tokens only.
3. Verify after each: slot override works, theme override via `:root { --ui-field-px: 5 }` works, no leak into children.

## Phase 4 — Distribution

1. Build script emits the file map from §5 into `dist/`; each file wraps its rules in its layer.
2. `layers.css` = the one-line `@layer` order; `zazz.css` = concatenation in that order.
3. Test a `/combine/` URL with `base.css` + one utility family + one primitive; check for `url()` breakage (fonts).

## Phase 5 — Codemod

Ship as `zazz migrate` in the existing CLI. Scope for 0.5.0:

1. **CSS:** `--is-breakpoint-*` → `--bp-*`; old size tokens → `--space-*`; breakpoint scale renames (`@xs:` at 40rem → `@sm:`).
2. **HTML:** numeric utility classes → slots (`class="p-4 w-64"` → `class="" style="--p: 4; --w: 16rem"`), merging into an existing `style` attribute; or `--compat` flag to leave classes and add the compat stylesheet link instead.
3. **Report:** every file touched, every class it couldn't map (arbitrary `[…]` values, JSX `className` expressions), with line numbers.
4. `--dry-run` prints a diff and writes nothing. Default is dry-run; `--write` applies.
5. Out of scope, stated in the README: JSX/TSX `style={{}}` merging, Vue/Svelte templates. Those users get the compat file.

## Phase 6 — Changelog + docs

1. `CHANGELOG.md` for 0.5.0 with sections **Breaking / Renamed / Removed / Added / Migration**, and a before→after table for every renamed token, class, and breakpoint. This is the file the codemod's mapping table is generated from, so write it first and keep both in sync from one source (`migrations/0.5.0.json`).
2. Docs pages: _Slots vs classes_, _Responsive (container vs viewport)_, _Optimize your CSS_ (`/combine/`, layers, async loading), _CSP_, _Migrating from 0.4_.
3. Update every example page to the new syntax; they are the regression suite.

## Phase 7 — Release

1. Publish `0.5.0` (pre-1.0, so minor = breaking under semver).
2. Publish `0.4.2` with a console-free deprecation note in the README pointing at the migration guide.
3. Re-run Phase 0 measurements; put after-numbers next to the before-numbers in the changelog.

Phases 1–4 are the critical path; 5 and 6 can run in parallel once Phase 2's names are frozen.
