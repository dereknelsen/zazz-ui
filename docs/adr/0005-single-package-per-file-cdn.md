# One npm package; CDN granularity by URL path, not by package split

`@zazz-ui/ui` stays the single published package, shipping both the bundled one-request artifacts (`dist/zazz.css`, `dist/zazz.js`) and the readable per-file source (`src/…`). CDN users pick their grain by URL — the whole kit in one request, or individual primitive files à la carte. There is no `@zazz-ui/core`/`@zazz-ui/primitives` split and there are no per-primitive packages (`@zazz-ui/button`, …).

## Context

The distribution-DX charting session (2026-08-24, `.scratch/distribution-dx/`) had to choose the npm packaging granularity for jsDelivr drop-in users. Candidates: a single package; a core + primitives pair; ~35 per-primitive packages (possibly auto-generated). The motivating worry was a user replacing a primitive with their own version without shipping the kit's CSS for it twice.

## Decision

One package. jsDelivr serves any file inside a package, so a single `@zazz-ui/ui` already offers every granularity a package split would: `cdn.jsdelivr.net/npm/@zazz-ui/ui@<version>/dist/zazz.css` for the one-request drop-in, or `…/src/primitives/button/button.css` per primitive for users who want to omit or replace pieces. The package's `style`/`unpkg`/`jsdelivr` fields keep pointing at `dist/`.

## Why not split

- **Per-file URLs already deliver removal-without-doubling.** A user who rewrites the button simply doesn't link `button.css`. The CSS-variable hooks (`--ui-button-background`) remain the light-touch path; omitting the file is the heavy one. Neither needs a package boundary.
- **Per-primitive packages cost real overhead for no new capability**: 35+ publishes per release, a version-compatibility matrix, and cross-package dependency management (lightbox requires carousel; JS primitives share `base/` runtime). All of that already exists, solved, inside one package's module graph and `index.css` import order.
- **A core/primitives split only pays if the two need independent release cadences.** They don't: base layers and primitives are designed and tested as one cascade (`_layers.css` ordering) and one runtime.
- **The head contract (`src/head.ts`) is the granularity tool.** It already builds pinned, SRI-hashed, per-file jsDelivr URLs and the import map for third-party deps; the same machinery documents/generates whichever grain a page wants.

## Consequences

- The CLI (ADR-0006) and the CDN story both consume the same single tarball; there is one version number to communicate.
- Publishing granular URLs makes `src/` layout part of the public CDN surface once publishing is enabled — path renames (like the in-flight `src/ui/` → `src/primitives/`) become breaking changes for pinned deep links, so the layout must settle before the first publish.
- Guidance must teach exact-version pinning in CDN URLs (never `@latest`) so SRI hashes stay valid.
