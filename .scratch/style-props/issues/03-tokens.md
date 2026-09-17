# 03 — Tokens: --space-*, --gap-* aliases, --bp-*, --screen-*, --breakpoint-* shift

Type: task
Status: resolved
Blocked by: —
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_variables.css`

## Task

Edit only `_variables.css`. Read the frozen design in `.scratch/style-props/spec.md` first.

1. Spacing (§6 of the file): add `--space-2xs: var(--step-1); --space-xs: var(--step-2); --space-sm: var(--step-4); --space-md: var(--step-6); --space-lg: var(--step-11); --space-xl: var(--step-24); --space-2xl: var(--step-40);`. Rewrite `--gap-xs…xl` as deprecated aliases `--gap-md: var(--space-md)` etc. with a comment "deprecated 0.5.0, removed 0.6.0". `--gutters: var(--space-md)`.
2. Breakpoints: rename length tokens to `--breakpoint-sm: 40rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem; --breakpoint-2xl: 96rem`.
3. Flags: replace the five `@property --is-breakpoint-*` registrations with `@property --bp-{sm,md,lg,xl,2xl}` (same syntax "true | false", inherits: true, initial-value: false) and the five `@container (width >= N)` blocks set `--bp-sm` at 40rem … `--bp-2xl` at 96rem. Fix the comment: the container-query subject is the nearest size container (unnamed query), not "the body container".
4. Viewport flags: add `@property --screen-{sm,md,lg,xl,2xl}` (same shape) and five `@media (width >= N) { :root { --screen-X: true; } }` blocks next to the container blocks.
5. Update the file header (`@requires _properties.css` stays — ticket 08 creates it).

Do NOT touch other files (04/05/06 own them). Acceptance: no `--is-breakpoint` string remains in this file; `grep -c "bp-" ` shows 5 registrations + 5 setters; `vp check` passes.

## Answer

Edited only `packages/core/src/base/_variables.css` (140 insertions, 47 deletions). Consumers of the old names in `_utilities.css`, `_layout.css`, `_typography.css`, `_reset.css` and the primitives are untouched (tickets 04/05/06 own them); `--gap-xs…xl` still resolve through the aliases, so nothing breaks in the meantime.

### What changed

1. **Spacing (§5 of the file — the ticket said §6; Spacing is §5, Radius is §6).** Added the `--space-*` family as step multiples, kept fluid via `--spacing-interval`. `--gap-xs…xl` rewritten as aliases of `--space-*` with the comment "deprecated 0.5.0, removed 0.6.0". `--gutters` now reads `var(--space-md)` (byte-identical value: `--step-6`).
2. **Breakpoint lengths (§7).** Shifted one step: `--breakpoint-{sm,md,lg,xl,2xl}` = 40/48/64/80/96rem. `--breakpoint-xs` is gone; `--breakpoint-2xl` is new.
3. **Container flags.** The five `@property --is-breakpoint-*` registrations replaced by `@property --bp-{sm,md,lg,xl,2xl}` (`syntax: "true | false"; inherits: true; initial-value: false`). The five `@container (width >= N)` setters now set `--bp-sm` at 40rem … `--bp-2xl` at 96rem; selector `:where(body *)` unchanged. Comment corrected: these are unnamed size queries, so the subject is the nearest ancestor with a `container-type` (`body`, `main`, `section`, `article` are all `inline-size` containers per `_reset.css`), not "the body container" and not the viewport.
4. **Viewport flags (new).** `@property --screen-{sm,md,lg,xl,2xl}` (same shape) plus five `@media (width >= N) { :root { --screen-X: true; } }` blocks directly after the container blocks. Range syntax (`width >= 40rem`) used in both `@container` and `@media` preludes; literal rem because `var()` is invalid there.
5. **Header.** `@requires layers.css, _properties.css` (dangling until ticket 08 creates the file, as agreed); two new `@uses` lines (`@property` flags; `@container`/`@media` range syntax); `@tokens` now names `--space-2xs…2xl`, `--breakpoint-*`, `--bp-*`, `--screen-*`.

### Final token table

| Token | Value |
| --- | --- |
| `--space-2xs` | `var(--step-1)` |
| `--space-xs` | `var(--step-2)` |
| `--space-sm` | `var(--step-4)` |
| `--space-md` | `var(--step-6)` |
| `--space-lg` | `var(--step-11)` |
| `--space-xl` | `var(--step-24)` |
| `--space-2xl` | `var(--step-40)` |
| `--gap-xs` … `--gap-xl` | `var(--space-xs)` … `var(--space-xl)` (deprecated 0.5.0, removed 0.6.0) |
| `--gutters` | `var(--space-md)` |
| `--breakpoint-sm` / `--bp-sm` / `--screen-sm` | 40rem |
| `--breakpoint-md` / `--bp-md` / `--screen-md` | 48rem |
| `--breakpoint-lg` / `--bp-lg` / `--screen-lg` | 64rem |
| `--breakpoint-xl` / `--bp-xl` / `--screen-xl` | 80rem |
| `--breakpoint-2xl` / `--bp-2xl` / `--screen-2xl` | 96rem |

`--bp-*` = nearest size container (`@container`, set on `:where(body *)`); `--screen-*` = viewport (`@media`, set on `:root`). All ten registered `syntax: "true | false"; inherits: true; initial-value: false`.

### Verification

- `grep -c is-breakpoint _variables.css` → 0; `@property --bp-*` × 5, `--bp-*: true` setters × 5; `@property --screen-*` × 5, `--screen-*: true` setters × 5.
- `vp fmt --check packages/core/src/base/_variables.css` passes. `packages/core` `vp test`: 15 files, 122 tests, all pass.
- Root `vp check` reports formatting issues only in 17 pre-existing `.scratch/style-props/*.md` files from the planning commit (cdb2e41). Deliberately not fixed: oxfmt rewrites bare `*` in token names as `_` / `\*` (e.g. `--space-*` → `--space-_`), which would corrupt ticket titles that `spec.md` links by. Left for whoever decides on an ignore rule for `.scratch/`.

## Comments
