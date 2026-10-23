import { defineConfig } from "vite-plus";

export default defineConfig({
  // Shebang in src/cli.ts survives; "dependencies" stay external.
  pack: {
    entry: {
      cli: "src/cli.ts",
    },
    platform: "node",
    dts: false,
    // The package is type: module — emit dist/cli.js, not .mjs.
    fixedExtension: false,
    minify: false,
  },
  test: {
    environment: "node",
    // Optimizer off for the node side; see packages/core/vite.config.ts.
    deps: { optimizer: { ssr: { enabled: false } } },
    include: ["src/**/*.test.ts", "e2e/**/*.test.ts"],
    globalSetup: ["e2e/global-setup.ts"],
    // The e2e tests spawn node and copy a packed kit: ~1 s alone, but past the
    // 5 s default when `vp run -r test` runs every package at once.
    testTimeout: 20_000,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
