"use strict";

/**
 * @fileoverview Accordion: both forms size the summary icon from
 * the hook and rotate it when the item opens.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const ITEM = `<details><summary>Q<svg data-accordion-slot='marker'></svg></summary><div>A</div></details>`;

describe("accordion", () => {
  useKit();
  useCss(`summary > [data-accordion-slot='marker'] { transition: none; }`);

  it("sizes the summary icon from --ui-accordion-icon-size in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-accordion data-tag>${ITEM}</ui-accordion>
      <div data-ui="accordion" data-attr>${ITEM}</div>
    </div>`);
    const size = lengthPx("var(--ui-accordion-icon-size)");
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const icon = root.querySelector(`${selector} summary > [data-accordion-slot='marker']`)!;
      expect(Number.parseFloat(style(icon, "inline-size")), selector).toBeCloseTo(size, 1);
      expect(style(root.querySelector(`${selector} > details`)!, "display"), selector).toBe("grid");
    }
  });

  it("rotates the icon when the item opens", () => {
    const root = mount(`<ui-accordion>${ITEM}</ui-accordion>`);
    const icon = root.querySelector("summary > [data-accordion-slot='marker']")!;
    expect(style(icon, "transform")).toBe("none");
    root.querySelector("details")!.open = true;
    expect(style(icon, "transform")).not.toBe("none");
  });
});
