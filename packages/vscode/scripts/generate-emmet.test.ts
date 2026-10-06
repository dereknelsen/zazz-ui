/**
 * @fileoverview Emmet abbreviations, expanded with the `emmet` engine VS Code
 * uses: committed file is fresh, and `ui-<identity>` builds Zazz markup.
 */

import { readFileSync } from "node:fs";
import expand from "emmet";
import { describe, expect, it } from "vite-plus/test";
import { EMMET_PATH, emmetText, generateEmmet } from "./generate-emmet.ts";

const { snippets } = (generateEmmet() as { html: { snippets: Record<string, string> } }).html;
const html = (abbreviation: string) =>
  expand(abbreviation, { snippets, options: { "output.indent": "  " } });

describe("emmet snippets", () => {
  it("matches the committed file", () => {
    expect(readFileSync(EMMET_PATH, "utf8")).toBe(emmetText());
  });

  it("expands an identity on the element its fragments use", () => {
    expect(html("ui-dialog")).toBe('<dialog data-ui="dialog"></dialog>');
    expect(html("ui-button")).toBe('<button data-ui="button" type="button"></button>');
  });

  it("composes with Emmet operators", () => {
    expect(html("ui-card>h2")).toBe('<div data-ui="card">\n  <h2></h2>\n</div>');
  });

  it("leaves tag forms to Emmet's default", () => {
    expect(snippets["ui-carousel"]).toBeUndefined();
    expect(html("ui-carousel")).toBe("<ui-carousel></ui-carousel>");
  });
});
