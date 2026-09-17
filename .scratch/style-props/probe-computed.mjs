// @ts-nocheck -- Node-only comparison script; the repo-root tsconfig used for
// loose files has no @types/node, so `node:*` imports cannot type-check here.

// Ticket 34: computed-style comparison of the example pages, 0.4.1 vs 0.5.0.
// Serves two package trees statically (each page's own `../src/index.css` and
// `../src/index.js`, so run `tsc -p tsconfig.json` in both first), drives
// headless Chrome over CDP (same approach as measure.mjs), and prints one JSON
// document with the computed values of a fixed set of selectors per page ×
// viewport × version. The tables in regression.md were rendered from it.
//
// Usage: node probe-computed.mjs <old packages/core dir> <new packages/core dir> > out.json

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const [OLD, NEW] = process.argv.slice(2).map((p) => path.resolve(p));
if (!OLD || !NEW) throw new Error("usage: node probe.mjs <old core dir> <new core dir>");

const WIDTHS = [600, 900, 1300];
const HEIGHT = 900;
const SETTLE_MS = 1500;
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

// Structural selectors that resolve to the same element in both versions
// (nth-of-type, not the shifted data-container values / breakpoint prefixes).
const C = "main > section:nth-of-type(2) > .container";
const R = "main > section:nth-of-type(4) > .container";
const RESP = "main > section:nth-of-type(2) > .container";
const PAGES = {
  "layout.html": [
    ["intro .container", "main > section:nth-of-type(1) > .container", ["display", "inline-size", "grid-template-columns", "padding-inline-start", "column-gap"]],
    ["band child 1 (bleed)", `${C} > div:nth-of-type(1)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["band child 3 (96rem band)", `${C} > div:nth-of-type(3)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["band child 5 (64rem band)", `${C} > div:nth-of-type(5)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["band child 7 (40rem band)", `${C} > div:nth-of-type(7)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["default-band section child", "main > section:nth-of-type(3) > .container > div:nth-of-type(1)", ["inline-size", "grid-column-start", "grid-column-end"]],
    ["@lg:container (was @md:)", `${R} > div.mb-lg`, ["display", "grid-template-columns", "inline-size"]],
    ["@lg:container child 2", `${R} > div.mb-lg > div:nth-of-type(2)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["@max-lg:container (was @max-md:)", `${R} > div.grid`, ["display", "grid-template-columns", "column-gap", "row-gap", "inline-size"]],
    ["@max-lg:container child 1", `${R} > div.grid > div:nth-of-type(1)`, ["inline-size", "grid-column-start", "grid-column-end"]],
    ["article container", "main > section:nth-of-type(5) > .container", ["display", "inline-size", "max-inline-size", "padding-inline-start"]],
  ],
  "responsive.html": [
    ["grid columns demo", `${RESP} > div:nth-of-type(1) > div.grid`, ["grid-template-columns", "column-gap", "inline-size"]],
    ["flex direction demo", `${RESP} > div:nth-of-type(2) > div.flex`, ["flex-direction", "column-gap", "row-gap", "inline-size"]],
    ["display toggle: narrow tile", `${RESP} > div:nth-of-type(3) > div.grid > div:nth-of-type(1)`, ["display"]],
    ["display toggle: wide tile", `${RESP} > div:nth-of-type(3) > div.grid > div:nth-of-type(2)`, ["display"]],
    ["nav pattern menu", `${RESP} > div:nth-of-type(3) menu`, ["display"]],
    ["col-span main", `${RESP} > div:nth-of-type(4) > div.grid > div:nth-of-type(1)`, ["grid-column-start", "grid-column-end", "inline-size"]],
    ["flex basis item 1", `${RESP} > div:nth-of-type(5) > div.flex > div:nth-of-type(1)`, ["flex-basis", "inline-size"]],
    ["alignment row (last block)", `${RESP} > div:last-of-type > div.flex`, ["flex-direction", "justify-content", "column-gap"]],
    ["alignment hgroup", `${RESP} > div:last-of-type > hgroup`, ["text-align", "padding-inline-start"]],
    ["style props block (0.5 only)", `${RESP} > div[style*="--grid-cols"], ${RESP} > div > div[style*="--grid-cols"]`, ["display", "grid-template-columns", "column-gap", "row-gap", "inline-size"]],
  ],
  "products.html": [
    ["breadcrumb .container", "main > section > .container:nth-of-type(1)", ["display", "inline-size", "padding-block-start", "padding-inline-start"]],
    ["product .container", "main > section > .container:nth-of-type(2)", ["display", "grid-template-columns", "inline-size", "padding-inline-start"]],
    ["product grid (@max-lg:container)", "main > section > .container:nth-of-type(2) > div.grid", ["display", "grid-template-columns", "column-gap", "row-gap", "inline-size"]],
    ["ui-lightbox cell", "main > section > .container:nth-of-type(2) > div.grid > ui-lightbox", ["display", "inline-size", "grid-column-start", "grid-column-end"]],
    ["hgroup cell", "main > section > .container:nth-of-type(2) > div.grid > hgroup", ["display", "inline-size", "grid-column-start", "grid-column-end", "row-gap"]],
    ["header .container", "header > .container", ["display", "inline-size", "grid-template-columns", "padding-inline-start"]],
    ["footer .container", "footer > .container", ["inline-size", "padding-block-start", "padding-inline-start"]],
  ],
};

const probeSource = `(${function (specs) {
  const out = {};
  for (const [label, selector, props] of specs) {
    const el = document.querySelector(selector);
    if (!el) {
      out[label] = null;
      continue;
    }
    const cs = getComputedStyle(el);
    const values = {};
    for (const prop of props) values[prop] = cs.getPropertyValue(prop);
    out[label] = values;
  }
  out.__body = {
    "inline-size": getComputedStyle(document.body).getPropertyValue("inline-size"),
    "scroll-width": String(document.documentElement.scrollWidth),
  };
  return out;
}.toString()})`;

const servers = { old: await serveStatic(OLD), new: await serveStatic(NEW) };
const chrome = await launchChrome();
const cdp = await connect(chrome.wsUrl);
const result = { browser: null, pages: {} };
const consoleLog = {};

try {
  result.browser = (await cdp.send("Browser.getVersion")).product;
  for (const [page, specs] of Object.entries(PAGES)) {
    result.pages[page] = {};
    for (const width of WIDTHS) {
      result.pages[page][width] = {};
      for (const version of ["old", "new"]) {
        const url = `http://127.0.0.1:${servers[version].port}/examples/${page}`;
        const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
        const send = (method, params) => cdp.send(method, params, sessionId);
        const key = `${page} ${width} ${version}`;
        consoleLog[key] = [];
        cdp.on("Runtime.consoleAPICalled", (params, sid) => {
          if (sid === sessionId && ["error", "warning"].includes(params.type)) {
            consoleLog[key].push(params.args.map((a) => a.value ?? a.description).join(" "));
          }
        });
        cdp.on("Runtime.exceptionThrown", (params, sid) => {
          if (sid === sessionId) consoleLog[key].push(params.exceptionDetails.text);
        });
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height: HEIGHT,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await send("Page.enable");
        await send("Runtime.enable");
        const loaded = cdp.once("Page.loadEventFired", sessionId);
        const nav = await send("Page.navigate", { url });
        if (nav.errorText) throw new Error(`navigation failed: ${nav.errorText}`);
        await loaded;
        await new Promise((r) => setTimeout(r, SETTLE_MS));
        const { result: value, exceptionDetails } = await send("Runtime.evaluate", {
          expression: `${probeSource}(${JSON.stringify(specs)})`,
          returnByValue: true,
        });
        if (exceptionDetails) throw new Error(`probe failed: ${exceptionDetails.text}`);
        result.pages[page][width][version] = value.value;
        await send("Target.closeTarget", { targetId }).catch(() => {});
      }
    }
  }
  result.console = consoleLog;
  console.log(JSON.stringify(result, null, 2));
} finally {
  cdp.close();
  servers.old.close();
  servers.new.close();
  await chrome.kill();
}

// --- helpers (from measure.mjs) ---------------------------------------------

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

async function launchChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  const bin = candidates.find((p) => existsSync(p));
  if (!bin) throw new Error("no Chrome found: set CHROME_PATH");
  const profile = await mkdtemp(path.join(os.tmpdir(), "zazz-probe-"));
  const proc = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=1300,${HEIGHT}`,
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
