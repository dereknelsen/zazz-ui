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
- **Caveat**: an uncommitted `src/ui/` → `src/primitives/` rename is in flight in `packages/ui`; `src/index.ts`, `src/index.css`, `package.json` exports, and `src/manifest.ts` still say `ui/`. Tickets must not assume either path is final.
- Sessions resolve **one ticket each** (research tickets may batch).

## Decisions so far

<!-- one line per resolved decision; detail lives in the linked ticket or ADR -->

- [Vendor everything](../../docs/adr/0006-cli-vendors-from-npm-tarball.md) (charting session): `init`/`add` copy files into the user's project; users own them; updates are CLI diffs; CLI users never depend on `@zazz-ui/ui`.
- [npm tarball as registry](../../docs/adr/0006-cli-vendors-from-npm-tarball.md) (charting session): the CLI resolves `@zazz-ui/ui@<version>` from npm and copies out of the tarball; no registry server.
- [One package, per-file CDN URLs](../../docs/adr/0005-single-package-per-file-cdn.md) (charting session): no `@zazz-ui/core` split, no per-primitive packages; jsDelivr grain is chosen by URL path (`dist/zazz.css` vs `src/.../button.css`).
- CLI name (charting session): unscoped `zazz-ui`, verified free on npm 2026-08-24 (`zazz` is taken); reservation is [Reserve the npm names](issues/03-reserve-npm-names.md).
- Destination scope (charting session): this map produces a spec + ADRs only; building/publishing is a follow-on effort.
- [Research the shadcn CLI's anatomy](issues/01-shadcn-cli-anatomy.md): adopt the config-file/`add`-resolution/conflict-prompt patterns; reject the React/Tailwind machinery; shadcn's update story structurally fails because it never records the vendored-from version — Zazz's npm-tarball registry enables the true 3-way merge shadcn can't offer.
- [Research npm-tarball-as-registry mechanics](issues/02-npm-tarball-registry-mechanics.md): use `pacote` (`manifest()` + `extract()`) for npm-identical semver/dist-tag resolution, SSRI verification, and offline-capable caching; load `.npmrc` via `@npmcli/config` (pacote doesn't read it itself); always resolve the kit version freshly (dlx may run a stale cached CLI); record `{version, integrity}` at vendor time for future `update` diffs.

## Not yet specified

- **shadcn-registry-compat endpoint** — serving a shadcn registry-spec endpoint so React users could `npx shadcn add @zazz/button`. Kept dim on purpose; revisit when [Define the add/update contract](issues/05-add-update-contract.md) resolves — if still dim, move to Out of scope.
- **Legacy-migration ergonomics of `init`** — whether/how `init` wires the `layer(legacy)` import slot in `index.css` for migrating systems. May graduate into [Define the init contract](issues/04-init-contract.md) or its own ticket.
- **CLI politeness** — update notifications, telemetry-or-none, offline behavior beyond what npm gives for free.
- **CLI monorepo home & toolchain** — likely `packages/cli` + tsdown via `vp`; sharpens inside [Assemble the distribution spec](issues/09-assemble-spec.md) as handoff notes.

## Out of scope

- **Framework wrappers** (React/Vue bindings) — Zazz stays framework-agnostic css+js; a fresh effort if ever wanted.
- **Building and publishing the CLI, or any package restructuring** — execution; a fresh effort once the spec exists. Publishing stays disabled (`"private": true`) until explicitly asked.
