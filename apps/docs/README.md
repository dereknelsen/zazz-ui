# Zazz docs

The documentation site for the [Zazz Design Framework](../../packages/ui): Next.js App Router and fumadocs.

The kit itself lives in [`packages/ui`](../../packages/ui) (`@zazz-ui/ui`). This app consumes it as a workspace dependency:

- Component pages embed live previews via `<Preview src="button/default" />` (MDX). The preview server component reads the canonical example HTML, component CSS, and emitted JS straight from the installed package (`lib/zazz-assets.ts`), so docs stay in sync with the source.
- The `/zazz/[...path]` route serves the package `src/` tree raw (`/zazz/index.css`, `/zazz/index.js`, `/zazz/primitives/**`) for the preview iframes without copying into `public/` or bundling.

## Development

From the monorepo root:

```bash
pnpm dev            # builds @zazz-ui/ui first, then runs next dev
```

The previews load the package emitted JS. If you are editing kit scripts, run `vp run ui#dev` (tsc --watch) in a second terminal.

Other scripts (run in this directory or via `vp run docs#<script>`): `build`, `start`, `types:check`.
