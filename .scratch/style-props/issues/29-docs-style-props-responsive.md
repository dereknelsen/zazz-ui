# 29 — Docs: style-props page + responsive rewrite

Type: task
Status: claimed
Blocked by: 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/core-concepts/style-props.mdx`
- `apps/docs/content/docs/core-concepts/responsive-design.mdx`
- `apps/docs/content/docs/core-concepts/meta.json`

## Task

Fumadocs MDX (mirror front-matter/components of `core-concepts/utility-classes.mdx`). New `style-props.mdx` "Style props vs classes": the value-shape rule (/SPEC.md §1), the 44 props by family with value kind (read `packages/core/src/props.ts`), numeric spacing semantics (`--px: 6` == `p-md`), responsive suffixes, coordination (`--gap` + basis, `--grid-cols` implies grid), the attribute gate ("no space before the colon"; framework `setProperty` works), pitfalls (`--px: 1rem` → 0; `auto`), CSP note linking to the CSP page (ticket 30). Rewrite `responsive-design.mdx` as "Responsive: container vs viewport": `--bp-*` container flags (nearest size container, mobile-first, 40/48/64/80/96rem) vs `--screen-*` viewport flags via `@media`; class prefixes `@sm:` and prop suffixes `-sm`; the 0.5 shift with a link to the upgrading page. Insert `style-props` after `utility-classes` in `meta.json`. Run `vp run docs#dev` and open both pages.

## Answer

## Comments
