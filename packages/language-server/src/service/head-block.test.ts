/**
 * @fileoverview Auto-imports on pages whose head block lists primitives:
 * completion edits, the missing-import diagnostic and its fix, and the pages
 * that need nothing (whole kit, base identities, already loaded).
 */

import { buildHead, findHeadBlock, headMarker, type HeadOptions } from "@zazz-ui/core/head.ts";
import { describe, expect, it } from "vite-plus/test";
import { parseHtml } from "../html/parse.ts";
import { cursor } from "../../test/cursor.ts";
import { complete } from "./completion.ts";
import { diagnose } from "./diagnostics.ts";
import { importEdit, primitiveOf } from "./head-block.ts";

function page(options: HeadOptions, body: string): string {
  return `<html>\n<head>\n  ${headMarker(options)}\n${buildHead(options)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")}\n  <!-- /zazz:head -->\n</head>\n<body>\n${body}\n</body>\n</html>`;
}

const GRANULAR: HeadOptions = {
  base: "./zazz",
  primitives: ["card"],
  fontDisplay: false,
  theme: false,
};

function applyEdit(text: string, edit: { range: [number, number]; newText: string }): string {
  return text.slice(0, edit.range[0]) + edit.newText + text.slice(edit.range[1]);
}

describe("auto-imports", () => {
  it("maps identities and tag forms to their primitive", () => {
    expect(primitiveOf("dialog")).toBe("dialog");
    expect(primitiveOf("radio-group")).toBe("radio");
    expect(primitiveOf("ui-carousel")).toBe("carousel");
    expect(primitiveOf("prose")).toBeNull();
  });

  it("completing an identity adds its primitive to the head block", () => {
    const marked = page(GRANULAR, `<dialog data-ui="dia|"></dialog>`);
    const { parsed, offset, text } = cursor(marked);
    const item = complete(parsed, offset).find((i) => i.label === "dialog")!;
    expect(item.detail).toContain("adds dialog to the head");
    const next = applyEdit(text, item.additionalEdits![0]!);
    expect(findHeadBlock(next)?.options.primitives).toEqual(["card", "dialog"]);
    expect(next).toContain("primitives/dialog/dialog.css");
  });

  it("does nothing for loaded primitives, base identities, or whole-kit pages", () => {
    const loaded = cursor(page(GRANULAR, `<div data-ui="ca|"></div>`));
    expect(
      complete(loaded.parsed, loaded.offset).find((i) => i.label === "card")!.additionalEdits,
    ).toBeUndefined();
    const base = cursor(page(GRANULAR, `<div data-ui="pro|"></div>`));
    expect(
      complete(base.parsed, base.offset).find((i) => i.label === "prose")!.additionalEdits,
    ).toBeUndefined();
    expect(importEdit(page({ base: "./zazz" }, ""), "dialog")).toBeUndefined();
  });

  it("flags a used primitive the head does not load, with the fix", () => {
    const text = page(GRANULAR, `<div data-ui="card"></div>\n<ui-carousel></ui-carousel>`);
    const missing = diagnose(parseHtml(text)).filter((d) => d.rule === "missing-import");
    expect(missing.map((d) => [d.severity, text.slice(...d.range)])).toEqual([
      ["info", "ui-carousel"],
    ]);
    expect(findHeadBlock(applyEdit(text, missing[0]!.fix!))?.options.primitives).toEqual([
      "card",
      "carousel",
    ]);
  });

  it("adds to a CDN granular head the same way", () => {
    const cdn: HeadOptions = {
      cdn: { version: "0.4.1", primitives: ["card"] },
      fontDisplay: false,
      theme: false,
    };
    const edit = importEdit(page(cdn, ""), "dialog")!;
    expect(edit.newText).toContain("@zazz-ui/core@0.4.1/src/primitives/dialog/dialog.css");
  });
});
