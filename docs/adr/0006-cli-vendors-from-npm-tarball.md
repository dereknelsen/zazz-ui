# The CLI vendors files, using the npm tarball as its registry

`zazz-ui init`/`add` copy kit files out of the published `@zazz-ui/core@<version>` tarball into the consumer project. The consumer owns the copies and edits them freely; updates are CLI-driven diffs against recorded provenance. There is no registry server: npm is the registry.

## Context

The distribution-DX charting session (2026-08-24, `.scratch/distribution-dx/`) chose the CLI ownership and sourcing model. North star: the shadcn CLI. Candidates for ownership: vendor everything (shadcn-style copies), hybrid (base as npm dependency, primitives vendored), dependency-first (kit stays a dependency, CLI wires imports). Candidates for sourcing: fetch from a URL registry served by the docs site, or resolve the npm package itself.

## Decision

Vendor everything; source from npm. The CLI resolves `@zazz-ui/core` at an exact version (the tarball already packs the readable `src/` tree), verifies integrity, and copies the requested files. CLI users never take `@zazz-ui/core` as a package dependency.

## Why

- **Vendoring is the kit native idiom.** Zazz is zero-build, readable CSS and JS. Copied files run as-is without a toolchain, serving both modern apps and legacy systems without a bundler.
- **Vendoring resolves the customization tension.** Users who outgrow the CSS-variable hooks edit or delete their copy. There is no conflict with package CSS and no doubled payload.
- **npm-as-registry removes a whole service.** Immutable versions, integrity hashes, dist-tags, caching, and proxy/mirror support all come from npm; `add button@0.3.0` is version resolution the ecosystem already understands. A URL registry on the docs site would mean running distribution infrastructure and maintaining a second versioning scheme.
- **Hybrid and dependency-first were rejected** for splitting the mental model (two update paths) and providing a weaker customization story.

## Consequences

- The tarball `files` allowlist (already `dist`, `src`, `examples`, minus tests) is the CLI entire supply chain: what is not packed cannot be vendored.
- `init` must record provenance (kit version, vendored file list, hashes) in a config file so `update` can three-way diff; that contract is specified by the map init/add/update tickets.
- The CLI needs kit metadata (per-primitive file lists and dependencies) shipped inside the package: `src/manifest.ts` today covers only the five JS-carrying primitives and must grow to cover all of them.
- Offline and CI behavior inherits npm caching semantics rather than a bespoke registry.
