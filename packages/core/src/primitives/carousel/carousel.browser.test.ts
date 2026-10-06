"use strict";

/**
 * @fileoverview Carousel: `data-carousel-slot` parts lay out the
 * track in tag and attribute form, and a dual-mode `--gap` utility on the
 * container spaces the slides.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, scale, style, useKit } from "../../../test/browser.ts";

const TRACK = (attrs = "") => `<div data-carousel-slot="viewport">
    <div data-carousel-slot="container" ${attrs}><div data-carousel-slot="slide">1</div><div data-carousel-slot="slide">2</div></div>
  </div>`;

describe("carousel", () => {
  useKit();

  it("lays out the track in tag and attribute form and takes a --gap utility", () => {
    const root = mount(`<div>
      <ui-carousel data-tag>${TRACK()}</ui-carousel>
      <div data-ui="carousel" data-attr>${TRACK()}</div>
      <ui-carousel data-utility>${TRACK('style="--gap: 4"')}</ui-carousel>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const viewport = root.querySelector(`${selector} [data-carousel-slot='viewport']`)!;
      const container = root.querySelector(`${selector} [data-carousel-slot='container']`)!;
      expect(style(viewport, "overflow-x"), selector).toBe("clip");
      expect(style(container, "display"), selector).toBe("flex");
      expect(
        style(root.querySelector(`${selector} [data-carousel-slot='slide']`)!, "flex-shrink"),
        selector,
      ).toBe("0");
    }
    expect(
      Number.parseFloat(
        style(root.querySelector("[data-utility] [data-carousel-slot='container']")!, "column-gap"),
      ),
    ).toBeCloseTo(scale(4), 1);
  });

  it("keeps transitions off slides so a looped slide never sweeps across (links included)", () => {
    const root = mount(`<ui-carousel><div data-carousel-slot="viewport">
      <div data-carousel-slot="container"><a href="#" data-carousel-slot="slide">1</a><div data-carousel-slot="slide">2</div></div>
    </div></ui-carousel>`);
    for (const slide of root.querySelectorAll("[data-carousel-slot='slide']")) {
      expect(style(slide, "transition-property"), slide.tagName).toBe("none");
    }
  });
});
