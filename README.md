# Zazz

Monorepo for the Zazz Design Framework (a zero-build, semantic-token CSS and vanilla JS UI kit built on modern web standards) and its documentation site.

## Layout

| Path          | What it is                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui` | [`@zazz-ui/ui`](packages/ui): the kit itself (not yet published; see [Publishing](#publishing)). CSS, HTML, and TS-authored scripts co-located per component under `src/primitives/<name>/`. |
| `apps/docs`   | The documentation site (Next.js + fumadocs). Serves the kit files raw at `/zazz/*` for component previews.                                                                                   |

## Development

```bash
pnpm install

# docs site (builds the ui package first; previews load its emitted JS)
pnpm dev

# iterate on kit scripts in a second terminal (tsc --watch)
vp run ui#dev

# whole-repo gate: check, test, build everything
pnpm run ready
```

Tooling is [Vite+](https://viteplus.dev) (`vp`): formatting, linting, task running, and the packaged `dist/` builds are configured in `vite.config.ts` files, not separate rc files.

## Publishing

**Publishing is disabled for now**, a deliberate hold while the package surface settles. Two guards in `packages/ui/package.json`:

1. `"private": true`: pnpm skips the package entirely (`npm publish --dry-run` does _not_ honor this, hence the second guard).
2. `prepublishOnly` exits non-zero with an explanatory message, so `npm publish` and `pnpm publish` both abort before contacting the registry.

Everything else is ready: the package name (`@zazz-ui/ui`), `exports`, `files`, and `publishConfig.access`. **To publish:** delete the `"private": true` line, restore `"prepublishOnly": "vp run build"` (tsc emit + `vp pack` bundles), then run `pnpm --filter @zazz-ui/ui publish`. See [packages/ui/README.md](packages/ui/README.md).
