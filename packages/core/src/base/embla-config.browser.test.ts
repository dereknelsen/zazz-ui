"use strict";

/**
 * @fileoverview Carousel config on an element without the
 * carousel identity is ignored; the same config on an identified root applies.
 */

import { describe, expect, it } from "vite-plus/test";
import { EmblaInit } from "./embla.ts";
import { mount } from "../../test/browser.ts";

const TRACK = `<div data-carousel-slot="viewport"><div data-carousel-slot="container"><div data-carousel-slot="slide">1</div></div></div>`;

describe("carousel config (claim 29)", () => {
  it("initializes identified roots only", () => {
    const root = mount(`<div>
      <div data-carousel-loop="true" data-plain>${TRACK}</div>
      <div data-ui="carousel" data-carousel-loop="true" data-identified>${TRACK}</div>
    </div>`);
    EmblaInit.init(root);
    type Root = Element & { _emblaApi?: { destroy(): void }; _emblaController?: AbortController };
    const api = (el: Element) => (el as Root)._emblaApi;
    expect(api(root.querySelector("[data-plain]")!)).toBeUndefined();
    const identified = root.querySelector("[data-identified]") as Root;
    expect(api(identified)).toBeDefined();
    // Tear down so Embla's document listeners do not outlive this test
    identified._emblaController?.abort();
    identified._emblaApi?.destroy();
    root.remove();
  });
});
