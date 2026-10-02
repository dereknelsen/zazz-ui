"use strict";

/**
 * @fileoverview The table: scoped presets on the table, a row, and
 * the caption, and a `--text` utility on the root.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useCss, useKit } from "../../../test/browser.ts";

const ROWS = `<caption data-table-caption="top">c</caption>
  <thead><tr><th data-head>h</th></tr></thead>
  <tbody><tr data-table-state="selected"><td data-selected>a</td></tr><tr><td data-plain>b</td></tr></tbody>`;

describe("table", () => {
  useKit();
  useCss(`[data-ui~="table"] * { transition: none; }`);

  it("grid and sm presets draw column rules and shrink the head", () => {
    const root = mount(`<div>
      <table data-ui="table" data-default>${ROWS}</table>
      <table data-ui="table" data-table-variant="grid" data-table-size="sm" data-grid>${ROWS}</table>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-default] [data-plain]"), "border-inline-start-width")).toBe("0px");
    expect(style(at("[data-grid] [data-plain]"), "border-inline-start-width")).toBe("1px");
    expect(Number.parseFloat(style(at("[data-grid] [data-head]"), "block-size"))).toBeLessThan(
      Number.parseFloat(style(at("[data-default] [data-head]"), "block-size")),
    );
  });

  it("a selected row, a top caption, and a --text utility apply", () => {
    const table = mount(`<table data-ui="table" style="--font-size: 19px">${ROWS}</table>`);
    expect(style(table.querySelector("[data-selected]")!, "background-color")).not.toBe(
      style(table.querySelector("[data-plain]")!, "background-color"),
    );
    expect(style(table, "caption-side")).toBe("bottom");
    expect(style(table.querySelector("caption")!, "caption-side")).toBe("top");
    expect(style(table, "font-size")).toBe("19px");
  });
});
