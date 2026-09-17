# Releasing 0.5.0 (ticket 35)

Date: 2026-09-17. State of the tree at this commit: `@zazz-ui/core` is still `0.4.1` and `zazz-ui` (the CLI) is still `0.2.0` in their `package.json`s; nothing is bumped, tagged or published. The PR leaves 0.5.0 ready and the maintainer does the rest by hand (ADR-0010: publishing is a deliberate, interactively confirmed act; npm auth is interactive). This file is that runbook, in the order the `zazz-version-bump` skill prescribes, with what ticket 35 already verified marked as done.

## Verified in this PR (done)

- `pnpm install`, `vp run build` in `packages/core` (50 css files in `dist/`, `sri.json` 132 files, 0 head files changed).
- `node .scratch/style-props/measure.mjs --cdn 0.5.0`: the 0.5.0 column of the measurements table in `packages/core/CHANGELOG.md` (CDN row `n/a until published`; the script prints `n/a (HTTP 404)` for an unpublished version).
- `pnpm pack` in `packages/core`: 324 entries, including `package/migrations/0.5.0.json`, `package/CHANGELOG.md`, `package/dist/sri.json`, `package/dist/primitives/` (37 css), the eight `package/dist/utilities-<family>.css` and their `package/src/base/_utilities-<family>.css` sources, `package/src/base/_properties.css`; no `.test.` files.
- CLI built (`vp run build` in `packages/cli`); in a scratch project vendored from the packed tarball, `zazz-ui diff @0.5.0` prints the `## 0.5.0` slice with the five **BREAKING** `### base` bullets and their rename tables, `zazz-ui migrate --to @0.5.0` resolves `migrations/0.5.0.json` from the tarball, rewrites the sample sources (11 rules fired, one `className={…}` reported by hand, exit 2), stamps `migrated`, and refuses a second run. Details and excerpts: ticket 35's Answer.
- `vp check` at the root: green once `apps/docs`' Next.js typegen exists; on a fresh checkout it reports 7 `TS2304` errors (`LayoutProps`/`PageProps`/`RouteContext` in `apps/docs/app/**`) until `vp run docs#build` (or `next dev`/`next typegen`) has run once. Not a code problem.
- `vp test`: `packages/core` 20 files / 190 tests, `packages/cli` 13 files / 140 tests (unit + e2e against a freshly packed kit). `vp run docs#build` succeeds (299 static pages; `patch-zazz-trace` added 289 kit files to the route trace).

## Versions and why

- **Core → 0.5.0.** Judged against ADR-0010's breaking list: custom-property renames/removals (`--is-breakpoint-*` → `--bp-*`, `--breakpoint-*` shift, `--gap-*` removed, `--container-*` shift), data-attribute contract change (`data-container` values), head/import contract additions (16 base css links, `_properties.css` and the eight families in `index.css`). At least one breaking entry ⇒ 0.MINOR bump. The changelog block already carries every **BREAKING** flag with a migration note and one `### base` scope (no primitive section changed contract; ticket 18's `--ui-*` audit is internal). `MANIFEST_VERSION` stays `1`: `manifest.ts` gained the `DIST_CSS` export (additive) and no existing entry changed shape; the CLI's `SUPPORTED_MANIFEST` is `{ min: 1, max: 1 }`, so no compatibility gate moves.
- **CLI → 0.3.0.** Independent line (ADR-0010). Since 0.2.0 the CLI gained `zazz-ui migrate` (new command, new `zazz.json` field `migrated`) and now derives the base css list from the kit's `index.css` (ticket 37) instead of a hard-coded seven. The `zazz.json` schema grew a field, and the base-css derivation is what makes a 0.5.0 kit vendor correctly, so this is a minor bump, and it must ship together with (or right after) core 0.5.0: a CLI still on the hard-coded list would vendor a 0.5.0 kit without `_properties.css` and the families.
- **0.4.2 is skipped** (spec.md amendment, agreed in planning). The only 0.4-line candidate was a README-only release for the "Load only what you use" section (ticket 21). That section documents `dist/base.css`, `dist/utilities-<family>.css` and `dist/primitives/<name>.css`, which do not exist in the 0.4.1 tarball, so a 0.4.2 would document files it does not ship; and a no-op kit version shows up in every consumer's `update`/`diff` prompt (the provenance-pollution argument in ADR-0010). Everything in it lands in 0.5.0 instead.

## Maintainer steps

Run from the repo root, on `main` after the PR merges, with `pnpm install` done and `vp run docs#build` run once so `vp check` is green (see above). Steps 1–3 are edits; do not push until step 6.

### 1. Date the changelog

`packages/core/CHANGELOG.md` line 3: `## 0.5.0 (unreleased)` → `## 0.5.0 (YYYY-MM-DD)`, same shape as `## 0.4.1 (2026-09-04)`. The docs site embeds this file (`apps/docs/content/docs/changelog.mdx` uses `<include>`), and the CLI's `sliceChangelog` reads only the `x.y.z` prefix of the header, so the parenthetical is free text. Leave the CDN row of the measurements table as `n/a until published`; the tarball is built before the number exists (step 7 records it in the repo afterwards).

### 2. Bump core

```bash
cd packages/core
pnpm exec bumpp 0.5.0 --no-commit --no-tag --no-push   # package.json only; the tag is per-package (core-v*), so bumpp's v* tag is not wanted
cd ../..
git diff --stat     # package.json (version) + CHANGELOG.md (date) only
vp check && vp test
git add -A && git commit -m "release(core): 0.5.0"
```

`bumpp` is a devDependency of `packages/core` (v11.1.0); it only touches that `package.json`.

### 3. Publish core

```bash
pnpm whoami                          # must print your npm username; 401 here is the real error behind a later 404
cd packages/core
pnpm publish --access public         # prepublishOnly runs `vp run build` (tsc → pack → build-dist → heads → sri)
cd ../..
```

`pnpm`, never `npm` (`devEngines` rejects it). A `404` on `PUT …/@zazz-ui%2fcore` is bad auth, not a missing package; the token-conflict fix is in the skill (`pnpm config delete //registry.npmjs.org/:_authToken`, drop the line from `~/.npmrc`, `pnpm login`). If a token gets printed anywhere, revoke it at npmjs.com/settings/~/tokens after publishing.

### 4. Tag core and push

```bash
git tag core-v0.5.0 -m "core: 0.5.0 — style props, one --space-* scale, Tailwind breakpoint names"
git push origin main core-v0.5.0
curl -s https://registry.npmjs.org/@zazz-ui/core | python3 -c 'import json,sys; print(json.load(sys.stdin)["dist-tags"])'   # expect latest: 0.5.0
```

### 5. Bump, publish and tag the CLI

```bash
cd packages/cli
pnpm exec bumpp 0.3.0 --no-commit --no-tag --no-push   # bumpp resolves from the workspace (core's devDependency); if `pnpm exec` cannot find it, edit "version" by hand
vp check && vp test                                    # e2e packs the workspace core, which is now 0.5.0
cd ../..
git add -A && git commit -m "release(cli): 0.3.0"
pnpm whoami
cd packages/cli && pnpm publish --access public && cd ../..
git tag cli-v0.3.0 -m "cli: 0.3.0 — zazz-ui migrate; base css list from the kit's index.css"
git push origin main cli-v0.3.0
curl -s https://registry.npmjs.org/zazz-ui | python3 -c 'import json,sys; print(json.load(sys.stdin)["dist-tags"])'       # expect latest: 0.3.0
```

Publish core before the CLI: the CLI's e2e packs the workspace core, and once 0.3.0 is on the registry `pnpm dlx zazz-ui migrate --to @0.5.0` must find 0.5.0 there.

Note what the registry holds today: `zazz-ui` has a single published version, the `0.0.0` placeholder, with `latest` pointing at it. Commit 7bf7f97 flipped publishing on at 0.1.0 and the workspace went on to 0.2.0, but neither was ever published, and there are no `cli-v*` tags in the repo (only `core-v0.2.0` … `core-v0.4.1`). So 0.3.0 is the CLI's first real publish; `cli-v0.3.0` is the first CLI tag; and until step 5 runs, `pnpm dlx zazz-ui` resolves to the placeholder. There is no CLI changelog to date (only core's is parsed).

### 6. Repoint the CDN snippets (after the registry has 0.5.0)

Pinned URLs 404 until the version exists on jsDelivr, so this commit follows step 4, not precedes it.

```bash
rg -n '@zazz-ui/core@[0-9]' --glob '!node_modules' --glob '!pnpm-lock.yaml' --glob '!.scratch' --glob '!SPEC.md'
```

Today that prints:

| File | Line(s) | Change |
| --- | --- | --- |
| `packages/core/README.md` | 21–22 | `@0.4.1` → `@0.5.0` (`dist/zazz.css`, `dist/zazz.js`). Line 27 still says "A `zazz-ui` CLI … is planned" — replace with a pointer to `packages/cli/README.md` / `pnpm dlx zazz-ui init`. |
| `apps/docs/content/docs/getting-started/first-page.mdx` | 22, 25 | `@0.4.1` → `@0.5.0` |
| `apps/docs/content/docs/scripts/hotkeys.mdx` | 17 | `@0.4.1` → `@0.5.0` (`src/base/hotkeys.js`) |
| `packages/core/src/head.test.ts` | 123 | `@0.4.1` → `@0.5.0` (a fixture string; bump it so the skill's search returns only the new version) |

`apps/docs/content/docs/getting-started/installation.mdx` pins nothing (`@zazz-ui/core/dist/zazz.css` floats to `latest`, with the "pin in production" callout pointing at the upgrading page), so it needs no edit and starts serving 0.5.0 the moment `latest` moves. `upgrading.mdx` already reads `@0.5.0`. `SPEC.md:12` and `packages/cli/src/kit.ts:109` mention `0.4.1` as examples; leave them.

Then `vp check`, commit (`docs: point CDN snippets at @zazz-ui/core@0.5.0`), push, and let the docs site redeploy so `/docs/changelog` shows the dated header.

### 7. Record the on-the-wire number

Once jsDelivr serves it:

```bash
curl -s -H "Accept-Encoding: br" -o /dev/null -w "%{size_download}\n" https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.5.0/dist/zazz.css
node .scratch/style-props/measure.mjs --no-coverage     # the CDN row now reads @0.5.0 from package.json
```

Put the number in the CDN row of the measurements table (`n/a until published` → the byte count) in a follow-up commit. The published tarball keeps the placeholder; that is the accepted cost of a hand-written changelog inside the package.

## Loose ends seen while doing this

- **`vp check` on a fresh checkout** fails on the 7 `apps/docs` typegen errors until a docs build/dev has run. Either add `next typegen` to `apps/docs`' `postinstall` next to `fumadocs-mdx`, or commit that `vp check` is run after `vp run docs#build`; the `ready` script (`vp check && vp run -r build && vp run -r test`) has them in the failing order.
- **CLI provenance**: registry has only the `0.0.0` placeholder (see step 5). Worth a line in the CLI README's install section once 0.3.0 is up, and the missing `cli-v0.1.0` / `cli-v0.2.0` tags should simply not be created retroactively.
- **`packages/core/README.md:27`** still calls the CLI "planned" (step 6).
- **CDN row placeholder** ships inside the 0.5.0 tarball's `CHANGELOG.md` (step 7).
- **Not in this tree**: the main checkout's `git status` shows an untracked `packages/ui/` and `zazz.code-workspace` plus edits to `apps/docs/app/(home)/page.tsx`, `overview.mdx`, `index.mdx`, root `package.json` and `pnpm-lock.yaml`; and `CLAUDE.md` describes the kit as `packages/ui` / `@zazz-ui/ui`. This branch is `packages/core` / `@zazz-ui/core` throughout. Reconcile (or rebase) before cutting the release so the tag points at the tree that was verified.
- **`measure.mjs` has no `--no-cdn`**; `--cdn <unpublished>` prints `n/a (HTTP 404)`, which is what this ticket used. Fine as is.
- Not gating: ticket 21's follow-ups (a `dist/`-grained CDN head mode in `head.ts`) and the spec's "Not yet specified" list (Tailwind plugin/CLI helper, editor `css.customData`, typed `attr()` form) stay open.
