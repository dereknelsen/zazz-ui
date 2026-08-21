# Zazz

Monorepo for the Zazz Design Framework — a zero-build, semantic-token CSS + vanilla JS UI kit built on modern web standards — and its documentation site.

## Layout

| Path          | What it is                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/ui` | [`@zazzdesign/ui`](packages/ui) — the kit itself, published to npm. CSS + HTML + TS-authored scripts, co-located per component under `src/ui/<name>/`. |
| `apps/docs`   | The documentation site (Next.js + fumadocs). Serves the kit's files raw at `/zazz/*` for component previews.                                           |

## Development

```bash
pnpm install

# docs site (builds the ui package first — previews load its emitted JS)
pnpm dev

# iterate on kit scripts in a second terminal (tsc --watch)
vp run ui#dev

# whole-repo gate: check, test, build everything
pnpm run ready
```

Tooling is [Vite+](https://viteplus.dev) (`vp`): formatting, linting, task running, and the packaged `dist/` builds are configured in `vite.config.ts` files, not separate rc files.

## Publishing

`packages/ui` publishes to npm as `@zazzdesign/ui`. `prepublishOnly` runs the build (tsc emit + `vp pack` bundles); see [packages/ui/README.md](packages/ui/README.md).
