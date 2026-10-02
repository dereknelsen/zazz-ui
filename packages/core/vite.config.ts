import { playwright } from "vite-plus/test/browser-playwright";
import { defineConfig } from "vite-plus";
import { emulateTouch, mouseDown, mouseUp } from "./test/commands.ts";

// Chromium always; ZAZZ_BROWSERS=webkit,firefox opts the other engines in
// (after `pnpm exec playwright install webkit firefox`).
const browsers = ["chromium", ...(process.env.ZAZZ_BROWSERS?.split(",").filter(Boolean) ?? [])];

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
