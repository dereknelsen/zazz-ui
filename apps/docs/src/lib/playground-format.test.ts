import { describe, expect, it } from "vite-plus/test";
import { applyEdits, findings, formatEdits } from "./playground-format.ts";

describe("formatEdits", () => {
  it("rewrites a multi-utility style in cascade order, one per line", () => {
    const text = `<div>\n  <p style="--text: red; --px:4; --display: flex">a</p>\n</div>`;
    const edits = formatEdits(text);
    expect(edits).toHaveLength(1);
    const formatted = applyEdits(text, edits);
    // cascade order (flow before spacing before color), one declaration per line, `--px:4` normalized
    expect(formatted).toMatch(/style="\n\s+--display: flex;\n\s+--px: 4;\n\s+--text: red;\n\s+"/);
    expect(formatted.startsWith("<div>\n  <p ")).toBe(true);
  });

  it("leaves a formatted document alone", () => {
    expect(formatEdits(`<p style="--px: 4">a</p>`)).toEqual([]);
  });
});

describe("findings", () => {
  it("reports the audit with ranges into the text", () => {
    const text = `<p style="--foo: 1; --px: 4">a</p>`;
    const found = findings(text);
    expect(found.map((f) => f.rule)).toEqual(["unknown-utility"]);
    expect(text.slice(...found[0].range)).toContain("--foo");
    expect(found[0].severity).toBe("warning");
  });
});
