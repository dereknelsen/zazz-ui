---
name: zazz-version-bump
description: Release checklist for publishing @zazz-ui/core or the zazz-ui CLI to npm. Use when the user wants to bump the version, cut a release, publish, or push a new version of either package.
---

# Zazz version bump & publish

Release checklist for `@zazz-ui/core` (and, with the differences at the bottom, the `zazz-ui` CLI). The agent runs steps 1–7 and 11; steps 8–10 are the maintainer's — npm auth is interactive and ADR-0010 makes publishing a deliberate manual act, so for those steps hand Derek a copy-paste script instead of running them.

Versioning and changelog rules live in their sources of truth — restate neither:

- **What counts as breaking, and the bump it forces**: `docs/adr/0010-*.md` (0.x contract: 0.MINOR = at least one breaking entry, additive = patch).
- **Changelog format**: the intro of `packages/core/CHANGELOG.md`. The format is load-bearing — `packages/cli/src/changelog.ts` parses `## x.y.z` headers and `### <primitive>`/`### base` sections to print per-consumer slices, so a malformed scope heading silently drops entries from `zazz-ui update`.

## Steps

1. **Pick the version** from the diff since the last `core-v*` tag, judged against ADR-0010's breaking list. Done when every change in the diff is classified breaking/additive and the bump follows.

2. **Write the changelog entry** in `packages/core/CHANGELOG.md`, matching the existing entries' shape. If the section was kept as `## X.Y.Z (unreleased)` during development, date it now: `## X.Y.Z (YYYY-MM-DD)`. Done when every breaking change carries a **BREAKING** flag with a one-line migration note, and every touched primitive has its own `### <scope>` section (one name per heading; scope names must match manifest primitive names exactly). Released sections are history: never edit them.

3. **Bump every pinned version reference.** `packages/core/package.json` is not the only one — CDN URLs pin exact versions in the README and docs. Find them all:

   ```bash
   rg -n '@zazz-ui/core@[0-9]' --glob '!node_modules' --glob '!*.test.ts' --glob '!**/dist/**'
   ```

   Done when that search returns only the new version (the excluded tests pin fixture versions on purpose). The README's CDN import map also pins dependency versions; check them against `src/head.ts`. The docs site (`apps/docs`) reads the version from the installed package (`kitVersion()`), so it needs no edit — but rebuild it after publishing so its CDN snippets and `llms.txt` pin the new release.

4. **Clear the pre-release markers** in the docs: remove the `{% callout type="warning" title="Unreleased" %}` blocks (`rg -n 'title="Unreleased"' apps/docs/src/content`), and ask Derek before setting a release blog post (`apps/docs/src/content/blog/`) to `draft: false`.

5. **Update the agent skills** to match the new changelog entry: `.claude/skills/zazz*` (the `zazz` skill and its `references/`, `zazz-new-design-style`, the `zazz-figma-*` pair, `zazz-legacy-baseline`). For every entry, find what an agent would now get wrong: a renamed or removed attribute, token, or hook (search the skills for the old name; the hit count must be zero), a new slot or required attribute (add it to `references/components.md`), a new utility (`references/tokens.md`). If the release touched `_reset.css`, re-check `zazz-legacy-baseline/RESET-GROUPS.md` and move its "reflects Zazz X.Y.Z" label. Done when no skill names anything the release renamed or removed, and every new markup requirement appears in the skills.

6. **Check the manifest contract** if primitives, dependencies, or import order changed: `CSS_CASCADE_ORDER` and the `PRIMITIVES` dependency entries in `packages/core/src/manifest.ts` must mirror `index.css` (`manifest.test.ts` and `head.test.ts` enforce this). If the manifest's _shape_ changed (not just data), bump `MANIFEST_VERSION` — it gates CLI compatibility.

7. **Validate**: `vp run ready` from the repo root, all green. It runs with `--no-cache`, so a replayed task can't hide a stale build. This also catches changelog formatting via the formatter.

8. **Commit, push, then publish** (maintainer). Give Derek this script:

   ```bash
   pnpm whoami   # MUST print your username before publishing — see gotchas
   cd packages/core
   pnpm publish --access public   # prepublishOnly runs the full build
   cd ../..
   ```

9. **Tag and push the tag** (maintainer), matching the existing convention:

   ```bash
   git tag core-vX.Y.Z -m "core: X.Y.Z — <one-line theme>"
   git push origin core-vX.Y.Z
   ```

10. **Confirm the registry took it**:

```bash
curl -s "https://registry.npmjs.org/-/package/@zazz-ui/core/dist-tags?t=$(date +%s)"
```

Done when it prints `{"latest":"X.Y.Z"}` with the new version. Use this endpoint, not the full package document (`registry.npmjs.org/@zazz-ui/core`): Cloudflare caches that one for five minutes (`max-age=300`), so right after a publish it still shows the previous version. The dist-tags endpoint is served uncached, and the `?t=` query is a cache-buster in case that changes.

11. **Rebuild the docs and check the CLI** (agent, once step 10 shows the new version):
    - Push a commit to `main` (the step 5 skill edits, or `git commit --allow-empty -m "Rebuild docs for core X.Y.Z"`). Vercel rebuilds on push, and the docs read the version from the installed package, so their CDN snippets and `llms.txt` pin the release only after this build. Done when `curl -s "https://zazz.sh/llms.txt?t=$(date +%s)" | grep -o '@zazz-ui/core@[0-9.]*' | sort -u` prints only the new version.
    - Run the published CLI against the release in an empty scratch directory with a stub `package.json`: `init -y`, `add` a primitive the release touched, then `diff -y` (no differences). Then upgrade from the previous release: `init <previous> -y`, `add` the same primitive, `diff @X.Y.Z -y` (it must print the new changelog slice, **BREAKING** notes included), and `update @X.Y.Z -y`. Done when all of them succeed. A failure, or a manifest shape change in step 6, means the CLI needs its own release; see the bottom of this file.

    ```bash
    z(){ pnpm dlx zazz-ui@latest "$@"; }   # a function: zsh does not word-split "$Z"
    z init -y && z add accordion -y && z diff -y
    ```

## Publish gotchas (learned 2026-08-31)

- **A 404 on `PUT …/@zazz-ui%2fcore` means bad auth, not a missing package.** npm masks permission failures on scoped packages as 404. Always run `pnpm whoami` first; `401 Unauthorized` there is the real error.
- **Two token sources can conflict**: `~/.npmrc` and pnpm's own global config each hold an `//registry.npmjs.org/:_authToken`, and pnpm may send the stale one. Fix by clearing both and logging in fresh:

  ```bash
  pnpm config delete //registry.npmjs.org/:_authToken
  sed -i '' '/registry.npmjs.org\/:_authToken/d' ~/.npmrc
  pnpm login && pnpm whoami
  ```

- **Use pnpm, never raw `npm`** — the root `devEngines` rejects npm outright.
- If a token gets printed to a terminal or transcript, revoke it at npmjs.com/settings/~/tokens after publishing.

## CLI (`zazz-ui`) differences

Independent version line (ADR-0010) — a core release never forces a CLI release or vice versa. Same steps with: `packages/cli` instead of `packages/core`, tag prefix `cli-v*`, no CDN-pinned URLs to sweep, and no changelog-scope contract (core's CHANGELOG is the only one the CLI parses). The CLI's kit-compatibility gate is `MANIFEST_VERSION`, checked in `packages/cli/src/kit.ts`.
