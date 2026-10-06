/**
 * @fileoverview ESLint runs on HTML only: Zazz markup checks (the `<ui-debug>`
 * audit, as squiggles) plus a few html-eslint structure rules. Oxlint owns
 * JS/TS. Loaded through jiti, so the plugin runs from source with no build.
 */

import html from "@html-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import zazz from "@zazz-ui/eslint-plugin";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/.next/**",
    "**/node_modules/**",
    "**/__screenshots__/**",
    "**/.vscode-test/**",
    // the extension's e2e fixture holds findings on purpose
    "packages/vscode/e2e/fixtures/**",
  ]),
  {
    files: ["**/*.html"],
    plugins: { html },
    language: "html/html",
    extends: [zazz.configs.recommended],
    rules: {
      // a formatter: fails the CLI when unformatted (VS Code hides it and fixes on save)
      "zazz/style-format": "error",
      "html/no-duplicate-attrs": "warn",
      "html/no-duplicate-id": "warn",
    },
  },
]);
