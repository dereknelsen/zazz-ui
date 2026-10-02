"use strict";

/**
 * @fileoverview The layout is the band grid for its
 * children, `layout-*` lines resolve through implicit named areas and survive a
 * subgrid, a child's `--col` places it, and a `--grid-cols--md` tier on the
 * layout leaves its bands intact below md.
 */

import { describe, expect, it } from "vite-plus/test";
import { atWidth, lengthPx, mount, style, useKit } from "../../../test/browser.ts";

const left = (el: Element) => el.getBoundingClientRect().left;
const width = (el: Element) => el.getBoundingClientRect().width;

describe("layout", () => {
  useKit();

  it("places children in the lg band by default, in tag and attribute form", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <ui-layout data-tag><p data-child>a</p></ui-layout>
      <div data-ui="layout" data-attr><p data-child>b</p></div>
      <div data-probe style="--w: var(--breakpoint-lg)"></div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const layout = root.querySelector(selector)!;
      expect(style(layout, "display"), selector).toBe("grid");
      expect(width(layout.querySelector("[data-child]")!), selector).toBeCloseTo(
        width(root.querySelector("[data-probe]")!),
        0,
      );
    }
  });

  it("a nested layout is a subgrid whose child aligns to the outer md band (claim 11)", async () => {
    await atWidth(1400);
    const root = mount(`<ui-layout>
      <p style="--col: layout-md" data-outer>a</p>
      <ui-layout data-nested><p style="--col: layout-md" data-inner>b</p></ui-layout>
    </ui-layout>`);
    expect(style(root.querySelector("[data-nested]")!, "grid-template-columns")).not.toBe("none");
    expect(left(root.querySelector("[data-inner]")!)).toBeCloseTo(
      left(root.querySelector("[data-outer]")!),
      0,
    );
  });

  it("data-layout-size, --col, and a tier-only --col--lg place children; bleed spans the edge", async () => {
    await atWidth(1400);
    const root = mount(`<div>
      <ui-layout data-layout-size="xl"><p data-xl>a</p></ui-layout>
      <ui-layout><p style="--col: layout-bleed" data-bleed>b</p><p style="--col--lg: layout-xl" data-tier>c</p></ui-layout>
      <div data-lg style="--w: var(--breakpoint-lg)"></div>
      <div data-xl-probe style="--w: var(--breakpoint-xl)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(width(at("[data-xl]"))).toBeCloseTo(width(at("[data-xl-probe]")), 0);
    expect(width(at("[data-tier]"))).toBeCloseTo(width(at("[data-xl-probe]")), 0);
    expect(width(at("[data-bleed]"))).toBeCloseTo(
      width(at("[data-bleed]").closest("ui-layout")!),
      0,
    );
    await atWidth(600);
    // below lg the tier is off and the child keeps the default band, not `auto`
    const layout = at("[data-tier]").closest("ui-layout")!;
    expect(width(at("[data-tier]"))).toBeCloseTo(
      width(layout) - 2 * lengthPx("var(--ui-layout-gutters)"),
      0,
    );
    await atWidth(1400);
  });

  it("--grid-cols--md: 3 on a layout leaves its bands intact below md (claim 22)", async () => {
    await atWidth(600);
    const layout = mount(`<ui-layout style="--grid-cols--md: 3"><p data-child>a</p></ui-layout>`);
    expect(style(layout, "grid-template-columns")).not.toMatch(/^repeat|^\d+px \d+px \d+px$/);
    expect(style(layout.querySelector("[data-child]")!, "grid-column-start")).toBe("layout-lg");
    await atWidth(1400);
  });

  it("aligns children to the block start and stretches them across their band", () => {
    const layout = mount(`<div data-ui="layout"><p>child</p></div>`);
    expect(style(layout, "align-items")).toBe("start");
    expect(style(layout, "justify-items")).toBe("stretch");
  });
});
