import { defineConfig } from "@vscode/test-cli";

// Downloads a VS Code build into .vscode-test/ on first run.
export default defineConfig({
  files: "e2e/**/*.test.cjs",
  workspaceFolder: "./e2e/fixtures",
  launchArgs: ["--disable-extensions"],
  mocha: { timeout: 30000, ui: "tdd" },
});
