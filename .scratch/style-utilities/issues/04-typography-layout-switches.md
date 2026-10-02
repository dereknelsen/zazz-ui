# 04 Phase 3: typography roles, layout primitive, switches, scroll-fade

Status: resolved
Type: task
Blocked by: 03

`data-ui="text-*"` roles with native heading defaults (claim 12); `src/primitives/layout/` replacing `_layout.css` (claim 11, claim 22 third case); `scroll-fade` primitive; `sr-only` and `grid-pile` switches.

## Comments

- 2026-09-30: claimed. `sr-only` and `grid-pile` switches already landed in Phase 2 (`base/_switches.css`). Order: typography roles (claim 12), layout primitive (claim 11, claim 22), scroll-fade.
- 2026-09-30: typography roles cycle green (claim 12 in `base/typography.browser.test.ts`): `data-ui="text-*"` roles, native headings share them, `data-ui="prose"`, `.font-*`/decoration classes dropped, `--text-decoration` prop added, mapper emits role tokens.
- 2026-09-30: layout cycle green (claims 11 and 22 in `primitives/layout/layout.browser.test.ts`): `layout.css` + fragment, manifest/index wiring, `base/_layout.css` deleted, the `--col` no-base rule excludes layout children (`Prop.noBaseExclude`, generator test), mapper maps `container` → `data-ui="layout"`. Responsive `@md:container` / `@max-md:container` uses in examples are Phase 4's.
- 2026-09-30: scroll-fade primitive green (`primitives/scroll-fade/`): y/x axes, size/reveal/mask hooks; the 0.4 per-edge and per-size class variants had no markup users and are not carried over. Stale compiled `src/*.js` (gitignored) had made the CLI e2e vendor `_layout.css`; re-emitted with tsc.
- 2026-09-30: reviewer pass folded in: roles moved from `zazz.utilities` to `reset` (SPEC §10 literal; SPEC role list corrected: no `text-lead`, `text-link`/`text-md` kept), layout restores `place-items: start stretch` (test), `layout.primitives` no longer pulls card css, stale `.container`/heading comments in `_reset.css`/`_variables.css` cleared, scroll-fade mask-hook test added. Deferred: the old `data-variant="article"` named container had no `@container article` consumers; examples map it to `data-ui="prose"` + `--max-w`/`--mx` in Phase 4. Docs site pages (layout, typography, dark-mode, utility-classes, home page `sr-only`) are the separate docs follow-up.
