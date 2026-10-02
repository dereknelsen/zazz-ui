"use strict";

/**
 * @fileoverview The lightbox: `data-lightbox-slot` parts in tag and
 * attribute form, and the active thumb (a carousel state) at full opacity.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, style, useCss, useKit } from "../../../test/browser.ts";

const GALLERY = `<div data-lightbox-slot="gallery">
    <ui-carousel data-lightbox-slot="stage">
      <div data-carousel-slot="viewport"><div data-carousel-slot="container">
        <button type="button" data-lightbox-slot="slide" data-carousel-slot="slide" data-slide><span data-lightbox-slot="content"><img alt="" /></span></button>
      </div></div>
      <ui-carousel data-lightbox-slot="thumbs" data-carousel-slot="thumbs">
        <div data-carousel-slot="viewport"><div data-carousel-slot="container">
          <button type="button" data-lightbox-slot="thumb" data-carousel-slot="slide" data-carousel-state="active" data-on><span data-lightbox-slot="thumb-content"><img alt="" /></span></button>
          <button type="button" data-lightbox-slot="thumb" data-carousel-slot="slide" data-off><span data-lightbox-slot="thumb-content"><img alt="" /></span></button>
        </div></div>
      </ui-carousel>
    </ui-carousel>
  </div>`;

describe("lightbox", () => {
  useKit();
  useCss(`[data-lightbox-slot], [data-lightbox-slot] img { transition: none; }`);

  it("rounds stage slides and lights the active thumb, in both forms", () => {
    const root = mount(
      `<div><ui-lightbox data-tag>${GALLERY}</ui-lightbox><div data-ui="lightbox" data-attr>${GALLERY}</div></div>`,
    );
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const box = root.querySelector(selector)!;
      expect(
        Number.parseFloat(
          style(box.querySelector("[data-slide] [data-lightbox-slot='content']")!, "border-radius"),
        ),
        selector,
      ).toBeCloseTo(lengthPx("var(--ui-lightbox-slide-rounded)"), 1);
      expect(style(box.querySelector("[data-on] img")!, "opacity"), selector).toBe("1");
      expect(style(box.querySelector("[data-off] img")!, "opacity"), selector).toBe(
        style(box, "--ui-lightbox-thumb-opacity").trim(),
      );
    }
  });
});
