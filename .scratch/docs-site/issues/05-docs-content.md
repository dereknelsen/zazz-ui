# 05 Phase 4: docs content

Status: resolved
Type: task
Blocked by: 03

The Docs area for 0.5 only: Introduction, Quick start, Core concepts, Migrating a legacy app, Installation (CLI / CDN / npm + the head contract), Customization and theming, Editor and linting, LLM resources.

## Comments

- 2026-10-06: written from `AUTHORING.md`, `SPEC.md`, `CONTEXT.md`, `packages/cli/README.md`, `packages/vscode/README.md`, `head.ts`, `debug.ts`, and the old `getting-started/*.mdx` where still true. Every `<head>` snippet is the kit's own `buildHead()` output through the new `{% head mode="cdn" primitives="…" /%}` tag (version from the installed package via `kitVersion()`), so no hand-written head can drift. Build: 89 pages; `vp run docs#links` reports only `/blog/` and `/playground/` (Phases 5–6).
- 2026-10-06: the language server is described honestly (VS Code today, stdio works, no standalone package or editor configs yet); the ESLint plugin as private to the monorepo.
- 2026-10-06: review (facts + humanizer) folded in: 22 edits. Facts fixed: `data-tabs-state` does not exist; no `.md`-suffix route (only `index.md`); the import map pins five specifiers; `--ui-field-*` consumers; the server binary path; unstated publishing plans removed. Added "Unreleased" callouts on quick start and installation: core is still 0.4.1 on npm, so the pinned snippets resolve to 0.4 until the alpha ships. **For Derek:** `zazz-ui init --legacy` (`packages/cli/src/wiring.ts`) writes `layer(legacy)` (bare), which the layering rules forbid; the docs describe the current behavior and tell readers to move the import. Also `CONTEXT.md` default band `lg` → `xl` (Phase 7).
- 2026-10-06: resolved.
