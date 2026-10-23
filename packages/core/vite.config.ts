import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { emulateTouch, mouseDown, mouseUp } from "./test/commands.ts";

// Chromium always; ZAZZ_BROWSERS=webkit,firefox opts the other engines in
// (after `pnpm exec playwright install webkit firefox`).
type Browser = "chromium" | "firefox" | "webkit";
const browsers: Browser[] = [
  "chromium",
  ...((process.env.ZAZZ_BROWSERS?.split(",").filter(Boolean) ?? []) as Browser[]),
];

// ZAZZ_SKIP_BROWSER=1 runs only the unit project — deliberately, never silently.
const skipBrowser = process.env.ZAZZ_SKIP_BROWSER === "1";
if (skipBrowser) console.warn("[zazz] ZAZZ_SKIP_BROWSER=1: browser tests are not running.");

export default defineConfig({
  // Bundled single-file builds for one-request CDN use (package.json
  // "unpkg"/"jsdelivr"/"style" point at dist/). The readable per-file output,
  // including dts, is emitted by tsc.
  pack: {
    entry: {
      zazz: "src/index.ts",
      style: "src/index.css",
    },
    dts: false,
    // The package is type: module — emit dist/zazz.js, not .mjs.
    fixedExtension: false,
    // Match tsc's ES2022 so the bundle and the per-file output parse in the
    // same browsers. Left at esnext, the toaster's `using` declaration shipped
    // as-is, and stable Safari cannot parse it: the whole bundle failed there.
    target: "es2022",
    minify: true,
    css: {
      fileName: "zazz.css",
      minify: true,
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
          // Keep Vite's dependency optimizer off for the node side. With it on,
          // `vite-plus/test` resolved to a second copy of vitest (the one pnpm
          // links as @vitest/browser-playwright's peer, not the one running the
          // worker), and every file after the first few failed at its first
          // describe() with "Cannot read properties of undefined (reading
          // 'config')": that copy's runner is never set. Seen 2026-10-22 in
          // `vp run -r test` and under CPU load; vitest's own default is off.
          deps: { optimizer: { ssr: { enabled: false } } },
        },
      },
      ...(skipBrowser
        ? []
        : [
            {
              test: {
                name: "browser",
                include: ["src/**/*.browser.test.ts"],
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright(),
                  instances: browsers.map((browser) => ({ browser })),
                  commands: { emulateTouch, mouseDown, mouseUp },
                },
              },
            },
          ]),
    ],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
