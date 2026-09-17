# 27 — Repo-wide codemod run (serial, sole owner)

Type: task
Status: resolved
Blocked by: 04, 05, 06, 16, 22, 24, 36
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/examples/*.html`
- `packages/core/src/primitives/**/*.html`
- `packages/core/src/primitives/**/*.css (remaining --breakpoint reads)`
- `apps/docs/content/**/*.mdx`
- `apps/docs/lib/*.ts`
- `.claude/skills/**/*.md`
- `packages/core/*.md`
- `README.md`
- `AGENTS.md`

## Task

This is the codemod's first real run and the only ticket allowed to touch these files broadly. Build the CLI (`vp run build` in packages/cli, or run via `node --experimental-strip-types src/cli.ts` if that's how e2e runs it) and execute from the repo root: `zazz-ui migrate --rules packages/core/migrations/0.5.0.json --from 0.4.1 --to 0.5.0 --write --exclude 'packages/core/CHANGELOG.md' --exclude 'packages/core/migrations/**' --exclude 'docs/adr/**' --exclude 'apps/docs/content/docs/getting-started/upgrading.mdx' --exclude '**/node_modules/**' --exclude '**/dist/**' --exclude '.scratch/**'` (add `--exclude 'packages/core/src/base/**'` since 03–06 already did those by hand). Review the diff file by file; fix anything the codemod could not map by hand (report list) and record those cases in this ticket's Answer — they are the codemod's known gaps. Then `vp run heads` in packages/core, `vp check` at root, `vp test` in packages/core. Enable the skipped assertions in `tokens.test.ts` (ticket 07) and confirm `git grep -n -e "is-breakpoint" -e "@xs:" -e "@max-xs" -e 'data-container="xs"' -e "--gap-"` returns only CHANGELOG/migrations/ADR/upgrading hits.

## Answer

Ran the built CLI (`vp run build` in `packages/cli`, then `node packages/cli/dist/cli.js migrate`) from the repo root against `packages/core/migrations/0.5.0.json` (102 rules), `--from 0.4.1 --to 0.5.0`, dry run first, then `--write`. 39 files rewritten by the codemod; 25 more files hand-fixed for the gaps below. `tokens.test.ts`'s last `it.skip` (the `@xs` / `@max-xs` sweep) is enabled: `packages/core` `vp test` 18 files, 167 passed, 0 skipped.

### Command

```
node packages/cli/dist/cli.js migrate . .claude/skills \
  --rules packages/core/migrations/0.5.0.json --from 0.4.1 --to 0.5.0 --write \
  --include 'packages/core/examples/**' --include 'packages/core/src/primitives/**' \
  --include 'apps/docs/content/**' --include 'apps/docs/lib/**' --include 'apps/docs/components/**' \
  --include '.claude/skills/**' --include 'packages/core/*.md' --include 'README.md' --include 'AGENTS.md' --include 'CONTEXT.md' \
  --exclude 'packages/core/CHANGELOG.md' --exclude 'packages/core/migrations/**' --exclude 'docs/adr/**' \
  --exclude 'apps/docs/content/docs/getting-started/upgrading.mdx' --exclude '**/node_modules/**' --exclude '**/dist/**' \
  --exclude '.scratch/**' --exclude 'packages/core/src/base/**' --exclude 'packages/cli/**'
```

`.claude/skills` had to be named as a positional path: the walker's `fs.globSync("**/*.{…}")` does not descend into dot-directories, so `--include '.claude/skills/**'` alone scanned 0 skill files (306 files without it, 319 with). No `zazz.json` at the root, so nothing was stamped and `--from` was the only guard.

### Dry-run report (condensed)

`Scanned 319 files (0.4.1 → 0.5.0)`, `39 of 319 files changed`, exit 2. Rules applied (hit count): `--is-breakpoint-md → --bp-lg` 2 · `--breakpoint-xs…xl` shift 9/8/7/8/9 · `--gap-xs…xl → --space-*` 9/9/15/7/11 · `@xs: → @sm:` 11 · `@sm: → @md:` 25 · `@md: → @lg:` 37 · `@lg: → @xl:` 9 · `@max-md: → @max-lg:` 4 · `max-w-screen-xs → -sm` 1 · `max-w-screen-sm → -md` 5 · `data-container` xs/sm/md/lg/xl 8/5/6/6/3 · `className={` (by hand) 31 · `[` (by hand) 3. No other `class` or `@max-*` rule fired. Changed: 17 MDX pages, `apps/docs/lib/zazz-iframe.ts`, 7 example pages, 5 primitive html demos, 3 primitive css files (`command.css`, `dialog.css` ×2, `navigation-menu.css` — the `--breakpoint-*` reads ticket 06 left), 6 skill files.

"Could not map 34 places": all in `apps/docs/components/*.tsx` — 31 `className={cn(…)}` / `className={className}` expressions and 3 Tailwind arbitrary values (`[animation-delay:0ms]`). Every one is a false positive: those files use fumadocs' Tailwind classes, and `git grep` for any old Zazz name across `apps/docs/components`, `lib` and `app` found only `data-container="bleed"`. Nothing to shift there.

### Hand-fixes (the codemod's gaps)

Each is a place the rule kinds (`token`, `class`, `class-prefix` inside `class="…"`, exact `attr` value) cannot reach. All shifts keep the rem threshold and move the name one step, exactly as the rules do for literals.

1. **String data in TSX** — `apps/docs/components/band-diagram.tsx`: the `BANDS` table (`{ name: "xs", rem: 40 }` … `{ name: "md", rem: 64, isDefault: true }`) and `FLOW_CHILDREN` (`band: "md", rem: 64`) are plain strings; renamed to `sm…2xl`, default `lg`, `MdGuides` → `LgGuides`, caption `md` → `lg`.
2. **Prose and text nodes naming a prefix outside `class="…"`** — example captions and comments (`responsive.html` ×11, `layout.html` ×10, `index.html` ×2), primitive demo captions (`utilities/responsive-flex.html`, `responsive-grid.html`), a css header comment (`carousel.css` `@uses … @sm:basis-*`), and MDX prose/backticks in `core-concepts/layout.mdx`, `templates/{index,layout,products,responsive}.mdx`, `getting-started/first-page.mdx`, skills `PATTERNS.md`/`references/tokens.md`.
3. **Table cells** — the band tables (`core-concepts/layout.mdx`, `foundation/utilities/layout.mdx`: first column `xs`…`xl` had become `xs | caps at --breakpoint-sm 40rem`, internally inconsistent after the token rule fired), the article measure tables (same two pages: `sm`=45ch … `xl` (default)=70ch, `2xl`=75ch), the prefix tables (`core-concepts/responsive-design.mdx`, `foundation/utilities/responsive-design.mdx`: `@xs:` rows had become `@xs: | 40rem | --breakpoint-sm`).
4. **Ranges and pipe lists** — `w-screen-xs` to `w-screen-xl` / `size-screen-xs` … / `max-w-screen-xs` to `xl` (`sizing.mdx`), `-screen-xs..xl` ×7 and `data-container="xs..xl"` (`tokens.md`), `data-container="xs|sm|md|lg|xl|full|bleed"` ×3 (`PATTERNS.md`, `tokens.md`), `@xs:* @sm:* …` and `` `@xs:` through `@xl:` `` (`tokens.md`, `foundation/utilities/index.mdx` ×2, `responsive-design.mdx` ×2 incl. a frontmatter `description`, `templates/{index,responsive}.mdx`, `examples/index.html`), band lists `` `xs sm md lg xl` `` / `` `xs` through `xl` `` (`DESIGN.md`, `tokens.md`, `first-page.mdx`, `templates/layout.mdx`, `layout.html`).
5. **Wildcard token mentions** — `--gap-*` → `--space-*` (skills `SKILL.md`, `DESIGN.md`, `PATTERNS.md`, `tokens.md`, `zazz-new-design-style/SKILL.md` ×3, `packages/core/CONVENTIONS.styles.md`, `foundation/variables.mdx`), `var(--gap-{size})` ×5 → `--space-{size}` (`foundation/utilities/layout.mdx`), `--is-breakpoint-*` → `--bp-*` (`tokens.md`). The `.gap-*` class family is unchanged and was left alone.
6. **Bare band words in prose** — "default `md` band" → `lg` (`README.md` ×2, `first-page.mdx`, `core-concepts/layout.mdx` ×3, `foundation/utilities/layout.mdx` ×2, `DESIGN.md`, `PATTERNS.md`, `tokens.md`, `forms.html`, `layout.html`), "the `xs` band" → `sm` (`products.mdx`, `layout.html`), "wider `lg` band" → `xl` (`first-page.mdx`), article "Default `lg`" → `xl` (`tokens.md`, since `data-container` values sit one step behind the unchanged `--article-*` ch tokens).
7. **Pre-existing mislabel fixed in passing** — `examples/layout.html` labelled the 80rem row "the default band" on `main` too, while `_layout.css` defaulted to 64rem. The label now sits on `data-container="lg"` · 64rem.

Left alone on purpose: generic mentions of prefixes that still exist (`@md:grid-cols-3`, `@md:flex-row`, `@md:container` "from its breakpoint up") in `utility-classes.mdx`, `flexbox.mdx`, `foundation/utilities/layout.mdx` L63, `core-concepts/layout.mdx` L176, `SKILL.md` L132; size-scale ranges (`p-xs` to `p-xl`, `--radius-xs|…|xl`, `--shadow-*`, `--article-xs…xl`, type `xs`…`xl`), which are not breakpoints; `container-*-start/end` line names (only in the excluded CHANGELOG). Tickets 29/32 own the prose beyond mechanical renames.

### Verification

- `packages/core`: `tsc -p tsconfig.json` clean; `vp run heads` 0 files updated; `vp test` 18 files, 167 passed (the `@xs` sweep now live); `vp check` formatted, 0 errors, the pre-existing `generate-sri.mjs` warning only.
- Root: `vp check --fix` re-aligned 10 md/mdx tables; `vp check` then all 448 files formatted, 7 errors, all the pre-existing Next.js typegen ones (`PageProps` / `LayoutProps` / `RouteContext` in `apps/docs/app/**`), none in touched files.
- `git grep -n -e "is-breakpoint" -e "@xs:" -e "@max-xs" -e 'data-container="xs"' -e "--gap-"` outside CHANGELOG/migrations/ADR/cli/.scratch: only `SPEC.md` (describes the rename), `_properties.css` / `_utilities-spacing*.css` (the `--gap-sm…2xl` style props), and the tests that assert the old names are gone.
- Served `packages/core` statically; `examples/index.html`, `layout.html`, `responsive.html` in agent-browser: no console output, no page errors. `layout.html` stacks bleed → full → 2xl/96 → xl/80 → lg/64 (primary, "the default band"); `responsive.html` at an 80rem viewport shows six grid columns (`@xl:grid-cols-6`) with captions matching the shifted classes.

## Comments
