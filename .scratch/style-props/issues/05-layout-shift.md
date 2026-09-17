# 05 — _layout.css: flags, band names, data-container, @max-*, new 2xl

Type: task
Status: resolved
Blocked by: 03
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_layout.css`

## Task

Edit only `_layout.css`. The whole breakpoint vocabulary shifts one step (xs→sm … xl→2xl; user decision).

1. Flags: `style(--is-breakpoint-X: true|false)` → `style(--bp-Y: …)` with the shift; `.\@xs\:container` → `.\@sm\:container`, `@max-xs:` → `@max-sm:`, …, xl → 2xl.
2. Band grid: rename line names `container-xs-start/end` → `container-sm-start/end` … `xl` → `2xl`; `--breakpoint-*` reads follow ticket 03's names (`--breakpoint-sm` = 40rem). Keep the clamp math identical per band width.
3. `data-container="xs|sm|md|lg|xl"` selectors shift to `sm|md|lg|xl|2xl`; `full`/`bleed` unchanged. `--article-*` (ch scale) unchanged.
4. `--gutters` untouched (03 repoints it). Header comment updated.

Acceptance: no `is-breakpoint`, `@xs`, `container-xs`, `="xs"` strings; `vp check` passes; explain in the ticket Answer which band now maps to which rem.

## Answer

Edited only `packages/core/src/base/_layout.css` (one simultaneous regex mapping over `--is-breakpoint-X`, `--breakpoint-X`, `--container-X`, `container-X-{start,end}`, `\@X\:` / `\@max-X\:` and `data-container="X"`, so nothing shifted twice; `--article-*` was excluded from the pattern). Every clamp() keeps its shape; only the token names inside it moved, so each band's rem width is unchanged.

### What changed

1. **Flags + class prefixes.** `style(--is-breakpoint-X: true|false)` → `style(--bp-Y: …)`; `.\@xs\:container` → `.\@sm\:container` … `.\@xl\:container` → `.\@2xl\:container`, and the same for `@max-*`. The `@sm` min variant keeps the `unset` container-name/type pair the old `@xs` block had (only names moved).
2. **Band grid.** Line names shift (`container-sm` is now the innermost band, `container-2xl` the outermost, next to `full`/`bleed`); `--breakpoint-*` reads follow ticket 03. The published line-range vars are `--container-{sm,md,lg,xl,2xl,full,bleed}`. The default band `--default-container-grid-column` now reads `var(--container-lg)` (the same 64rem band that `var(--container-md)` was).
3. **`data-container` values** shift to `sm|md|lg|xl|2xl` on both the per-container and per-child selectors; `full`/`bleed` unchanged. The article variant's selectors shift too, but the `--article-*` ch tokens do not, so each value now reads the token one step behind (`data-container="sm"` → `--article-xs` = 45ch …) — every reading width stays what it was; commented inline.
4. **`--gutters`** untouched. Comments updated (`--bp-*` gate description matches ticket 03's corrected container-query subject) and a CSSDoc header added (the file had none).

`vp check`: pass (one pre-existing warning in `scripts/generate-sri.mjs`, not from this ticket). `vp test`: 15 files, 122 tests pass. Old names remain in `_utilities.css` (ticket 04) and `primitives/navigation-menu/navigation-menu.css` (ticket 06); the examples still use `@xs:`…/`data-container="xs"` (ticket 27's codemod).

### Band table (old → new; width identical per row)

| Old name | New name | Width (rem) | Line names | `data-container` |
| --- | --- | --- | --- | --- |
| xs | sm | 40 | `container-sm-start` / `container-sm-end` | `sm` |
| sm | md | 48 | `container-md-start` / `container-md-end` | `md` |
| md | lg | 64 | `container-lg-start` / `container-lg-end` | `lg` |
| lg | xl | 80 | `container-xl-start` / `container-xl-end` | `xl` |
| xl | 2xl | 96 | `container-2xl-start` / `container-2xl-end` | `2xl` |
| full | full | no cap (gutters kept) | `container-full-start` / `container-full-end` | `full` |
| bleed | bleed | edge to edge | `container-bleed-start` / `container-bleed-end` | `bleed` |

Article variant (`data-variant="article"`), ch widths unchanged: `sm` 45ch (`--article-xs`), `md` 50ch (`--article-sm`), `lg` 65ch (`--article-md`), `xl` 70ch (`--article-lg`), `2xl` 75ch (`--article-xl`); default stays `--article-lg` (70ch).

## Comments
