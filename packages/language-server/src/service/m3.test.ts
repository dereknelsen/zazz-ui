/**
 * @fileoverview Quick fixes beyond the audit's suggestions, head link sorting,
 * inlay hints, folding, and color tokens.
 */

import { describe, expect, it } from "vite-plus/test";
import { parseHtml } from "../html/parse.ts";
import { slice } from "../../test/cursor.ts";
import { colorTokens } from "./colors.ts";
import { diagnose } from "./diagnostics.ts";
import { foldingRanges } from "./folding.ts";
import { cascadeRank, sortImports } from "./imports.ts";
import { inlayHints } from "./inlay.ts";

/** Applies non-overlapping edits back to front. */
function apply(text: string, edits: { range: [number, number]; newText: string }[]): string {
  return [...edits]
    .sort((a, b) => b.range[0] - a.range[0])
    .reduce(
      (out, edit) => out.slice(0, edit.range[0]) + edit.newText + out.slice(edit.range[1]),
      text,
    );
}

describe("quick fixes", () => {
  it("adds the base a tier overrides", () => {
    const text = `<p style="--w--md: 4">a</p>`;
    const [diagnostic] = diagnose(parseHtml(text));
    expect(diagnostic!.rule).toBe("tier-without-base");
    expect(apply(text, [diagnostic!.fix!])).toBe(`<p style="--w: 4; --w--md: 4">a</p>`);
  });
});

describe("sort imports", () => {
  const head = (...hrefs: string[]) =>
    `<head>\n${hrefs.map((href) => `  <link rel="stylesheet" href="${href}" />`).join("\n")}\n</head>`;

  it("ranks kit stylesheets by cascade order and ignores others", () => {
    expect(cascadeRank("./zazz/base/_layers.css")).toBe(0);
    expect(
      cascadeRank(
        "https://cdn.jsdelivr.net/npm/@zazz-ui/core@0.5.0/src/primitives/dialog/dialog.css",
      ),
    ).toBeGreaterThan(0);
    expect(cascadeRank("/styles/site.css")).toBe(-1);
  });

  it("permutes the kit links in place and leaves other tags", () => {
    const text = head(
      "zazz/base/_utilities-box.css",
      "/site.css",
      "zazz/primitives/dialog/dialog.css",
      "zazz/base/_layers.css",
    );
    expect(apply(text, sortImports(parseHtml(text)))).toBe(
      head(
        "zazz/base/_layers.css",
        "/site.css",
        "zazz/primitives/dialog/dialog.css",
        "zazz/base/_utilities-box.css",
      ),
    );
  });

  it("has nothing to do on a sorted head", () => {
    const text = head("zazz/base/_layers.css", "zazz/base/_variables.css");
    expect(sortImports(parseHtml(text))).toEqual([]);
  });
});

describe("inlay hints", () => {
  const hints = (text: string) =>
    inlayHints(parseHtml(text)).map((hint) => [
      text.slice(0, hint.offset).split(/[\s"]/).at(-1),
      hint.label,
    ]);

  it("shows scale ranges, breakpoint thresholds, shorthands, and size tokens", () => {
    expect(
      hints(`<p style="--p: 4; --px--md: 6; --shadow: md; --gap: var(--space-md)">a</p>`),
    ).toEqual([
      ["4", " ≈ 0.9–1rem"],
      ["--px--md", " ≥ 65ch"],
      ["6", " ≈ 1.35–1.5rem"],
      ["md", " = var(--shadow-md)"],
      ["var(--space-md)", " ≈ 1.35rem – 1.5rem"],
    ]);
  });

  it("says nothing about lengths, keywords, or unknown names", () => {
    expect(inlayHints(parseHtml(`<p style="--p: 1rem; --w: auto; --foo: 4">a</p>`))).toEqual([]);
  });
});

describe("folding", () => {
  it("folds multi-line styles, the head block, and runs of kit links", () => {
    const text = [
      "<!-- zazz:head -->",
      '<link rel="stylesheet" href="zazz/base/_layers.css" />',
      '<link rel="stylesheet" href="zazz/base/_variables.css" />',
      '<link rel="stylesheet" href="zazz/base/_reset.css" />',
      "<!-- /zazz:head -->",
      "<p",
      '  style="',
      "    --px: 4;",
      "    --py: 2;",
      '  "',
      ">a</p>",
    ].join("\n");
    expect(foldingRanges(parseHtml(text))).toEqual([
      { startLine: 6, endLine: 8 },
      { startLine: 0, endLine: 3, kind: "imports" },
      { startLine: 1, endLine: 3, kind: "imports" },
    ]);
  });
});

describe("color tokens", () => {
  it("finds var(--color-*) in style with light and dark literals", () => {
    const text = `<p style="--bg: var(--color-primary); --text: red">a</p>`;
    const [color] = colorTokens(parseHtml(text));
    expect(slice(text, color!.range)).toBe("var(--color-primary)");
    expect(color!.light).toMatch(/^oklch/);
    expect(color!.dark).toMatch(/^oklch/);
  });
});
