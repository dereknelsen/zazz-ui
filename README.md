# Zazz

Monorepo for the Zazz Design Framework: a UI kit for plain HTML, built on modern web standards. Markup carries every styling decision as an identity (`data-ui="button"`), a preset (`data-button-variant="primary"`), or a style utility (`style="--px: 6"`); design tokens, cascade layers, and a few light-DOM custom elements sit underneath. No build step, no class names.

**Status: 0.5 alpha.** The markup contract can change in any release before 1.0, and 0.5 is not compatible with 0.4. Breaking changes are flagged in [`packages/core/CHANGELOG.md`](packages/core/CHANGELOG.md) with migration notes.

Docs: [zazz.sh](https://zazz.sh). Quick start: [zazz.sh/docs/quick-start](https://zazz.sh/docs/quick-start/).

## Layout

| Path                       | What it is                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`            | [`@zazz-ui/core`](packages/core): the kit. Primitives co-located under `src/primitives/<name>/` (css + ts + example html), base layers and runtime under `src/base/`, editor data in `editor/`. |
| `packages/cli`             | [`zazz-ui`](packages/cli): vendors the kit into a project (`init`, `add`, `update`, `diff`) with provenance, so updates merge instead of overwrite.                                             |
| `packages/language-server` | `@zazz-ui/language-server` (private): LSP for Zazz in HTML; the `<ui-debug>` audit, completions, hover, formatting.                                                                             |
| `packages/eslint-plugin`   | `@zazz-ui/eslint-plugin` (private): the same audit as html-eslint rules; `vp run lint:html`.                                                                                                    |
| `packages/vscode`          | `zazz-vscode` (private): the VS Code extension, a client over the server plus grammar, snippets, Emmet, templates. `vp run zazz-vscode#package` builds the `.vsix`.                             |
| `apps/docs`                | The documentation site (Astro + Markdoc + Pagefind, styled with Zazz). Its API reference is generated from the kit's data at build time.                                                        |
| `apps/experiments`         | A Vite app for authoring UI against the kit's sources with hot reload and `<ui-debug>`.                                                                                                         |

Vocabulary is in [`CONTEXT.md`](CONTEXT.md), the 0.5 contract in [`SPEC.md`](SPEC.md), decisions in [`docs/adr/`](docs/adr/), and the markup rules in [`packages/core/AUTHORING.md`](packages/core/AUTHORING.md).

## Development

Tooling is [Vite+](https://viteplus.dev) (`vp`): one CLI for install, format, lint, type check, test, and tasks.

```bash
vp install

pnpm dev                 # build core, then the docs site at localhost:4321
vp run playground        # the authoring playground
vp run core#dev          # tsc --watch for kit scripts

vp check && vp test      # format, lint, type check, test
vp run ready             # the whole-repo gate: check, lint html, build, test
```

The docs site needs the kit built once (`vp run core#build`) so `packages/core/dist` exists; `vp run docs#build` then writes a static site, and `vp run docs#links` checks it for broken internal links.

## Publishing

`@zazz-ui/core` and `zazz-ui` publish to npm on independent version lines ([ADR-0010](docs/adr/0010-kit-first-independent-versioning.md)). Releases are manual; the checklist is the `zazz-version-bump` skill under `.claude/skills/`. Versions are immutable: a bad release gets `npm deprecate` plus a patch, never an unpublish.

## License

MIT. Copyright © 2026 Meridian Design, LLC.
