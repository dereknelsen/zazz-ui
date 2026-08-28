# Map: Zazz distribution DX

Label: wayfinder:map
Charted: 2026-08-24

## Destination

A distribution spec ([spec.md](spec.md), written by [Assemble the distribution spec](issues/09-assemble-spec.md)) plus ADRs locking the CLI contract, npm/CDN packaging, versioning policy, and docs restructure — everything decided, nothing built. Done when no tickets remain and an implementer could start `packages/cli` without asking a question.

## Notes

- **Audiences**: general-purpose web-native applications, and legacy systems migrating to a modern frontend. MIT, npm scope `@zazz-ui`.
- **North stars**: shadcn CLI (https://ui.shadcn.com/docs/cli) for the CLI; Base UI (https://base-ui.com/llms.txt) for primitives.
- **Vocabulary**: use `CONTEXT.md` terms — "primitive", never "component". The CLI's copy model is "vendor" (see CONTEXT.md).
- **Skills**: consult the `zazz` skill for design-system details; `docs/agents/issue-tracker.md` for tracker conventions.
- **Layout fact** (updated 2026-08-24): the `src/ui/` → `src/primitives/` rename has landed and every reference now says `primitives/` (including the `./primitives/*` export subpath). Example fragments are named `<primitive>.html` / `<primitive>-<variant>.html`. These paths are the public CDN surface once publishing turns on (ADR-0005).
- Sessions resolve **one ticket each** (research tickets may batch).

## Decisions so far

<!-- one line per resolved decision; detail lives in the linked ticket or ADR -->

- [Vendor everything](../../docs/adr/0006-cli-vendors-from-npm-tarball.md) (charting session): `init`/`add` copy files into the user's project; users own them; updates are CLI diffs; CLI users never depend on `@zazz-ui/core`.
- [npm tarball as registry](../../docs/adr/0006-cli-vendors-from-npm-tarball.md) (charting session): the CLI resolves `@zazz-ui/core@<version>` from npm and copies out of the tarball; no registry server.
- [One package, per-file CDN URLs](../../docs/adr/0005-single-package-per-file-cdn.md) (charting session): no base/primitives package split, no per-primitive packages; jsDelivr grain is chosen by URL path (`dist/zazz.css` vs `src/.../button.css`).
- Package rename (2026-08-28, Derek): `@zazz-ui/ui` → `@zazz-ui/core` and `packages/ui` → `packages/core`, before first publish — TanStack-style `*-core` naming, leaving room for future wrappers (`@zazz-ui/react`, …). Verified `@zazz-ui/core` unpublished on npm 2026-08-28. ADR-0005 carries the clarifying note; release tags are `core-v*`.
- CLI name (charting session): unscoped `zazz-ui`, verified free on npm 2026-08-24 (`zazz` is taken); reservation is [Reserve the npm names](issues/03-reserve-npm-names.md).
- Destination scope (charting session): this map produces a spec + ADRs only; building/publishing is a follow-on effort.
- [Research the shadcn CLI's anatomy](issues/01-shadcn-cli-anatomy.md): adopt the config-file/`add`-resolution/conflict-prompt patterns; reject the React/Tailwind machinery; shadcn's update story structurally fails because it never records the vendored-from version — Zazz's npm-tarball registry enables the true 3-way merge shadcn can't offer.
- [Assemble the distribution spec](issues/09-assemble-spec.md) (2026-08-28): [spec.md](spec.md) written, consolidating all tickets; ADR set completed with [0009 provenance-recorded 3-way update](../../docs/adr/0009-provenance-recorded-three-way-update.md) and [0010 kit-first independent versioning](../../docs/adr/0010-kit-first-independent-versioning.md); CLI home confirmed `packages/cli` (tsdown via `vp`, node >= 20, pacote + @npmcli/config). Derek signed off 2026-08-28 — **the map is closed**; execution proceeds per spec §7.
- [Restructure the installation docs](issues/08-docs-install-restructure.md) (2026-08-28): one Installation page with site-wide persistent tabs (CLI leads | CDN | Manual, with Manual mirroring the CLI layout so it upgrades cleanly); every primitive page gets a manifest-generated install block (add snippet / pinned+SRI per-file CDN set / manual file list); the head configurator is a dedicated docs page rendered by `buildHead`'s CDN mode; docs serve `llms.txt` + per-page raw markdown leading with the distribution facts; docs land close behind (not gating) the 0.1.0 publish.
- [Decide versioning and release policy](issues/07-versioning-release-policy.md) (2026-08-28): kit publishes first (gated on spec assembled + manifest & sri.json building + changelog; mechanical flip = drop `private`, restore `prepublishOnly`, 0.1.0, manual publish by Derek) with the CLI following independently; independent versions with the CLI declaring a supported kit range via a kit `manifestVersion`; 0.x semver (0.MINOR = breaking per a written definition — css var/data-attr/slot/head/manifest contract changes); `CHANGELOG.md` ships in the tarball with per-primitive scoped entries that `update`/`diff` print; `bumpp` + per-package tags (`core-v*`/`cli-v*`); versions are immutable, deprecate-don't-unpublish.
- [Define the add/update contract](issues/05-add-update-contract.md) (2026-08-28): `src/manifest.ts` grows to one entry per primitive ({css, js, base, primitives, bare, examples} + canonical cascade order, drift-guarded by a kit test); `add` vendors the dependency closure at the project's recorded kit version (no examples by default, `--examples` opt-in) and inserts imports at cascade position; `update` is whole-kit by default (named narrowing allowed, skew tolerated but discouraged) with true 3-way merge — pristine files replaced silently, real conflicts prompt keep/theirs/markers/skip (`--keep`/`--theirs`/`--markers` for CI); `diff` shows local-vs-target and upstream-vs-upstream from exact tarball bytes; shadcn-registry-compat moved out of scope.
- [Specify the CDN drop-in story](issues/06-cdn-dropin-spec.md) (2026-08-28): bundle grain leads (`dist/zazz.css`+`dist/zazz.js`), granular per-file css **and** js both first-class with explicit tags (no `@import` chains); `buildHead` becomes a documented public API and grows a CDN mode powering a docs head-configurator (ticket 08); build ships `dist/sri.json` (sha384 of every published css/js) so all snippets carry pin + SRI + crossorigin; CDN URLs always exact-version.
- [Define the init contract](issues/04-init-contract.md) (2026-08-28): base-only vendoring (all 7 css layers + 4 core runtime scripts, rewritten `index.css`/`index.js` entries under `zazz/` by default); `.js`+`.d.ts` default with `--ts` recorded in config; head delivered as a generated `<dir>/head.html` snippet (CLI-owned, regenerated on update); `layer(legacy)` wired by `--legacy <path>` flag only (fog item settled); `zazz.json` records kit `{version, integrity}`, `dir`, `language`, `legacy`, and per-file hashes at vendor time; no happy-path prompts; re-run = repair mode. Requires ticket 05 to give every primitive manifest entries with files + depends-on.
- [Reserve the npm names](issues/03-reserve-npm-names.md) (2026-08-28): `zazz-ui@0.0.0` placeholder is live on npm; `@zazz-ui` scope controlled via the `zazz-ui` org (Derek's account; specifics in the ticket only as far as a public repo allows); kit stays unpublished; `pnpm dlx zazz-ui@latest` is safe to assume.
- [Research npm-tarball-as-registry mechanics](issues/02-npm-tarball-registry-mechanics.md): use `pacote` (`manifest()` + `extract()`) for npm-identical semver/dist-tag resolution, SSRI verification, and offline-capable caching; load `.npmrc` via `@npmcli/config` (pacote doesn't read it itself); always resolve the kit version freshly (dlx may run a stale cached CLI); record `{version, integrity}` at vendor time for future `update` diffs.

## Not yet specified

_(none remaining — 2026-08-28)_ CLI politeness settled by default posture: **no telemetry, no phone-home update checks** (dlx usage fetches a fresh CLI anyway; kit-version freshness is already guaranteed per ticket 02), offline behavior = npm cache semantics with clear errors. CLI home & toolchain settled in [Assemble the distribution spec](issues/09-assemble-spec.md): `packages/cli`, tsdown via `vp`, node >= 20.

## Out of scope

- **shadcn-registry-compat endpoint** (moved from fog 2026-08-28 by ticket 05) — the manifest carries the same facts a shadcn registry item needs, so emitting registry JSON at docs-build time stays a cheap future add-on; no endpoint work in this effort.
- **Framework wrappers** (React/Vue bindings) — Zazz stays framework-agnostic css+js; a fresh effort if ever wanted.
- **Building and publishing the CLI, or any package restructuring** — execution; a fresh effort once the spec exists. Publishing stays disabled (`"private": true`) until explicitly asked.
