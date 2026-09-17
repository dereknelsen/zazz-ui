# 01 — Baseline numbers for 0.4.1

Type: task
Status: resolved
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

Measured in this worktree at `cdb2e41` (kit = 0.4.1, `packages/core` version `0.4.1`), after `pnpm install` and `vp run build` in `packages/core`. Every number reproduces with `node .scratch/style-props/measure.mjs` (needs the built kit; finds Chrome via `CHROME_PATH` or the default macOS install, or pass `--cdp $(agent-browser get cdp-url)` after `agent-browser open about:blank`; `--no-coverage` skips the browser step; `--cdn <version>` picks the published version to probe).

| Measure                                                      | 0.4.1                                      |
| ------------------------------------------------------------ | ------------------------------------------ |
| `dist/zazz.css` raw bytes                                    | 304,258                                    |
| brotli bytes (node zlib, q11)                                | 29,125                                     |
| gzip bytes (node zlib, default level)                        | 38,281                                     |
| rule count (`{` in `dist/zazz.css`)                          | 2,189                                      |
| `src/base/_utilities.css` bytes                              | 159,583                                    |
| CDN transfer bytes (jsDelivr, `Accept-Encoding: br`)         | 39,174                                     |
| Coverage on `examples/layout.html`, style rules: used/unused | 60,226 / 244,032 (80.2% unused of 304,258) |

The table is in `packages/core/CHANGELOG.md` under a new `## 0.5.0 (unreleased)` header (preamble only, no `###`, so the CLI's `sliceChangelog` keeps it as version header text); the 0.5.0 column reads `tbd` for ticket 35.

Notes and caveats:

- **CDN vs local brotli.** jsDelivr answers `Accept-Encoding: br` with `content-length: 39174` (`content-encoding: br`, `x-jsd-version: 0.4.1`), which is larger than zlib's q11 brotli (29,125) and about the same as gzip (38,281): the CDN compresses at a lower brotli level. Both are recorded; the CDN row is the on-the-wire number.
- **How Coverage was measured.** puppeteer/playwright are not in the repo, so the script drives Chrome over raw CDP with Node's global `WebSocket`: a local static server roots `packages/core`, `Fetch.fulfillRequest` answers the page's `../src/index.css` link with the bytes of `dist/zazz.css` (so coverage is of the same file the size rows measure), `CSS.startRuleUsageTracking` runs through load plus a 2 s settle, viewport 1280×900. Result: headless Chrome 153.0.8010.47; identical result through `agent-browser`'s CDP endpoint (Chrome 150) and across repeated runs.
- **Why the number is "style rules" and not the DevTools panel's literal figure.** `CSS.stopRuleUsageTracking` (the API behind the Coverage panel) reports each matched style rule with an exact range, but it also reports every enclosing `@layer`/`@media`/`@supports`/`@container` block as one used range spanning the block's whole body (121 of the 236 entries here). The kit wraps everything in `@layer` blocks, so the panel-style union is 301,083 used / 3,175 unused (1.0% unused), which says nothing about dead utilities. The recorded figure drops the block ranges: used = union of the 115 matched style-rule ranges (60,226 B); unused = everything else, so at-rule preludes, `@property`, `@keyframes` and `@font-face` count as unused, as the panel does for bytes outside a used range. `DEBUG=1 node .scratch/style-props/measure.mjs` prints the raw panel-style figure and the range counts alongside. Ticket 35 must use the same script so the after-number is like for like.
- For scale: `@layer zazz.utilities{…}` is 128,822 B of the 304,258 B bundle; `@layer zazz.components{…}` is 101,296 B; `@layer variables{…}` is 45,125 B.
- The worktree branch was fast-forwarded from `aff8707` to `cdb2e41` (the ticket-graph commit) before starting; no other files changed.
- `vp check` reports pre-existing formatting drift in the other ticket files under `.scratch/style-props/` and 7 pre-existing type errors in `apps/docs` (Next.js generated `PageProps`/`RouteContext`/`LayoutProps` types, absent until `next dev`/typegen runs); neither is in files this ticket touched, so they are left alone.

## Comments
