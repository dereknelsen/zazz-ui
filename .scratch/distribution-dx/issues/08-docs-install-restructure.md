# Restructure the installation docs

Type: grilling
Status: resolved
Blocked by: 04, 05, 06

## Question

How do the docs (apps/docs) present three install paths — CLI, CDN drop-in, manual — without drowning the reader?

Decide:

- The installation page's structure: which path leads (per audience: package-manager users → CLI; legacy/no-tooling → CDN), tabbed vs separate pages.
- Per-primitive pages: add a `zazz-ui add <name>` snippet and a per-file CDN snippet alongside the existing manual markup examples.
- Where today's manual-install content moves, and how it stays the always-available fallback.
- Whether the docs gain the "head configurator" surface if [Specify the CDN drop-in story](06-cdn-dropin-spec.md) decides to productize `buildHead`.
- What machine-readable surface (llms.txt, à la Base UI north star) the docs should expose for the distribution story.

Blocked by the three contract tickets ([Define the init contract](04-init-contract.md), [Define the add/update contract](05-add-update-contract.md), [Specify the CDN drop-in story](06-cdn-dropin-spec.md)) — the docs teach whatever they decide.

## Answer

Resolved 2026-08-28 with Derek (grilling). His calls: one tabbed Installation page with CLI leading, an install block on every primitive page, and llms.txt + per-page markdown endpoints.

### Installation page: one page, persistent tabs, CLI leads

- A single **Installation** page with a tab switcher — **CLI | CDN | Manual** — where the tab choice **persists across the whole docs site** (localStorage), so a CDN reader sees CDN snippets everywhere including primitive pages.
- **CLI** is the default tab: `pnpm dlx zazz-ui@latest init`, what init writes (`zazz/`, `zazz.json`, `head.html`), then `add <primitive>` and `update`. One intro line above the tabs routes audiences: package-manager projects → CLI; existing/legacy pages with no tooling → CDN.
- **CDN** tab opens with the two-line bundle head (pinned + SRI from `dist/sri.json`), then the granular story with a link to the head configurator; teaches exact-version pinning and the upgrade path (regenerate the block).
- **Manual** tab is today's copy-the-files content, restructured to mirror the CLI's layout (`zazz/` + head snippet) so a manual install is upgradeable to CLI management later. It remains the always-available, no-magic fallback and doubles as the explanation of what the CLI automates.

### Per-primitive pages: a generated install block

Every primitive page gains an install block honoring the same persistent tab:

- CLI: `zazz-ui add <name>` (dependency closure noted: "also vendors input, typeahead…").
- CDN: the per-file `<link>`/`<script>` set for that primitive — pinned, SRI'd, dependency chain and import-map note included.
- Manual: the file list to copy, plus the existing markup examples (unchanged).

The block is **generated from the kit's manifest** (`PRIMITIVES` from the installed workspace package) + `dist/sri.json` — never hand-written, so it can't drift. This is the same data source as the CLI and configurator; the docs app already reads the kit from the workspace package and serves it raw at `/zazz/*`.

### Head configurator (from ticket 06)

A dedicated docs page: pick kit version, grain (bundle/granular), primitives, options (fonts, theme script) → copy-paste `<head>` block rendered by `buildHead`'s CDN mode with integrity filled from that version's `dist/sri.json`. Linked from the Installation CDN tab and from every primitive install block's CDN pane.

### Machine-readable surface: llms.txt + per-page markdown

- Serve **`/llms.txt`** indexing the docs (à la the Base UI north star), and **raw markdown per page** (fumadocs supports `.mdx → .md` endpoints), so agents can read primitive contracts without scraping HTML.
- llms.txt leads with the distribution facts an agent needs to act: the `init`/`add` command shapes, the CDN URL patterns + pinning/SRI rule, and where the manifest lives in the package. (A vendor-model kit's real adoption channel includes AI agents installing it into user projects; make that path first-class.)

### Sequencing note (feeds ticket 09's handoff)

The docs restructure is **not** a gate on the kit's 0.1.0 publish (ticket 07) but should land close behind it: primitive install blocks and the configurator need a _published_ version to point their CDN URLs at. Suggested implementation order: llms.txt + install blocks (cheap, manifest-driven) → Installation page tabs → configurator (the one real docs feature).
