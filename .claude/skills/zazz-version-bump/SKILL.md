---
name: zazz-version-bump
description: Release checklist for publishing @zazz-ui/core or the zazz-ui CLI to npm. Use when the user wants to bump the version, cut a release, publish, or push a new version of either package.
---

# Zazz version bump & publish

Release checklist for `@zazz-ui/core` (and, with the differences at the bottom, the `zazz-ui` CLI). The agent runs steps 1–5; steps 6–8 are the maintainer's — npm auth is interactive and ADR-0010 makes publishing a deliberate manual act, so for those steps hand Derek a copy-paste script instead of running them.

Versioning and changelog rules live in their sources of truth — restate neither:

- **What counts as breaking, and the bump it forces**: `docs/adr/0010-*.md` (0.x contract: 0.MINOR = at least one breaking entry, additive = patch).
- **Changelog format**: the intro of `packages/core/CHANGELOG.md`. The format is load-bearing — `packages/cli/src/changelog.ts` parses `## x.y.z` headers and `### <primitive>`/`### base` sections to print per-consumer slices, so a malformed scope heading silently drops entries from `zazz-ui update`.

## Steps

1. **Pick the version** from the diff since the last `core-v*` tag, judged against ADR-0010's breaking list. Done when every change in the diff is classified breaking/additive and the bump follows.

2. **Write the changelog entry** in `packages/core/CHANGELOG.md`, matching the existing entries' shape. Done when every breaking change carries a **BREAKING** flag with a one-line migration note, and every touched primitive has its own `### <scope>` section (scope names must match manifest primitive names exactly).

3. **Bump every pinned version reference.** `packages/core/package.json` is not the only one — CDN URLs pin exact versions in the README and docs. Find them all:

   ```bash
   rg -n '@zazz-ui/core@[0-9]' --glob '!node_modules'
   ```

   Done when that search returns only the new version.

4. **Check the manifest contract** if primitives, dependencies, or import order changed: `CSS_CASCADE_ORDER` and the `PRIMITIVES` dependency entries in `packages/core/src/manifest.ts` must mirror `index.css` (`manifest.test.ts` and `head.test.ts` enforce this). If the manifest's _shape_ changed (not just data), bump `MANIFEST_VERSION` — it gates CLI compatibility.

5. **Validate**: `vp check && vp test` from the repo root, all green. This also catches changelog formatting via the formatter.

6. **Commit, push, then publish** (maintainer). Give Derek this script:

   ```bash
   pnpm whoami   # MUST print your username before publishing — see gotchas
   cd packages/core
   pnpm publish --access public   # prepublishOnly runs the full build
   cd ../..
   ```

7. **Tag and push the tag** (maintainer), matching the existing convention:

   ```bash
   git tag core-vX.Y.Z -m "core: X.Y.Z — <one-line theme>"
   git push origin core-vX.Y.Z
   ```

8. **Confirm the registry took it**:

   ```bash
   curl -s https://registry.npmjs.org/@zazz-ui/core | python3 -c 'import json,sys; print(json.load(sys.stdin)["dist-tags"])'
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
