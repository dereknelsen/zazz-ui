// @ts-nocheck -- Node-only measurement script; the repo-root tsconfig used for
// loose files has no @types/node, so `node:*` imports can't type-check here.

/**
 * @fileoverview Measures the built `@zazz-ui/core` stylesheet for the 0.5.0
 * changelog's "Measurements" table (style-props tickets 01 and 35).
 * @description Prints one markdown row per measure so the numbers can be
 * pasted into `packages/core/CHANGELOG.md`:
 *
 *   1. `dist/zazz.css` bytes: raw, brotli (node zlib, quality 11), gzip (node
 *      zlib, default level), and the rule count (`{` occurrences).
 *   2. `src/base/_utilities.css` bytes.
 *   3. CDN transfer size: jsDelivr's `content-length` for the published
 *      `dist/zazz.css` with `Accept-Encoding: br` (what `curl -w
 *      %{size_download}` reports). jsDelivr compresses at a lower brotli level
 *      than zlib's q11, so this is larger than the local brotli figure.
 *   4. CSS Coverage of `examples/layout.html`: the page is served from
 *      `packages/core` by a local static server, its `../src/index.css` link is
 *      answered with the bytes of `dist/zazz.css` (CDP `Fetch`), and
 *      `CSS.startRuleUsageTracking` (the API behind the DevTools Coverage panel)
 *      runs through load. Chrome reports every style rule that matched, and also
 *      every enclosing at-rule block (`@layer`, `@media`, `@supports`,
 *      `@container`) as one range spanning its whole body; for a layer-wrapped
 *      bundle those block ranges cover ~99% of the file, so the DevTools panel's
 *      literal figure is meaningless here. This script drops the block ranges
 *      and reports style-rule coverage: used = union of matched style-rule
 *      ranges; unused = stylesheet length - used (at-rule preludes, `@property`,
 *      `@keyframes` and `@font-face` therefore count as unused, as in DevTools).
 *      Coverage depends on viewport (container and media queries) and on scripts
 *      having run, so the viewport and settle delay are fixed below and the
 *      browser version is printed with the result. `DEBUG=1` also prints the
 *      raw panel-style figure and the range counts.
 *
 * Requires a built kit (`vp run build` in `packages/core`) and Node >= 22 (global
 * `WebSocket`). Chrome is found via `CHROME_PATH`, then the default macOS
 * install; pass `--cdp <ws-url>` (e.g. from `agent-browser open about:blank &&
 * agent-browser get cdp-url`) to use an already running browser instead.
 *
 * Usage: `node .scratch/style-props/measure.mjs [--cdn <version>] [--cdp <ws-url>] [--no-coverage]`
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const CORE = fileURLToPath(new URL("../../packages/core/", import.meta.url));
const VIEWPORT = { width: 1280, height: 900 };
const SETTLE_MS = 2000;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};
const debug = process.env.DEBUG ? (...m) => console.error("[measure]", ...m) : () => {};

const args = parseArgs(process.argv.slice(2));
const pkg = JSON.parse(await readFile(path.join(CORE, "package.json"), "utf8"));
const cdnVersion = args.cdn ?? pkg.version;

const distPath = path.join(CORE, "dist/zazz.css");
if (!existsSync(distPath)) {
  console.error("dist/zazz.css missing: run `vp run build` in packages/core first");
  process.exit(1);
}
const dist = await readFile(distPath);
const rows = [];

rows.push(["`dist/zazz.css` raw bytes", dist.length]);
rows.push([
  "brotli bytes (node zlib, q11)",
  brotliCompressSync(dist, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_SIZE_HINT]: dist.length,
    },
  }).length,
]);
rows.push(["gzip bytes (node zlib, default level)", gzipSync(dist).length]);
rows.push([
  "rule count (`{` in `dist/zazz.css`)",
  (dist.toString("latin1").match(/\{/g) ?? []).length,
]);
rows.push([
  "`src/base/_utilities.css` bytes",
  (await stat(path.join(CORE, "src/base/_utilities.css"))).size,
]);
rows.push([`CDN transfer bytes (jsDelivr, br, @${cdnVersion})`, await cdnTransfer(cdnVersion)]);

if (args.coverage !== false) {
  const c = await measureCoverage(args.cdp);
  const pct = ((c.unused / c.total) * 100).toFixed(1);
  rows.push([
    `Coverage on \`examples/layout.html\` (style rules; ${c.browser}, ${VIEWPORT.width}x${VIEWPORT.height}): used / unused`,
    `${fmt(c.used)} / ${fmt(c.unused)} (${pct}% unused of ${fmt(c.total)})`,
  ]);
}

console.log("| Measure | Value |");
console.log("| --- | --- |");
for (const [label, value] of rows) console.log(`| ${label} | ${fmt(value)} |`);

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--cdn") out.cdn = argv[++i];
    else if (arg === "--cdp") out.cdp = argv[++i];
    else if (arg === "--no-coverage") out.coverage = false;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function fmt(value) {
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
}

/** jsDelivr's on-the-wire size for the published bundle, or a note when unpublished. */
async function cdnTransfer(version) {
  const url = `https://cdn.jsdelivr.net/npm/@zazz-ui/core@${version}/dist/zazz.css`;
  try {
    const res = await fetch(url, { headers: { "Accept-Encoding": "br" } });
    if (!res.ok) return `n/a (HTTP ${res.status})`;
    const length = res.headers.get("content-length");
    const encoding = res.headers.get("content-encoding") ?? "identity";
    if (encoding !== "br") return `${length} (server sent ${encoding})`;
    return Number(length);
  } catch (error) {
    return `n/a (${error.message})`;
  }
}

// --- Coverage -----------------------------------------------------------------

async function measureCoverage(cdpUrl) {
  const server = await serveStatic(CORE);
  const pageUrl = `http://127.0.0.1:${server.port}/examples/layout.html`;
  const chrome = cdpUrl ? null : await launchChrome();
  const cdp = await connect(cdpUrl ?? chrome.wsUrl);

  try {
    const { product } = await cdp.send("Browser.getVersion");
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params) => cdp.send(method, params, sessionId);

    await page("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page("Page.enable");
    await page("DOM.enable");
    await page("CSS.enable");

    // Answer the page's `../src/index.css` link with the built bundle so the
    // coverage is of the same bytes the size rows measure.
    const sheets = new Map();
    cdp.on("CSS.styleSheetAdded", ({ header }, sid) => {
      if (sid === sessionId) sheets.set(header.styleSheetId, header);
    });
    cdp.on("Fetch.requestPaused", ({ requestId, request }, sid) => {
      if (sid !== sessionId) return;
      const answer = request.url.endsWith("/src/index.css")
        ? page("Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "text/css; charset=utf-8" }],
            body: dist.toString("base64"),
          })
        : page("Fetch.continueRequest", { requestId });
      answer.catch((error) => debug("Fetch answer failed", request.url, error.message));
    });
    await page("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });

    const loaded = cdp.once("Page.loadEventFired", sessionId);
    await page("CSS.startRuleUsageTracking");
    const nav = await page("Page.navigate", { url: pageUrl });
    if (nav.errorText) throw new Error(`navigation failed: ${nav.errorText}`);
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const { ruleUsage } = await page("CSS.stopRuleUsageTracking");
    await page("Target.closeTarget", { targetId }).catch(() => {});

    const sheet = [...sheets.values()].find((h) => h.sourceURL.endsWith("/src/index.css"));
    if (!sheet) throw new Error("the swapped index.css stylesheet was never added");
    const text = dist.toString("utf8");
    const mine = ruleUsage.filter((r) => r.used && r.styleSheetId === sheet.styleSheetId);
    const styleRules = mine.filter((r) => !isAtRuleBlock(text, r.startOffset));
    const used = unionLength(styleRules.map((r) => [r.startOffset, r.endOffset]));
    debug(
      `ranges reported ${mine.length} (at-rule blocks ${mine.length - styleRules.length}, style rules ${styleRules.length});`,
      `raw DevTools-panel figure incl. blocks: used ${unionLength(mine.map((r) => [r.startOffset, r.endOffset]))} of ${sheet.length}`,
    );
    return { browser: product, total: sheet.length, used, unused: sheet.length - used };
  } finally {
    cdp.close();
    server.close();
    if (chrome) await chrome.kill();
  }
}

/** Chrome reports an at-rule block's range starting just after its keyword: `@layer |x{…}`. */
function isAtRuleBlock(text, start) {
  return /@(layer|media|supports|container|scope|starting-style)\s*$/.test(
    text.slice(Math.max(0, start - 24), start),
  );
}

/** Total length covered by a set of [start, end) ranges, overlaps counted once. */
function unionLength(ranges) {
  let total = 0;
  let cursor = -1;
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const from = Math.max(start, cursor);
    if (end > from) total += end - from;
    cursor = Math.max(cursor, end);
  }
  return total;
}

/** Minimal static server rooted at `root`; resolves once it is listening. */
function serveStatic(root) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const file = path.join(root, pathname);
      if (!file.startsWith(root)) return void res.writeHead(403).end();
      try {
        const body = await readFile(file);
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({ port: server.address().port, close: () => server.close() }),
    );
  });
}

/** Launches headless Chrome with a fresh profile; resolves with its browser ws URL. */
async function launchChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  const bin = candidates.find((p) => existsSync(p));
  if (!bin) {
    throw new Error(
      "no Chrome found: set CHROME_PATH, or pass --cdp $(agent-browser get cdp-url) after `agent-browser open about:blank`",
    );
  }
  const profile = await mkdtemp(path.join(os.tmpdir(), "zazz-measure-"));
  const proc = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
      if (match) resolve(match[1]);
    });
    proc.on("exit", (code) => reject(new Error(`Chrome exited (${code}): ${stderr}`)));
  });
  return {
    wsUrl,
    kill: async () => {
      proc.kill();
      await new Promise((resolve) => proc.on("exit", resolve));
      await rm(profile, { recursive: true, force: true });
    },
  };
}

/** Tiny CDP client over the global WebSocket: `send` with optional session, `on`/`once` for events. */
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;
    const listen = (method, fn) => listeners.set(method, [...(listeners.get(method) ?? []), fn]);
    ws.addEventListener("error", (event) =>
      reject(new Error(`CDP connect failed: ${event.message}`)),
    );
    ws.addEventListener("message", ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id !== undefined) {
        const { resolve: ok, reject: fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message} (${msg.error.data ?? ""})`));
        else ok(msg.result);
      } else {
        for (const fn of listeners.get(msg.method) ?? []) fn(msg.params, msg.sessionId);
      }
    });
    ws.addEventListener("open", () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((ok, fail) => {
            const id = nextId++;
            pending.set(id, { resolve: ok, reject: fail });
            ws.send(JSON.stringify({ id, method, params, sessionId }));
          }),
        on: listen,
        once: (method, sessionId) =>
          new Promise((ok) => {
            listen(method, (params, sid) => {
              if (sid === sessionId) ok(params);
            });
          }),
        close: () => ws.close(),
      }),
    );
  });
}
