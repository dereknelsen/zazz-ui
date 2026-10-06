import { defineConfig } from "vite-plus";

export default defineConfig({
  // Two CommonJS bundles: the extension host loads dist/client.cjs, which starts
  // dist/server.cjs in its own Node process. Everything but `vscode` is bundled
  // (devDependencies), core included, from source.
  pack: {
    entry: {
      client: "src/client.ts",
      server: "src/server.ts",
    },
    format: "cjs",
    platform: "node",
    target: "node20",
    deps: { neverBundle: ["vscode"] },
    dts: false,
    minify: false,
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
