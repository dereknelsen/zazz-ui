# Decide versioning and release policy

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

How do the kit and CLI version and release?

Decide:

- When and how publishing flips on: removing `"private": true` and the guarded `prepublishOnly` from `packages/core` is explicitly gated on being asked — what conditions (spec complete? 0.1.0 scope?) trigger it.
- Kit ↔ CLI version coupling: lockstep versions vs independent, and whether the CLI pins a compatible kit range (`zazz-ui@1.x` vendors `@zazz-ui/core@^1`).
- Release cadence and semver meaning for a vendored kit (what is a "breaking change" when consumers own their copies? css variable renames? slot renames?).
- Changelog discipline the `update` diff UX can lean on (per-primitive changelog entries?), and where release notes live.
- Whether `bumpp` (already a devDependency) / `vp` drives releases, and tagging conventions.

Blocked on the init/add/update contracts ([Define the init contract](04-init-contract.md), [Define the add/update contract](05-add-update-contract.md)) since the update story defines what versioning must guarantee.

## Answer

Resolved 2026-08-28 with Derek (grilling). His calls: kit publishes first (CLI follows), independent versions with a declared compatibility range, 0.x semver convention, per-primitive changelog entries.

### When publishing flips on: kit first

The kit publishes **as soon as its publishable surface exists** — the CDN story goes live then; the CLI ships later, independently (it vendors from the already-published tarball, which is also the only honest way to e2e-test it). Concretely, flipping `@zazz-ui/core` publishing requires, in order:

1. The distribution spec is assembled ([ticket 09](09-assemble-spec.md)) — no contract left undecided.
2. The kit build produces the two new publish-time artifacts the contracts depend on: the **complete manifest** (ticket 05's `PRIMITIVES`, with the drift-guard test) and **`dist/sri.json`** (ticket 06). Without these, the first published version can't serve the CLI or the configurator, and 0.1.0 is immutable.
3. `CHANGELOG.md` exists with the 0.1.0 entry (format below) and is added to `files` so it ships in the tarball.
4. The mechanical flip in `packages/core/package.json`: remove `"private": true`, restore `prepublishOnly` to `vp run build`, set version `0.1.0`.
5. Derek publishes (`pnpm publish` from `packages/core`; interactively confirmed per [ticket 03](03-reserve-npm-names.md)). Manual publish is the v1 release mechanism — no CI tokens until wanted (recorded as deliberate; revisit if cadence hurts).

Explicitly **not** gating the kit publish: the CLI build, and the docs restructure (ticket 08) — though the docs should land close behind, since the published README/docs will start teaching CDN URLs.

`zazz-ui` (the CLI) replaces its 0.0.0 placeholder whenever `packages/cli` is built and e2e-tested against the published kit. Publishing an npm version is forever (immutability is what makes pinned CDN URLs and 3-way merges trustworthy); never unpublish — a bad release gets `npm deprecate` + a patch.

### Kit ↔ CLI coupling: independent + declared range

- Each package versions on its own clock. CLI UX fixes never force kit releases; kit css work never bumps the CLI.
- The **CLI declares the kit range it understands**. The compatibility surface is machine-checkable: the kit's manifest module exports a `manifestVersion` (integer, starts at 1), and `zazz.json` carries its own schema version. The CLI supports an explicit range of both; on encountering a newer kit `manifestVersion` it fails with "this CLI is too old for kit x.y.z — run `pnpm dlx zazz-ui@latest`", never with a parse error. Bumping `manifestVersion` is by definition a breaking kit change (see below).
- The CLI always resolves kit versions freshly from the registry (ticket 02's stale-dlx rule); it never assumes its own version implies a kit version.

### Semver during 0.x

- **Breaking** (requires a 0.MINOR bump): css custom-property renames/removals, data-attribute or slot/part contract changes, primitive or manifest-entry removals/renames, head contract changes (import-map entries, polyfill set, required tags), `zazz.json`-relevant schema changes, `manifestVersion` bumps, and browser-floor raises (per the repo's browser-support policy).
- **0.x.PATCH**: everything else — new primitives, new variants/tokens (additive), fixes, doc/example changes. Additive = existing pages and vendored trees keep working and `update` merges cleanly.
- **1.0.0** when the token/data-attribute contract and the `zazz.json` schema have survived real consumers without a breaking bump for a stretch; from then, standard MAJOR/MINOR/PATCH with the same breaking definition.
- What "breaking" means for consumers who own their copies: a breaking release never breaks their site (their files don't change until they run `update`); it means `update` to that version may require conflict resolution or markup changes. The changelog is the contract for that conversation.

### Changelog discipline

- **`CHANGELOG.md` lives in `packages/core` and ships in the tarball.** Entries are grouped under each version by primitive/base scope — conventional-commit scopes (`fix(combobox): …`, `feat(base/variables): …`) make the grouping nearly free and `bumpp`-compatible tooling can draft it; each breaking item is flagged `BREAKING` with a one-line migration note.
- This is what `update`/`diff` print: the slice of entries between the recorded and target versions for exactly the primitives being touched ("combobox 0.2.0 → 0.4.0: …"), read from the target tarball — offline-capable like everything else.
- GitHub Releases mirror the changelog per tag; they're the human archive, the tarball copy is the machine surface.

### Release mechanics

- `bumpp` (already a devDependency) drives version + tag + push for each package; tags are per-package: **`core-v0.1.0`** / **`cli-v0.1.0`**.
- Release checklist per kit version: `vp check` + `vp run -r test` green → `vp run build` (regenerates compiled js, heads, manifest, `sri.json`) → changelog entry → `bumpp` → `pnpm publish` → verify `npm view` + a jsDelivr URL spot-check → GitHub Release.
- Cadence: no fixed schedule; release when there's something to ship. The 0.x contract above is what makes irregular cadence safe.
