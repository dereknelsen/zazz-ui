# 31 — Docs: Upgrading to 0.5

Type: task
Status: resolved
Blocked by: 24, 26, 30
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `apps/docs/content/docs/getting-started/upgrading.mdx`
- `apps/docs/content/docs/getting-started/meta.json`
- `apps/docs/content/docs/getting-started/migrating.mdx`
- `apps/docs/content/docs/getting-started/installation.mdx`

## Task

New `getting-started/upgrading.mdx` "Upgrading to 0.5": what changed (link changelog), `zazz-ui migrate` walkthrough (dry-run → review → `--write` → `update @0.5.0` for vendored projects; CDN users: bump the pinned version then run migrate on their own files), the before→after tables (copy from CHANGELOG, they're guarded there), the chain warning, manual cases (JSX expressions, Vue/Svelte templates). `migrating.mdx` is about migrating legacy CSS to Zazz — add a callout at its top pointing to upgrading.mdx. Link from `installation.mdx`. Append `upgrading` after `migrating` in `meta.json` (ticket 30 already edited this file; rebase on it).

## Answer

New `apps/docs/content/docs/getting-started/upgrading.mdx` "Upgrading to 0.5", appended to `getting-started/meta.json` after `migrating` (ticket 30's `csp` kept; the formatter reflowed the array to one entry per line), a `<Callout>` at the top of `migrating.mdx` pointing at it (that page is about legacy CSS; this one is 0.4 to 0.5), and one sentence in `installation.mdx`'s "pin a version" warning linking it.

### The page

- **What changed**: additive (style props, `--screen-*`, modular `dist/`, each linked to its page) versus breaking (the one-step breakpoint shift and every name it runs through, `--is-breakpoint-*` to `--bp-*`, `--gap-*` to `--space-*` with the "no alias, and `var(--gap-md)` below `:root` resolves to nothing because the name is now a non-inheriting prop" point, the default band moving to `--container-lg`, `--article-*` unrenamed). Links: `/docs/changelog`, `/docs/core-concepts/style-props`, `/docs/core-concepts/responsive-design`, `/docs/foundation/optimize`, `/docs/getting-started/csp`.
- **Do not sed this**: the chain (`@sm:` is source and target; same for `--breakpoint-sm`, `--container-sm`, `w-screen-sm`, `data-container="sm"`), why sequential renames double-shift in either order, why the codemod's one simultaneous pass does not and why that makes a second run unsafe (the `zazz.json` stamp).
- **Vendored projects**: dry run (`migrate --to @0.5.0`, what it resolves, scans, skips and prints), review (exclude files already in 0.5 vocabulary; read the "Could not map" list), write (stamp written even with unmappables; second run refused; `--from` override), `update @0.5.0`; the exit-code table (0 / 1 / 2) from ticket 24's Answer.
- **CDN and npm**: no `zazz.json`, so `--from 0.4.1` is required and nothing is stamped; CDN bumps the pin then `migrate --from 0.4.1 --to @0.5.0` (registry fetch, cached); npm bumps the dependency then `--rules node_modules/@zazz-ui/core/migrations/0.5.0.json` (offline). Warn callout: run the write once, diff the tree if unsure.
- **What the codemod cannot reach**, split by what the dry run reports versus what is silent, checked against the engine rather than the README (see below): reported are `className={…}`, template literals carrying a prefix, and `[…]` arbitrary values; silent are Vue `:class` / Svelte `class:` bindings, plain JS strings and arrays, prose and text nodes, breakpoint names as data (ticket 27's TSX `BANDS` table), `container-*-start/end` grid line names, and wildcard mentions. With the asymmetry ticket 27 hit: token and `data-container` rules fire in prose, prefixes do not.
- **The manual recipe**: shift from the top of the scale down (`xl` to `2xl` first, `xs` to `sm` last) so no target is a remaining source; scope each pass to one construct; then ticket 27's grep sweep extended with `screen-xs` and `container-xs`, with the note that `--gap-` also matches the new responsive `--gap-*` props.
- **Retuning the scale**: `:root { --gap-* }` becomes `--space-*`, `--gutters` reads `--space-md`, the seven step values.
- **Rename tables**: every rename table from `CHANGELOG.md` `## 0.5.0`, copied verbatim (flags, prefixes, breakpoint tokens, size tokens, `data-container`, the band/line-name table, `--container-*`, all 65 `*-screen-*` rows). A row diff against the changelog (table rows, whitespace-normalised) shows 107 of 107 identical; the only changelog rows the page lacks are the measurements table.

### Engine behaviour verified, not taken from the README

Ran `applyToText` from `packages/cli/src/migrate.ts` with the real `migrations/0.5.0.json` on probes. Rewritten: `class="@xs:flex w-screen-xs"`, `data-container="xs"`, `--gap-md` everywhere (CSS, Markdown prose, JSX `style={{ "--gap-md": 1 }}`), `.\@xs\:grid` in CSS, `className="@xs:flex"` literals. Reported, not rewritten: `className={cn(...)}`, `` `@sm:grid ${y}` ``, `[animation-delay:0ms]`. Silent (neither): `:class="{ '@xs:flex': open }"`, `class:@xs:flex={open}`, `const c = "@md:flex"`, `['@lg:flex']`, `container-xs-start` in CSS, `@xs:` in an HTML comment or text node, backticked `@xs:` in Markdown. The README's "the dry run points at each of them" overstates the Vue/Svelte case, so the page says those are silent and gives the grep.

### Checks

`pnpm install`; `vp check --fix` then `vp check` on the four files: formatted, oxlint has nothing to lint in MDX/JSON (as ticket 30). `tsc -p packages/core/tsconfig.json`, `next dev -p 3457`; all eight linked routes return 200 (`upgrading`, `migrating`, `installation`, `csp`, `style-props`, `responsive-design`, `optimize`, `changelog`); both in-page anchors (`#what-the-codemod-cannot-reach`, `#the-manual-recipe`) exist as ids; sidebar order head, CSP, migrating, upgrading, LLMs; the callout on `migrating` and the sentence on `installation` render with working links. Browser console: one React hydration-mismatch entry whose only differing attribute is `data-__ab-ci`, injected by `agent-browser` itself; nothing in Next's log. Server stopped.

### Notes for later tickets

`packages/core/package.json` is still `0.4.1` and the CDN snippet on the page pins `@0.5.0`; correct once ticket 35 cuts the release. If a future rules file adds a kind for grid line names or Vue/Svelte bindings, the "silent" list on this page is the place to shorten.

## Comments
