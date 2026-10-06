/**
 * @fileoverview Fragment snippets: committed file is fresh, ids become tab
 * stops with mirrored references, and snippet syntax is escaped.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { SNIPPETS_PATH, generateSnippets, snippetBody, snippetsText } from "./generate-snippets.ts";

describe("fragment snippets", () => {
  it("matches the committed file", () => {
    expect(readFileSync(SNIPPETS_PATH, "utf8")).toBe(snippetsText());
  });

  it("makes ids tab stops and mirrors their references", () => {
    expect(
      snippetBody(
        `<button commandfor="d1">Open</button>\n<dialog id="d1" aria-labelledby="t1"><h2 id="t1">T</h2></dialog>\n`,
      ),
    ).toBe(
      `<button commandfor="$1">Open</button>\n<dialog id="\${1:d1}" aria-labelledby="$2"><h2 id="\${2:t1}">T</h2></dialog>`,
    );
  });

  it("escapes snippet syntax in the markup", () => {
    expect(snippetBody(`<td>$42 {x}</td>`)).toBe("<td>\\$42 {x\\}</td>");
  });

  it("has one snippet per kit fragment, prefixed zazz-", () => {
    const snippets = generateSnippets();
    expect(Object.keys(snippets).length).toBeGreaterThan(90);
    expect(snippets["Zazz: dialog"]?.prefix).toBe("zazz-dialog");
    expect(snippets["Zazz: dialog"]?.body.join("\n")).toMatch(/commandfor="\$\d+"/);
  });
});
