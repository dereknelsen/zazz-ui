import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "node",
    // Optimizer off for the node side; see packages/core/vite.config.ts.
    deps: { optimizer: { ssr: { enabled: false } } },
    include: ["src/**/*.test.ts"],
  },
});
