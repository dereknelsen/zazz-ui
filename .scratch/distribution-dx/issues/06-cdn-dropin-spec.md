# Specify the CDN drop-in story

Type: grilling
Status: open

## Question

What is the documented CDN story for `@zazz-ui/ui` on jsDelivr?

Decide:

- The two grains and when to use each: one-request `dist/zazz.css` + `dist/zazz.js` (the `jsdelivr`/`unpkg`/`style` fields already point there) vs per-file `src/primitives/<name>/<name>.css` for users who skip or replace primitives.
- Whether `buildHead` (`src/head.ts`) is productized: a documented public export? a docs-site "head configurator" page that generates a copy-paste head for a chosen primitive set? It already owns the import map + SRI + fonts + theme script.
- SRI policy for Zazz's **own** published files (head.ts pins third-party deps today): do docs teach pinned versions + sha384 for zazz files, and how are those hashes published per release?
- Import-map guidance for granular users who pull JS-carrying primitives (embla, signal-polyfill resolution without the bundled dist).
- Version-pinning guidance (`@zazz-ui/ui@0.x.y` in URLs, never `@latest` for SRI compatibility).

Unblocked — the granularity decision (one package, per-file URLs; ADR-0005) is already locked; this ticket turns it into the spec'd, teachable story.
