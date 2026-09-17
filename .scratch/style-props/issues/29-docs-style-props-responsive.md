# 29 — Docs: style-props page + responsive rewrite

Type: task
Status: resolved
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

Delivered: `apps/docs/content/docs/core-concepts/style-props.mdx` (new, "Style props vs classes"), `core-concepts/responsive-design.mdx` (rewritten as "Responsive: container vs viewport"), `core-concepts/meta.json` (`style-props` inserted after `utility-classes`), and `templates/style-props.mdx` (ticket 17's placeholder link to utility-classes now points at the new page). Front matter and components mirror `utility-classes.mdx` (plain MDX, no imports); prose with one worked example per concept; sentence-case headings.

`style-props.mdx`: the value-shape rule (/SPEC.md §1) as a four-row table plus the five-rung ladder from ADR-0012; the 44 props as seven per-family tables (prop, CSS property, value kind) taken from `src/props.ts`, with the naming exception spelled out (`border-color`, `text-size`, `line-height`, `letter-spacing`; `--text` is a color); numeric spacing (`--px: 6` == `px-md`, the `--space-*` step table 1/2/4/6/11/24/40, with 2xs and 2xl marked token-only because the class scale is xs–xl); responsive suffixes with a pointer to the responsive page; coordination (`--gap` sets `--_gap` for `basis-1/N`; `--grid-cols` implies `display: grid`, beats `hidden`, so a grid that appears at a breakpoint uses `--grid-cols-md`); props on components (utilities after components; the ticket-17 nuance that a `--ui-field-padding` override must sit on `:root` and the scoped lever is `--ui-button-padding`); the attribute gate (no space before the colon, formatter normalises, `setProperty` serialises to the matching form, unset props apply nothing, gates are prefix-free, `inherits: false`); pitfalls (`--px: 1rem` → 0, `auto` → 0 so use `mx-auto`, the ticket-13 inline `border` shorthand caveat, no inheritance, not a CSP workaround with a link to `/docs/getting-started/csp`).

`responsive-design.mdx`: one scale table (sm…2xl at 40/48/64/80/96rem with `--bp-*`, `--screen-*`, `--breakpoint-*`); container flags (nearest size container: body, main, header, section, article; `.container` is `container-type: normal`); the ticket-09 nuance as its own subsection (`style()` resolves on the parent, so a prefix or suffix on a direct child of a size container follows the container above; one wrapper in follows the parent); viewport flags (`@media` on `:root`, nothing in the utilities reads them, an `@container style(--screen-lg: true)` example for author CSS; `*-screen-*` classes are lengths, not flags); class prefixes vs prop suffixes (same flag, same moment; prefixed families summarised with a link to the foundation reference; spacing, sizing, color, typography and position have no prefixed classes, the suffixed props cover them; `@max-*` is `.container`-only); fluid sizing and breakpoint-free layouts condensed to one section; the 0.5 shift (old xs → sm … xl → 2xl across prefixes, tokens, band names and `data-container`; `--is-breakpoint-*` → `--bp-*`; `--screen-*` new; `zazz-ui migrate`) linking `/docs/getting-started/upgrading`.

Verification: `pnpm install`; `vp check` clean repo-wide (454 files formatted, no lint or type errors; `--fix` only realigned table columns and rewrote `*its*` as `_its_`). `vp run docs#dev` on :3001; both pages opened in Chrome via `agent-browser` under the right titles, every heading present, 9 and 2 tables rendered, no Next error overlay, sidebar shows "Style props vs classes" directly after "Styling with utility classes". `curl` on every outgoing link: all 200 except the two forward links to pages tickets 30 and 31 create (`/docs/getting-started/csp`, `/docs/getting-started/upgrading` are 404 until then). Server stopped afterwards.

Gaps for other tickets:

- `foundation/utilities/responsive-design.mdx` (the reference page, not in this ticket's file list) still says spacing, sizing and color are base-only and that the `body` container sets the flags. Both are stale: every prop takes the five suffixes, and the subject is the nearest size container. Ticket 32's prose sweep.
- `apps/docs/AGENTS.md` is regenerated by `next dev`; content unchanged, no diff.

## Comments
