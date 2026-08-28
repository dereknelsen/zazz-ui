# Specify the CDN drop-in story

Type: grilling
Status: resolved

## Question

What is the documented CDN story for `@zazz-ui/core` on jsDelivr?

Decide:

- The two grains and when to use each: one-request `dist/zazz.css` + `dist/zazz.js` (the `jsdelivr`/`unpkg`/`style` fields already point there) vs per-file `src/primitives/<name>/<name>.css` for users who skip or replace primitives.
- Whether `buildHead` (`src/head.ts`) is productized: a documented public export? a docs-site "head configurator" page that generates a copy-paste head for a chosen primitive set? It already owns the import map + SRI + fonts + theme script.
- SRI policy for Zazz's **own** published files (head.ts pins third-party deps today): do docs teach pinned versions + sha384 for zazz files, and how are those hashes published per release?
- Import-map guidance for granular users who pull JS-carrying primitives (embla, signal-polyfill resolution without the bundled dist).
- Version-pinning guidance (`@zazz-ui/core@0.x.y` in URLs, never `@latest` for SRI compatibility).

Unblocked — the granularity decision (one package, per-file URLs; ADR-0005) is already locked; this ticket turns it into the spec'd, teachable story.

## Answer

Resolved 2026-08-28 with Derek (grilling). All three preference calls went to the recommended option: `buildHead` becomes a public export **plus** a docs head-configurator; the build ships `dist/sri.json`; granular JS from the CDN is first-class.

### The two grains, and when to use each

Both grains come from the one `@zazz-ui/core` package on jsDelivr (ADR-0005); the URL path picks the grain:

1. **Bundle (the default, leads in docs)** — two requests, whole kit:
   - `https://cdn.jsdelivr.net/npm/@zazz-ui/core@<x.y.z>/dist/zazz.css`
   - `https://cdn.jsdelivr.net/npm/@zazz-ui/core@<x.y.z>/dist/zazz.js`
     The `style`/`unpkg`/`jsdelivr` package fields already point here. For: prototypes, legacy systems dropping Zazz onto existing pages, anyone who wants everything and no decisions.
2. **Granular (per-file)** — explicit `<link>`/`<script>` tags per file out of `src/`: base css layers in cascade order, then chosen primitives' css; primitive `.js` plus its base-script dependency chain. For: users who skip or replace primitives, or need to shave weight without adopting the CLI. Granular heads use **explicit tags, never css `@import` chains** (no request waterfalls). `src/index.css` does resolve on jsDelivr via its relative `@imports`, but the docs don't teach it — it's the worst of both grains.

Rule of thumb the docs state outright: **granular css + js is fully supported but hand-ordering is on you — the configurator (below) does the ordering for you; if the list grows past a handful of primitives, take the bundle or the CLI.**

### `buildHead` is productized (export + configurator)

- `@zazz-ui/core/head` is a **documented public API** (it already exports `buildHead`, `ESM_DEPENDENCIES`, `POLYFILLS`, `cdnUrl`). Semver applies to it like any export.
- **New capability required** (implementation note for the spec): `buildHead` grows a CDN mode — instead of `base: "./zazz"` pointing at vendored files, it emits pinned jsDelivr URLs for a given kit version and primitive selection: bundle mode (`dist/zazz.css`/`dist/zazz.js` + integrity) or granular mode (base-layer links in cascade order, selected primitives' css, the import map, polyfills, and script tags for each primitive's js dependency chain resolved from the kit manifest). Sketch: `buildHead({ cdn: { version, primitives?: string[] } })`; exact API shape is implementation detail, but the manifest (ticket 05's expanded shape) is its data source — the same graph serves `add` and the configurator.
- **Docs head-configurator** (handed to [ticket 08](08-docs-install-restructure.md)): a page where the user picks kit version + grain + primitives and gets a copy-paste `<head>` block, rendered by this same `buildHead` — one implementation, zero drift between docs and CLI (`init`'s `head.html` uses the vendored-mode variant of the same function).

### SRI policy for Zazz's own files

- The kit build generates **`dist/sri.json`**: `{ "<file path>": "sha384-…" }` for every published `.css`/`.js` file (both `dist/` bundles and every `src/**` css/js), computed at build time before `vp pack`, so the hashes ship inside the same tarball and are also fetchable per-version from the CDN (`…@<x.y.z>/dist/sri.json`).
- Docs teach **pin + SRI as the default posture**: every snippet the docs or configurator emit carries `integrity` + `crossorigin="anonymous"`. The configurator reads `dist/sri.json` for the chosen version to fill them in.
- The kit's existing third-party policy (head.ts: one CDN, exact pins, static files only, sha384) now applies uniformly to Zazz's own files. Release ceremony stays nil — the hashes are a build artifact, not a manual step.

### Import-map guidance for granular JS users

Granular JS from the CDN needs exactly what vendored JS needs: the import map resolving `signal-polyfill` / `embla-carousel*` to pinned SRI-checked jsDelivr URLs (already owned by `buildHead`), the polyfill tags, plus the primitive's script chain in dependency order (e.g. combobox → `base/command-score.js`, `base/hotkeys.js`, `base/typeahead.js`, `primitives/combobox/combobox.js`). Relative imports between kit files resolve natively on jsDelivr since the package layout is preserved — only bare specifiers need the map. The docs never ask users to assemble this by hand: the configurator emits it; the manual-path docs show one worked example (combobox) and point at the configurator.

### Version pinning

- **Always exact versions in CDN URLs** (`@zazz-ui/core@0.3.2`), never `@latest`, never floating ranges (`@0.3`): SRI hashes are per-byte, so floating URLs break integrity checks on every release — and unpinned URLs also defeat jsDelivr's permanent caching. Every doc snippet and configurator output is pinned.
- Upgrading = change the version in the URLs and refresh integrity from the new `dist/sri.json` (the configurator regenerates the whole block; that's the documented upgrade path for CDN users).
- jsDelivr serves deleted/unpublished-from-npm versions from its permanent cache, which makes pinned URLs durable; the release policy ([ticket 07](07-versioning-release-policy.md)) should still treat published versions as immutable (npm does anyway).
