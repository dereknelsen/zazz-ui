# 04 — _utilities.css sweep: --gap-→--space-, flags, breakpoint prefix shift

Type: task
Status: resolved
Blocked by: 03
Size: L

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/src/base/_utilities.css`

## Task

Edit only `_utilities.css` (6758 lines). Names are frozen in `.scratch/style-props/spec.md`.

1. Every `var(--gap-xs|sm|md|lg|xl)` → `var(--space-*)` (same letter). This covers padding/margin setters, `.gap-*`, `.w-*/.h-*/.min-*/.max-*`, inset/top/… utilities. Do not change any value.
2. Responsive blocks: the two groups of five `@container style(--is-breakpoint-X: true)` blocks become `style(--bp-Y: true)` with the shift xs→sm, sm→md, md→lg, lg→xl, xl→2xl, and every escaped class prefix inside shifts the same way (`.\@xs\:hidden` → `.\@sm\:hidden`, …, `.\@xl\:` → `.\@2xl\:`). Apply as ONE simultaneous mapping (write a tiny node script with a single regex alternation; never sequential sed — `@sm:` would shift twice). The 40rem block keeps its rules and becomes `sm`; the 96rem block becomes `2xl`.
3. `.w-screen-*` / any `--breakpoint-xs…xl` reads shift the same way (`--breakpoint-sm` = 40rem now).
4. Update section comments and the file header (`@uses style() queries — read --bp-* flags`).

Acceptance: `grep -c "is-breakpoint\|--gap-\|@xs" _utilities.css` = 0; rule count unchanged (`grep -o "{" | wc -l` before/after); `vp check` passes.

## Answer

Done in one simultaneous regex pass (scratch node script, not committed) plus two literal comment edits. `packages/core/src/base/_utilities.css` is the only file touched.

Replacements by kind:

| Kind | Count | Mapping |
| --- | --- | --- |
| `var(--gap-*)` → `var(--space-*)` | 261 | same letter (xs 49, sm/md/lg/xl 53 each); values untouched |
| `style(--is-breakpoint-*)` → `style(--bp-*)` | 10 | shifted: 2 groups × 5 blocks; 40rem block is now `sm`, 96rem is `2xl` |
| `.\\@X\\:` class prefixes | 410 | shifted xs→sm→md→lg→xl→2xl (82 per prefix before and after) |
| `var(--breakpoint-*)` reads + block comments | 45 | shifted (9 per name; `--breakpoint-sm` = 40rem now) |
| `*-screen-*` class suffixes (w/h/size/min/max, inline/block aliases) | 65 | shifted so each class still resolves to the same rem (13 per suffix) |
| comment prose `--is-breakpoint-*`/`-X` → `--bp-*`/`-X` | 2 | section comment |
| header `@uses style()` line + responsive section comment + margin comment example (`@xs:-m-…` → `@sm:-m-…`) | 3 | hand/literal edits |

Rule count: 1371 before → 1371 after (`grep -o "{" | wc -l`). Lines 6758 → 6759 (section comment grew by one line).
Acceptance: `grep -c "is-breakpoint\|--gap-\|@xs" _utilities.css` = 0. `vp check` passes (only pre-existing warning in `scripts/generate-sri.mjs`); `vp test` 15 files / 122 tests pass — no failures attributable to other tickets at this branch tip.

Notes for downstream tickets: `--_gap` (internal coordination var) intentionally untouched; comments that name `@sm:/@md:` as generic examples were left as-is since those prefixes still exist.

## Comments
