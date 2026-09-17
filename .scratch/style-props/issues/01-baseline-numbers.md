# 01 — Baseline numbers for 0.4.1

Type: task
Status: open
Blocked by: —
Size: S

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/CHANGELOG.md (preamble measurements table, before column only)`
- `.scratch/style-props/measure.mjs`

## Task

Measure the 0.4.1 kit before anything changes and write the numbers down.

Steps:
1. In this worktree (tree = origin/main = 0.4.1): `pnpm install` then `vp run build` in `packages/core`.
2. Record: `wc -c dist/zazz.css`; brotli + gzip bytes via node zlib (`brotliCompressSync`, `gzipSync`); rule count `grep -o "{" dist/zazz.css | wc -l`; `wc -c src/base/_utilities.css`.
3. CDN transfer: `curl -s -H "Accept-Encoding: br" -o /dev/null -w "%{size_download}" https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.4.1/dist/zazz.css`.
4. DevTools Coverage on `examples/layout.html` (serve `packages/core` with any static server; use agent-browser or puppeteer CSS coverage): used vs unused bytes of the stylesheet.
5. Save the script as `.scratch/style-props/measure.mjs` so ticket 35 re-runs it for after-numbers.
6. Add a `## 0.5.0 (unreleased)` header to `packages/core/CHANGELOG.md` above `## 0.4.1` containing ONLY a "Measurements (0.4.1 → 0.5.0)" markdown table with the before column filled and the after column "tbd". Ticket 26 writes the rest of the entry; keep your edit minimal to avoid conflicts.

Acceptance: table present; numbers reproducible by the script.

## Answer

## Comments
