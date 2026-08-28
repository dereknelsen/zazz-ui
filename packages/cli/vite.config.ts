import { defineConfig } from "vite-plus";

export default defineConfig({
  // Single ESM bin: the shebang in src/cli.ts survives and dist/cli.js is
  // chmod +x by tsdown; everything in "dependencies" stays external and is
  // installed by the consumer's package manager.
  pack: {
    entry: {
      cli: "src/cli.ts",
    },
    platform: "node",
    dts: false,
    // The package is type: module — emit dist/cli.js, not .mjs.
    fixedExtension: false,
    // Readable stack traces beat a few KB in a CLI.
    minify: false,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "e2e/**/*.test.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
