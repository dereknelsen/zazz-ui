"use strict";

/**
 * @fileoverview The toggle group: both forms fuse their toggles and
 * `data-toggle-group-orientation="vertical"` stacks them.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

const TOGGLES = `<label data-ui="toggle" data-first><input type="radio" name="g" /><span>a</span></label>
  <label data-ui="toggle"><input type="radio" name="g" /><span>b</span></label>`;

describe("toggle group", () => {
  useKit();

  it("squares the inner corners in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-toggle-group data-tag>${TOGGLES}</ui-toggle-group>
      <div data-ui="toggle-group" data-attr>${TOGGLES}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const group = root.querySelector(selector)!;
      const first = group.querySelector("[data-first]")!;
      expect(style(group, "display"), selector).toBe("flex");
      expect(style(first, "border-end-end-radius"), selector).toBe("0px");
      expect(style(first, "border-start-start-radius"), selector).not.toBe("0px");
    }
  });

  it("stacks a vertical group and squares the block-end corners", () => {
    const group = mount(
      `<ui-toggle-group data-toggle-group-orientation="vertical">${TOGGLES}</ui-toggle-group>`,
    );
    const first = group.querySelector("[data-first]")!;
    expect(style(group, "flex-direction")).toBe("column");
    expect(style(first, "border-end-start-radius")).toBe("0px");
    expect(style(first, "border-start-end-radius")).not.toBe("0px");
  });

  it("collapses the seam without overlapping: the later control drops its leading border", () => {
    const root = mount(`<div>
      <ui-toggle-group data-row>${TOGGLES}</ui-toggle-group>
      <ui-toggle-group data-column data-toggle-group-orientation="vertical">${TOGGLES}</ui-toggle-group>
    </div>`);
    const [rowFirst, rowSecond] = root.querySelector("[data-row]")!.children;
    expect(style(rowSecond!, "margin-inline-start")).toBe("0px");
    expect(style(rowSecond!, "border-inline-start-width")).toBe("0px");
    expect(style(rowFirst!, "border-inline-end-width")).not.toBe("0px");
    const [, columnSecond] = root.querySelector("[data-column]")!.children;
    expect(style(columnSecond!, "margin-block-start")).toBe("0px");
    expect(style(columnSecond!, "border-block-start-width")).toBe("0px");
  });
});
