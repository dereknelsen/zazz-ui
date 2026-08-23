# Zazz docs

The documentation site for the [Zazz Design Framework](../../packages/ui) — Next.js App Router + fumadocs.

The kit itself lives in [`packages/ui`](../../packages/ui) (`@zazzdesign/ui`); this app consumes it as a workspace dependency:

- Component pages embed live previews via `<Preview src="button/default" />` (MDX). The preview server component reads the canonical example HTML, component CSS, and emitted JS straight from the installed package (`lib/zazz-assets.ts`), so docs can never drift from the source.
- The `/zazz/[...path]` route serves the package's `src/` tree raw (`/zazz/index.css`, `/zazz/index.js`, `/zazz/ui/**`) for the preview iframes — no copy into `public/`, no bundling.

## Development

From the monorepo root:

```bash
pnpm dev            # builds @zazzdesign/ui first, then next dev
```

The previews load the package's _emitted_ JS — if you're editing kit scripts, run `vp run ui#dev` (tsc --watch) in a second terminal.

Other scripts (run in this directory or via `vp run docs#<script>`): `build`, `start`, `types:check`.
