# Restructure the installation docs

Type: grilling
Status: open
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
