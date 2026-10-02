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
    include: ["src/**/*.test.ts", "e2e/**/*.test.ts"],
    globalSetup: ["e2e/global-setup.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
