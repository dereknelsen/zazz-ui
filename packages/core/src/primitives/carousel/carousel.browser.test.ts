"use strict";

/**
 * @fileoverview Carousel: `data-carousel-slot` parts lay out the
 * track in tag and attribute form, and a dual-mode `--gap` utility on the
 * container spaces the slides.
 */

import { describe, expect, it } from "vite-plus/test";
import { EmblaInit } from "../../base/embla.ts";
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

  it("a drag flags the root with data-ui-dragging and shows the grabbing cursor page-wide", () => {
    const root = mount(`<div>
      <div data-ui="carousel" data-root>${TRACK()}</div>
      <button type="button" data-ui="button" data-outside>b</button>
    </div>`);
    EmblaInit.init(root);
    type Root = Element & {
      _emblaApi?: { emit(event: "pointerDown" | "pointerUp"): void; destroy(): void };
      _emblaController?: AbortController;
    };
    const carousel = root.querySelector("[data-root]") as Root;
    const outside = root.querySelector("[data-outside]")!;
    const html = document.documentElement;
    const rest = style(outside, "cursor");
    expect(rest).not.toBe("grabbing");
    carousel._emblaApi!.emit("pointerDown");
    expect(html.hasAttribute("data-ui-dragging")).toBe(true);
    expect(style(outside, "cursor")).toBe("grabbing");
    carousel._emblaApi!.emit("pointerUp");
    expect(html.hasAttribute("data-ui-dragging")).toBe(false);
    expect(style(outside, "cursor")).toBe(rest);
    carousel._emblaController?.abort();
    carousel._emblaApi?.destroy();
  });

  describe("manual navigation and autoplay", () => {
    type Api = {
      selectedScrollSnap(): number;
      plugins(): { autoplay?: { isPlaying(): boolean } };
      destroy(): void;
    };
    type Root = Element & { _emblaApi?: Api; _emblaController?: AbortController };
    const SLIDES = [1, 2, 3, 4].map((n) => `<div data-carousel-slot="slide">${n}</div>`).join("");
    const carousel = (attrs: string) => {
      const root = mount(`<div>
        <div data-ui="carousel" data-carousel-loop="true" data-carousel-plugins="autoplay" ${attrs} data-root>
          <div data-carousel-slot="viewport"><div data-carousel-slot="container">${SLIDES}</div></div>
          <button type="button" data-carousel-slot="prev">prev</button>
          <button type="button" data-carousel-slot="next">next</button>
        </div>
      </div>`);
      EmblaInit.init(root);
      const el = root.querySelector("[data-root]") as Root;
      const next = el.querySelector<HTMLButtonElement>("[data-carousel-slot~='next']")!;
      const teardown = () => {
        el._emblaController?.abort();
        el._emblaApi?.destroy();
      };
      return { api: el._emblaApi!, next, teardown };
    };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    it("Next stops autoplay by default, so no tick lands right after the click", async () => {
      const { api, next, teardown } = carousel('data-carousel-autoplay-delay="300"');
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      await wait(250);
      next.click();
      expect(api.selectedScrollSnap()).toBe(1);
      await wait(400);
      expect(api.selectedScrollSnap()).toBe(1);
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      teardown();
    });

    it("with stop-on-interaction false, Next restarts the delay instead", async () => {
      const { api, next, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      await wait(250);
      next.click();
      expect(api.selectedScrollSnap()).toBe(1);
      // the old timer would have fired 50 ms after the click; the restarted one fires at 300
      await wait(150);
      expect(api.selectedScrollSnap()).toBe(1);
      await wait(300);
      expect(api.selectedScrollSnap()).toBe(2);
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });
  });
});
