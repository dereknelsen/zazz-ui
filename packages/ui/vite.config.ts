import { defineConfig } from "vite-plus";

export default defineConfig({
  // Bundled single-file builds for one-request CDN use (jsDelivr/unpkg point at
  // dist/ via the package.json "unpkg"/"jsdelivr"/"style" fields). The unbundled,
  // readable per-file output that npm/copy-paste users consume is emitted by tsc
  // (see tsconfig.json) — dts comes from there too.
  pack: {
    entry: {
      zazz: "src/index.ts",
      style: "src/index.css",
    },
    dts: false,
    // The package is type: module — emit dist/zazz.js, not .mjs.
    fixedExtension: false,
    // dist/ is the one-request CDN artifact; the readable source stays in src/.
    minify: true,
    css: {
      fileName: "zazz.css",
      minify: true,
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
