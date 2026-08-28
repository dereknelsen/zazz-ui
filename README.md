# Zazz

Monorepo for the Zazz Design Framework (a zero-build, semantic-token CSS and vanilla JS UI kit built on modern web standards) and its documentation site.

## Layout

| Path            | What it is                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core` | [`@zazz-ui/core`](packages/core): the kit itself (not yet published; see [Publishing](#publishing)). CSS, HTML, and TS-authored scripts co-located per component under `src/primitives/<name>/`. |
| `apps/docs`     | The documentation site (Next.js + fumadocs). Serves the kit files raw at `/zazz/*` for component previews.                                                                                       |

## Development

```bash
pnpm install

# docs site (builds the core package first; previews load its emitted JS)
pnpm dev

# iterate on kit scripts in a second terminal (tsc --watch)
vp run core#dev

# whole-repo gate: check, test, build everything
pnpm run ready
```

Tooling is [Vite+](https://viteplus.dev) (`vp`): formatting, linting, task running, and the packaged `dist/` builds are configured in `vite.config.ts` files, not separate rc files.

## Publishing

`@zazz-ui/core` is published to npm. Releases are manual and interactively confirmed; `prepublishOnly` runs the full build so every publish ships fresh artifacts (compiled scripts, `dist/` bundles, `dist/sri.json`).

Per release: get `vp run ready` green, add the version's `CHANGELOG.md` entry (grouped by primitive/base scope), bump the version, run `pnpm --filter @zazz-ui/core publish`, tag `core-v<version>`, spot-check a pinned jsDelivr URL, and write the GitHub Release. Versions are immutable: a bad release gets `npm deprecate` plus a patch, never an unpublish. The versioning policy (what counts as breaking during 0.x) is [ADR-0010](docs/adr/0010-kit-first-independent-versioning.md).
