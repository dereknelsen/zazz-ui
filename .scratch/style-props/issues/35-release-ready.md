# 35 — Release-ready checklist + after-numbers

Type: task
Status: resolved
Blocked by: 18, 20, 21, 25, 26, 29, 30, 31, 32, 33, 34, 36, 37
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/CHANGELOG.md`
- `.scratch/style-props/release.md`

## Task

1. `vp run build` in packages/core, re-run `.scratch/style-props/measure.mjs`, fill the "after" column of the measurements table in CHANGELOG.
2. `pnpm pack` in packages/core: confirm the tarball contains `migrations/0.5.0.json`, `dist/primitives/`, the family files, and `CHANGELOG.md`.
3. Build the CLI and run `zazz-ui diff` in a scratch vendored project against the packed tarball: the 0.5.0 slice prints with the BREAKING bullets.
4. `vp check` at root; `vp test` in packages/core, packages/cli (unit + e2e); `vp run docs#build` succeeds.
5. Write `.scratch/style-props/release.md`: the maintainer's manual steps per ADR-0010 and the `zazz-version-bump` skill (bumpp core → 0.5.0, set the changelog date, tag `core-v0.5.0`, publish; then CLI → 0.3.0, tag `cli-v0.3.0`, publish), plus the decision to skip a 0.4.2 README release. Do not bump versions or publish.

## Answer

Done at the tip of `feat/style-props-0.5` (`ebf6909`, ticket 34's merge) after `pnpm install --config.confirm-modules-purge=false`. No version bumped, nothing published, no `private` flag touched (`packages/core` and `packages/cli` carry none; only the root and `apps/docs` are private). Two repo files changed: `packages/core/CHANGELOG.md` (0.5.0 column + one interpretation sentence) and the new `.scratch/style-props/release.md` (maintainer runbook), plus this ticket and the spec's decisions list.

### 1. After-numbers

`vp run build` in `packages/core` (tsc → pack → build-dist → heads → sri: 50 css files written, `dist/zazz.css` 338,886 B, 0 head files changed, `sri.json` 132 files). Then, exactly as ticket 01 ran it, with headless Chrome found at the default macOS path (the script has no `--no-cdn`; passing the unpublished version makes the CDN row `n/a (HTTP 404)`, recorded as `n/a until published`):

```
$ DEBUG=1 node .scratch/style-props/measure.mjs --cdn 0.5.0
[measure] ranges reported 248 (at-rule blocks 129, style rules 119); raw DevTools-panel figure incl. blocks: used 323215 of 338886
| Measure | Value |
| --- | --- |
| `dist/zazz.css` raw bytes | 338,886 |
| brotli bytes (node zlib, q11) | 31,088 |
| gzip bytes (node zlib, default level) | 42,035 |
| rule count (`{` in `dist/zazz.css`) | 2,767 |
| `src/base/_utilities.css` bytes | 160,490 |
| CDN transfer bytes (jsDelivr, br, @0.5.0) | n/a (HTTP 404) |
| Coverage on `examples/layout.html` (style rules; Chrome/153.0.8010.47, 1280x900): used / unused | 60,481 / 278,405 (82.2% unused of 338,886) |
```

Same Chrome build (153.0.8010.47) and viewport as the 0.4.1 baseline, so the coverage row is like for like. The table in `CHANGELOG.md`:

| Measure | 0.4.1 | 0.5.0 |
| --- | --- | --- |
| `dist/zazz.css` raw bytes | 304,258 | 338,886 |
| brotli bytes (node zlib, q11) | 29,125 | 31,088 |
| gzip bytes (node zlib, default level) | 38,281 | 42,035 |
| rule count (`{` in `dist/zazz.css`) | 2,189 | 2,767 |
| `src/base/_utilities.css` bytes | 159,583 | 160,490 |
| CDN transfer bytes (jsDelivr, `Accept-Encoding: br`) | 39,174 | n/a until published |
| Coverage on `examples/layout.html`, style rules (Chrome 153, 1280×900): used / unused | 60,226 / 244,032 (80.2% unused of 304,258) | 60,481 / 278,405 (82.2% unused of 338,886) |

Interpretation (the sentence under the table says the same): the monolith grew, +34,628 B raw / +1,963 B brotli / +578 rules, and that is roughly the `@property` registrations (297 now, 28 in 0.4.1; 14,865 B of blocks, 264 of them the style props) plus the eight family files (22,815 B together; `@layer zazz.utilities{…}` is 150,508 B vs 128,822 B). `layout.html` matches the same ~60 KB of style rules it did before, so the bundle's unused share went up, not down. The win is the modular `dist/` and per-family loading, which is what the 0.5 story should be measured on. Per-file sizes from `dist/` (raw / brotli q11):

| file | raw B | br B |
| --- | ---: | ---: |
| `zazz.css` | 338,886 | 31,088 |
| `layers.css` | 159 | 80 |
| `base.css` | 48,058 | 6,623 |
| `utilities-core.css` | 125,398 | 9,202 |
| `utilities-spacing.css` | 1,625 | 296 |
| `utilities-spacing-responsive.css` | 8,102 | 562 |
| `utilities-sizing.css` | 2,875 | 372 |
| `utilities-grid.css` | 3,121 | 391 |
| `utilities-flex.css` | 1,665 | 281 |
| `utilities-color.css` | 1,411 | 254 |
| `utilities-typography.css` | 1,609 | 260 |
| `utilities-position.css` | 2,407 | 341 |
| `utilities.css` | 146,757 | 10,361 |
| `primitives/*.css` (37) | 968 – 9,440 each | |
| `base` + `utilities-spacing` + `fields` + `kbd` + `button` (README `/combine/` example) | 64,581 | 8,678 |

### 2. Tarball

```
$ cd packages/core && pnpm pack --pack-destination <scratchpad>/pack
<scratchpad>/pack/zazz-ui-core-0.4.1.tgz        # 455,450 B; still 0.4.1 because nothing is bumped
$ tar -tzf zazz-ui-core-0.4.1.tgz | wc -l
324
```

Present: `package/migrations/0.5.0.json`, `package/CHANGELOG.md`, `package/dist/sri.json`, `package/dist/zazz.css`, `package/dist/zazz.js`, `package/dist/layers.css`, `package/dist/base.css`, `package/dist/utilities-core.css`, `package/dist/utilities.css`, the eight `package/dist/utilities-{spacing,spacing-responsive,sizing,grid,flex,color,typography,position}.css`, 37 `package/dist/primitives/*.css`, `package/src/base/_properties.css` and the eight `package/src/base/_utilities-<family>.css` sources. No `.test.` files (the `files` negation holds).

### 3. CLI against the packed tarball

`vp run build` in `packages/cli` (11 files, 103.57 kB). The scratch project used the e2e seam (`ZAZZ_UI_KIT=file:<dir>/kit-{version}.tgz`, isolated `XDG_CACHE_HOME`), with `kit-0.4.1.tgz` = the pack above and `kit-0.5.0.tgz` = the same tarball with only `package.json`'s `version` restamped to `0.5.0` (scratchpad only, so `diff`/`migrate` have a version above the vendored one to move to; `sliceChangelog` prints nothing unless `to > from`). Sources under `src/` used old names on purpose.

```
$ node packages/cli/dist/cli.js --cwd <project> -y init @0.4.1
Resolved @zazz-ui/core@0.4.1
Vendored 27 files into zazz/. Paste the contents of zazz/head.html into your <head>, then: zazz-ui add button
$ node packages/cli/dist/cli.js --cwd <project> -y add button
Closure at 0.4.1: fields, kbd, button  (new dependencies: fields, kbd)
Vendored fields, kbd, button into zazz/ — entry imports inserted in cascade order.

$ node packages/cli/dist/cli.js --cwd <project> -y diff @0.5.0
Comparing against @zazz-ui/core@0.5.0
No differences against 0.5.0.
## 0.5.0 (unreleased)

One theme: **open values move to style props, tokens collapse to one space scale, and breakpoints take Tailwind's names** (ADR-0012). …
Measurements (0.4.1 → 0.5.0), from `node .scratch/style-props/measure.mjs` …
### base
- **BREAKING** Container breakpoint flags renamed `--is-breakpoint-*` → `--bp-*` …
| `--is-breakpoint-xs` | `--bp-sm`  |
…
- **BREAKING** Responsive class prefixes shift one step, `@xs:` … `@xl:` → `@sm:` … `@2xl:` …
- **BREAKING** Breakpoint length tokens shift the same step …
- **BREAKING** The `--gap-xs` … `--gap-xl` size tokens are removed and replaced by the `--space-*` family …
- **BREAKING** `.container` band names shift with the breakpoints …
- **BREAKING** `*-screen-*` classes and `--container-*` tokens shift with the breakpoints …
(171 lines in all; ends "Read-only — run `zazz-ui update @0.5.0` to apply.")

$ node packages/cli/dist/cli.js --cwd <project> -y migrate --to @0.5.0
Migrating to @zazz-ui/core@0.5.0
Scanned 2 files (0.4.1 → 0.5.0)
src/page.html
-<section data-container="xs" class="@xs:flex @md:grid max-w-screen-lg">
+<section data-container="sm" class="@sm:flex @lg:grid max-w-screen-xl">
src/site.css
-  --stack: var(--gap-md);            +  --stack: var(--space-md);
-  --narrow: var(--breakpoint-xs);    +  --narrow: var(--breakpoint-sm);
-  --wide: var(--container-sm);       +  --wide: var(--container-md);
-@container style(--is-breakpoint-md: true) {   +@container style(--bp-lg: true) {
-    padding: var(--gap-lg);          +    padding: var(--space-lg);
-.\@sm\:grid {                        +.\@md\:grid {
Rules applied: --is-breakpoint-md → --bp-lg 1 · --breakpoint-xs → --breakpoint-sm 1 · --gap-md → --space-md 1 · --gap-lg → --space-lg 1 · --container-sm → --container-md 1 · @xs: → @sm: 1 · @sm: → @md: 1 · @md: → @lg: 1 · max-w-screen-lg → max-w-screen-xl 1 · data-container=xs → data-container=sm 1 · className={ (by hand) 1
2 of 2 files changed.
Could not map 1 place — migrate these by hand:
  src/page.html:2: className={cx("@sm:flex")}></div> — JSX className expression: …
Dry run — nothing written. Re-run with --write to apply.        (exit 2)

$ … migrate --to @0.5.0 --write
Rewrote 2 files for 0.5.0; zazz.json now records migrated 0.5.0. Next: `zazz-ui update @0.5.0`.   (exit 2, the by-hand item)
$ … migrate --to @0.5.0
✖ already migrated: this project is at 0.5.0, the rules target 0.5.0
```

So the changelog slice prints with all six **BREAKING** bullets and tables, `migrations/0.5.0.json` resolves from inside the tarball through the kit engine, the chain rules apply in one pass (`@sm:` → `@md:` while `@xs:` → `@sm:` in the same class list), the `migrated` stamp lands and guards the second run.

### 4. Checks

- `vp check` (root): on this fresh worktree, 7 errors, all pre-existing and all `apps/docs` Next.js typegen (`TS2304: Cannot find name 'LayoutProps' | 'PageProps' | 'RouteContext'` in `apps/docs/app/**`). After `vp run docs#build` generated `.next/types`, `vp check` is fully green: "Found no warnings, lint errors, or type errors in 132 files".
- `vp test` in `packages/core`: 20 files, 190 passed (incl. `migrations.test.ts` drift guard, `examples-migrated.test.ts`, `dist.test.ts`, `head.test.ts`); re-run after the CHANGELOG edit.
- `vp test` in `packages/cli`: 13 files, 140 passed (unit + e2e; global setup packs the workspace kit).
- `vp run docs#build`: succeeds (`tsc -p packages/core/tsconfig.json`, `next build` 299 static pages, `patch-zazz-trace` 289 kit files).

### 5. `release.md`

`.scratch/style-props/release.md`: what is verified, the version reasoning (core 0.5.0 by ADR-0010's breaking list, `MANIFEST_VERSION` stays 1 since `DIST_CSS` is additive; CLI 0.3.0 for `migrate` + the `zazz.json` `migrated` field + the index.css-derived base list), the decision to skip 0.4.2 (a README-only patch would document `dist/` files 0.4.1 does not ship and mint a no-op version in every consumer's `update` prompt), and the maintainer steps in the skill's order: date the changelog header, `pnpm exec bumpp 0.5.0 --no-commit --no-tag --no-push` in `packages/core`, `pnpm whoami` + `pnpm publish --access public`, `git tag core-v0.5.0 -m …`, registry check; then the CLI to 0.3.0, publish, `cli-v0.3.0`; then the CDN-pin commit (`packages/core/README.md:21-22`, `first-page.mdx:22,25`, `hotkeys.mdx:17`, the `head.test.ts:123` fixture; `installation.mdx` is unpinned and needs nothing) after the registry has 0.5.0; then the measured CDN byte count into the table.

Loose ends recorded there: `vp check` needs a docs build first on a fresh checkout (`ready` script has the order backwards); the `zazz-ui` registry entry holds only the `0.0.0` placeholder and there are no `cli-v*` tags, so 0.3.0 is the CLI's first real publish; `packages/core/README.md:27` still says the CLI "is planned"; the CDN row placeholder ships inside the 0.5.0 tarball; the main checkout has an untracked `packages/ui/` and a `CLAUDE.md` that describes the kit as `@zazz-ui/ui` while this branch is `packages/core` throughout, to reconcile before tagging.

## Comments
