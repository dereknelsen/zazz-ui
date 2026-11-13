"use strict";

/**
 * @fileoverview Carousel: `data-carousel-slot` parts lay out the
 * track in tag and attribute form, and a dual-mode `--gap` utility on the
 * container spaces the slides.
 */

import { describe, expect, it } from "vite-plus/test";
import type { EmblaCarouselType } from "embla-carousel";
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
      _emblaApi?: EmblaCarouselType;
      _emblaController?: AbortController;
    };
    const carousel = root.querySelector("[data-root]") as Root;
    const outside = root.querySelector("[data-outside]")!;
    const html = document.documentElement;
    const rest = style(outside, "cursor");
    expect(rest).not.toBe("grabbing");
    const pointer = new PointerEvent("pointerdown");
    carousel._emblaApi!.createEvent("pointerdown", pointer).emit();
    expect(html.hasAttribute("data-ui-dragging")).toBe(true);
    expect(style(outside, "cursor")).toBe("grabbing");
    carousel._emblaApi!.createEvent("pointerup", pointer).emit();
    expect(html.hasAttribute("data-ui-dragging")).toBe(false);
    expect(style(outside, "cursor")).toBe(rest);
    carousel._emblaController?.abort();
    carousel._emblaApi?.destroy();
  });

  describe("manual navigation and autoplay", () => {
    type Root = Element & { _emblaApi?: EmblaCarouselType; _emblaController?: AbortController };
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
      expect(api.selectedSnap()).toBe(1);
      await wait(400);
      expect(api.selectedSnap()).toBe(1);
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      teardown();
    });

    it("with stop-on-interaction false, Next restarts the delay instead", async () => {
      const { api, next, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      await wait(250);
      next.click();
      expect(api.selectedSnap()).toBe(1);
      // the old timer would have fired 50 ms after the click; the restarted one fires at 300
      await wait(150);
      expect(api.selectedSnap()).toBe(1);
      await wait(300);
      expect(api.selectedSnap()).toBe(2);
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("keeps playing across a reInit (a resize or breakpoint change re-creates the plugin)", () => {
      const { api, teardown } = carousel('data-carousel-autoplay-delay="300"');
      api.reInit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("stays stopped across a reInit once an interaction stopped it", () => {
      const { api, next, teardown } = carousel('data-carousel-autoplay-delay="300"');
      next.click();
      api.reInit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      teardown();
    });

    it("a pointer down stops autoplay by default", () => {
      const { api, teardown } = carousel('data-carousel-autoplay-delay="300"');
      api.createEvent("pointerdown", new PointerEvent("pointerdown")).emit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      teardown();
    });

    it("with stop-on-interaction false, a drag holds autoplay and the release resumes it", () => {
      const { api, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      api.createEvent("pointerdown", new PointerEvent("pointerdown")).emit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      api.createEvent("pointerup", new PointerEvent("pointerup")).emit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("resumes after the carousel turns inactive and active again (a breakpoint)", () => {
      const { api, teardown } = carousel('data-carousel-autoplay-delay="300"');
      api.reInit({ active: false });
      api.reInit({ active: true });
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("starts once a carousel inactive at load turns active", () => {
      const { api, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-active="false"',
      );
      api.reInit({ active: true });
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("a press in a form field (no drag, no pointer up) does not hold autoplay", () => {
      const { api, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      const field = document.createElement("input");
      field.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      const press = new PointerEvent("pointerdown");
      Object.defineProperty(press, "target", { value: field });
      api.createEvent("pointerdown", press).emit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("a reinit mid-drag releases the hold", () => {
      const { api, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      api.createEvent("pointerdown", new PointerEvent("pointerdown")).emit();
      api.reInit();
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });

    it("play-on-init false leaves autoplay stopped until play()", () => {
      const { api, teardown } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-play-on-init="false"',
      );
      expect(api.plugins().autoplay?.isPlaying()).toBe(false);
      api.plugins().autoplay?.play();
      expect(api.plugins().autoplay?.isPlaying()).toBe(true);
      teardown();
    });
  });

  it("a press Embla ignores (a form field, a middle click) never flags a drag", () => {
    const root = mount(`<div><div data-ui="carousel" data-root>${TRACK()}</div></div>`);
    EmblaInit.init(root);
    const carousel = root.querySelector("[data-root]") as Element & {
      _emblaApi?: EmblaCarouselType;
      _emblaController?: AbortController;
    };
    const field = document.createElement("textarea");
    const inField = new PointerEvent("pointerdown");
    Object.defineProperty(inField, "target", { value: field });
    carousel._emblaApi!.createEvent("pointerdown", inField).emit();
    carousel
      ._emblaApi!.createEvent("pointerdown", new PointerEvent("pointerdown", { button: 1 }))
      .emit();
    expect(document.documentElement.hasAttribute("data-ui-dragging")).toBe(false);
    // a reinit mid-drag drops the pointer up; the flag clears anyway
    carousel._emblaApi!.createEvent("pointerdown", new PointerEvent("pointerdown")).emit();
    carousel._emblaApi!.reInit();
    expect(document.documentElement.hasAttribute("data-ui-dragging")).toBe(false);
    carousel._emblaController?.abort();
    carousel._emblaApi?.destroy();
  });

  it("marks the selected snap's slides snapped and the visible ones in-view", async () => {
    const root = mount(`<div><div data-ui="carousel" data-root>${TRACK()}</div></div>`);
    EmblaInit.init(root);
    const carousel = root.querySelector("[data-root]") as Element & {
      _emblaApi?: EmblaCarouselType;
      _emblaController?: AbortController;
    };
    const [first, second] = carousel.querySelectorAll("[data-carousel-slot~='slide']");
    expect(first.getAttribute("data-carousel-state")).toContain("snapped");
    expect(second.getAttribute("data-carousel-state") ?? "").not.toContain("snapped");
    carousel._emblaApi!.goTo(1, true);
    expect(second.getAttribute("data-carousel-state")).toContain("snapped");
    carousel._emblaController?.abort();
    carousel._emblaApi?.destroy();
  });

  it("vetoes a drag when every slide fits (one snap), and allows it otherwise", () => {
    const root = mount(`<div>
      <div data-ui="carousel" data-one style="inline-size: 400px">
        <div data-carousel-slot="viewport"><div data-carousel-slot="container">
          <div data-carousel-slot="slide" style="flex-basis: 100px">1</div>
          <div data-carousel-slot="slide" style="flex-basis: 100px">2</div>
        </div></div>
      </div>
      <div data-ui="carousel" data-many>${TRACK()}</div>
    </div>`);
    EmblaInit.init(root);
    type Root = Element & { _emblaApi?: EmblaCarouselType; _emblaController?: AbortController };
    const one = root.querySelector("[data-one]") as Root;
    const many = root.querySelector("[data-many]") as Root;
    const down = () => new PointerEvent("pointerdown");
    expect(one._emblaApi!.createEvent("pointerdown", down()).emit()).toBe(false);
    expect(many._emblaApi!.createEvent("pointerdown", down()).emit()).toBe(true);
    many._emblaApi!.createEvent("pointerup", new PointerEvent("pointerup")).emit();
    for (const r of [one, many]) {
      r._emblaController?.abort();
      r._emblaApi?.destroy();
    }
  });
});
