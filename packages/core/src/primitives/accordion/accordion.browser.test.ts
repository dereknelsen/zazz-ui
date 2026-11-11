"use strict";

/**
 * @fileoverview Accordion: both forms lay out the root, item, and summary from
 * the --ui-accordion-* hooks (a utility on the element wins over each), size the
 * summary icon from its hook, and rotate it when the item opens.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const ITEM = `<details><summary>Q<svg data-accordion-slot='marker'></svg></summary><div>A</div></details>`;

describe("accordion", () => {
  useKit();
  useCss(`
    summary > [data-accordion-slot='marker'] { transition: none; }
    [data-hooked] {
      --ui-accordion-display: grid;
      --ui-accordion-item-display: grid;
      --ui-accordion-summary-justify: start;
      --ui-accordion-summary-min-h: 10;
    }
  `);

  it("sizes the summary icon from --ui-accordion-icon-size in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-accordion data-tag>${ITEM}</ui-accordion>
      <div data-ui="accordion" data-attr>${ITEM}</div>
    </div>`);
    const size = lengthPx("var(--ui-accordion-icon-size)");
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const icon = root.querySelector(`${selector} summary > [data-accordion-slot='marker']`)!;
      expect(Number.parseFloat(style(icon, "inline-size")), selector).toBeCloseTo(size, 1);
    }
  });

  it("lays out the root, item, and summary from the --ui-accordion-* hooks", () => {
    const root = mount(`<div>
      <ui-accordion data-tag>${ITEM}</ui-accordion>
      <div data-ui="accordion" data-attr>${ITEM}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const accordion = root.querySelector<HTMLElement>(selector)!;
      const item = accordion.querySelector<HTMLElement>(":scope > details")!;
      const summary = item.querySelector<HTMLElement>(":scope > summary")!;
      expect(style(accordion, "display"), selector).toBe("flex");
      expect(style(accordion, "flex-direction"), selector).toBe("column");
      expect(style(item, "display"), selector).toBe("flex");
      expect(style(item, "flex-direction"), selector).toBe("column");
      expect(style(summary, "display"), selector).toBe("flex");
      expect(style(summary, "align-items"), selector).toBe("center");
      expect(style(summary, "justify-content"), selector).toBe("space-between");
    }
  });

  it("re-skins every part from a hook set on an ancestor, and a utility on the element wins", () => {
    const root = mount(`<div data-hooked>
      <ui-accordion>${ITEM}</ui-accordion>
      <ui-accordion data-utility style="--display: block">
        <details style="--display: block"><summary style="--justify: end; --min-h: 20">Q</summary><div>A</div></details>
      </ui-accordion>
    </div>`);
    const hooked = root.querySelector<HTMLElement>("ui-accordion:not([data-utility])")!;
    const hookedItem = hooked.querySelector<HTMLElement>(":scope > details")!;
    const hookedSummary = hookedItem.querySelector<HTMLElement>(":scope > summary")!;
    expect(style(hooked, "display")).toBe("grid");
    expect(style(hookedItem, "display")).toBe("grid");
    expect(style(hookedSummary, "justify-content")).toBe("start");
    expect(Number.parseFloat(style(hookedSummary, "min-block-size"))).toBeCloseTo(
      lengthPx("calc(var(--spacing) * 10)"),
      1,
    );

    const utility = root.querySelector<HTMLElement>("[data-utility]")!;
    const utilityItem = utility.querySelector<HTMLElement>(":scope > details")!;
    const utilitySummary = utilityItem.querySelector<HTMLElement>(":scope > summary")!;
    expect(style(utility, "display")).toBe("block");
    expect(style(utilityItem, "display")).toBe("block");
    expect(style(utilitySummary, "justify-content")).toBe("end");
    expect(Number.parseFloat(style(utilitySummary, "min-block-size"))).toBeCloseTo(
      lengthPx("calc(var(--spacing) * 20)"),
      1,
    );
  });

  it("rotates the icon when the item opens", () => {
    const root = mount(`<ui-accordion>${ITEM}</ui-accordion>`);
    const icon = root.querySelector("summary > [data-accordion-slot='marker']")!;
    expect(style(icon, "transform")).toBe("none");
    root.querySelector("details")!.open = true;
    expect(style(icon, "transform")).not.toBe("none");
  });
});
