import { defineConfig } from "vite-plus";

export default defineConfig({
  // Bundled single-file script build for one-request CDN use (jsDelivr/unpkg
  // point at dist/ via the package.json "unpkg"/"jsdelivr" fields). The
  // unbundled, readable per-file output that npm/copy-paste users consume is
  // emitted by tsc (see tsconfig.json) — dts comes from there too. Every css
  // file in dist/ (zazz.css and the modular map) is owned by
  // scripts/build-dist.mjs, which runs after this in `vp run build`.
  pack: {
    entry: {
      zazz: "src/index.ts",
    },
    dts: false,
    // The package is type: module — emit dist/zazz.js, not .mjs.
    fixedExtension: false,
    // dist/ is the one-request CDN artifact; the readable source stays in src/.
    minify: true,
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
