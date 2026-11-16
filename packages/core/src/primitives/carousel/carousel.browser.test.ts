"use strict";

/**
 * @fileoverview Carousel: `data-carousel-slot` parts lay out the track in tag
 * and attribute form, a dual-mode `--gap` utility on the container spaces the
 * slides, only identified roots initialize, and autoplay follows the kit's
 * interaction rules. The engine itself (drag, loop, RTL, vertical, thumbs,
 * auto-scroll) is covered in base/carousel-scroll.browser.test.ts.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { Carousel } from "../../base/carousel.ts";
// registers <ui-carousel>
import "./carousel.ts";
import { frame, mount, scale, style, useKit } from "../../../test/browser.ts";
import { drag } from "../../../test/pointer.ts";

const TRACK = (attrs = "") => `<div data-carousel-slot="viewport">
    <div data-carousel-slot="container" ${attrs}><div data-carousel-slot="slide">1</div><div data-carousel-slot="slide">2</div></div>
  </div>`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("carousel", () => {
  useKit();
  afterEach(() => {
    for (const root of document.querySelectorAll(":is(ui-carousel, [data-ui~='carousel'])")) {
      root._carouselController?.abort();
    }
  });

  it("lays out the track in tag and attribute form and takes a --gap utility", () => {
    const root = mount(`<div>
      <ui-carousel data-tag>${TRACK()}</ui-carousel>
      <div data-ui="carousel" data-attr>${TRACK()}</div>
      <ui-carousel data-utility>${TRACK('style="--gap: 4"')}</ui-carousel>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const viewport = root.querySelector(`${selector} [data-carousel-slot='viewport']`)!;
      const container = root.querySelector(`${selector} [data-carousel-slot='container']`)!;
      expect(style(viewport, "overflow-x"), selector).toBe("auto");
      expect(style(viewport, "scroll-snap-type"), selector).toBe("x mandatory");
      expect(style(container, "display"), selector).toBe("flex");
      const slide = root.querySelector(`${selector} [data-carousel-slot='slide']`)!;
      expect(style(slide, "flex-shrink"), selector).toBe("0");
      expect(style(slide, "scroll-snap-align"), selector).toBe("start");
    }
    expect(
      Number.parseFloat(
        style(root.querySelector("[data-utility] [data-carousel-slot='container']")!, "column-gap"),
      ),
    ).toBeCloseTo(scale(4), 1);
  });

  it("initializes identified roots only, and <ui-carousel> exposes the API", () => {
    const root = mount(`<div>
      <div data-carousel-loop="true" data-plain>${TRACK()}</div>
      <div data-ui="carousel" data-identified>${TRACK()}</div>
      <ui-carousel data-tag>${TRACK()}</ui-carousel>
    </div>`);
    Carousel.init(root);
    expect(root.querySelector("[data-plain]")!._carousel).toBeUndefined();
    expect(root.querySelector("[data-identified]")!._carousel).toBeDefined();
    const tag = root.querySelector<HTMLElement & { api: unknown }>("[data-tag]")!;
    expect(tag._carousel).toBeDefined();
    expect(tag.api).toBe(tag._carousel);
  });

  it("<ui-carousel> tears down on disconnect and starts again on re-insert", async () => {
    const root = mount(`<div><ui-carousel data-carousel-loop="true">
      <div data-carousel-slot="viewport"><div data-carousel-slot="container">${[1, 2, 3]
        .map((n) => `<div data-carousel-slot="slide">${n}</div>`)
        .join("")}</div></div>
    </ui-carousel></div>`);
    const carousel = root.querySelector("ui-carousel")!;
    const slides = [...carousel.querySelectorAll<HTMLElement>("[data-carousel-slot='slide']")];
    expect(carousel._carousel, "initialized on connect").toBeDefined();
    expect(
      slides.some((slide) => slide.style.order),
      "loop rotated",
    ).toBe(true);
    carousel.remove();
    expect(carousel._carousel).toBeUndefined();
    expect(carousel.hasAttribute("data-carousel-init")).toBe(false);
    expect(slides.every((slide) => !slide.style.order)).toBe(true);
    root.append(carousel);
    expect(carousel._carousel).toBeDefined();
  });

  it("marks the selected snap's slide snapped and the visible ones in-view", async () => {
    const root = mount(
      `<div><div data-ui="carousel" data-root style="width: 300px">${TRACK()}</div></div>`,
    );
    Carousel.init(root);
    const carousel = root.querySelector("[data-root]")!;
    const [first, second] = carousel.querySelectorAll("[data-carousel-slot~='slide']");
    expect(first!.getAttribute("data-carousel-state")).toContain("snapped");
    expect(second!.getAttribute("data-carousel-state") ?? "").not.toContain("snapped");
    carousel._carousel!.goTo(1, true);
    expect(second!.getAttribute("data-carousel-state")).toContain("snapped");
    // in-view comes from an IntersectionObserver, a frame or two later
    await frame();
    await frame();
    await frame();
    expect(second!.getAttribute("data-carousel-state")).toContain("in-view");
    expect(first!.getAttribute("data-carousel-state") ?? "").not.toContain("in-view");
  });

  it("a mouse drag does nothing when every slide fits, and drags otherwise", async () => {
    const root = mount(`<div>
      <div data-ui="carousel" data-one style="inline-size: 400px">
        <div data-carousel-slot="viewport"><div data-carousel-slot="container">
          <div data-carousel-slot="slide" style="flex-basis: 100px">1</div>
          <div data-carousel-slot="slide" style="flex-basis: 100px">2</div>
        </div></div>
      </div>
      <div data-ui="carousel" data-many style="inline-size: 300px">${TRACK()}</div>
    </div>`);
    Carousel.init(root);
    const viewportOf = (selector: string) =>
      root.querySelector<HTMLElement>(`${selector} [data-carousel-slot='viewport']`)!;
    const dragged = async (viewport: HTMLElement) => {
      const at = await drag(viewport, { dx: -60, keepDown: true });
      const dragging = viewport.matches("[data-carousel-state~='dragging']");
      document.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 1,
          isPrimary: true,
          pointerType: "mouse",
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
        }),
      );
      return dragging;
    };
    expect(await dragged(viewportOf("[data-one]"))).toBe(false);
    const many = viewportOf("[data-many]");
    expect(await dragged(many)).toBe(true);
    expect(style(many, "cursor")).not.toBe("grabbing");
    // the pointer is captured, so nothing page-wide is flagged for the cursor
    expect(document.documentElement.hasAttribute("data-ui-dragging")).toBe(false);
  });

  describe("manual navigation and autoplay", () => {
    const SLIDES = [1, 2, 3, 4].map((n) => `<div data-carousel-slot="slide">${n}</div>`).join("");
    const carousel = (attrs: string) => {
      const root = mount(`<div>
        <div data-ui="carousel" data-carousel-loop="true" data-carousel-plugins="autoplay" ${attrs}
          data-root style="width: 300px">
          <div data-carousel-slot="viewport"><div data-carousel-slot="container">${SLIDES}</div></div>
          <button type="button" data-carousel-slot="prev">prev</button>
          <button type="button" data-carousel-slot="next">next</button>
        </div>
      </div>`);
      Carousel.init(root);
      const el = root.querySelector("[data-root]")!;
      return {
        el,
        api: el._carousel!,
        viewport: el.querySelector<HTMLElement>("[data-carousel-slot~='viewport']")!,
        next: el.querySelector<HTMLButtonElement>("[data-carousel-slot~='next']")!,
      };
    };
    const press = (target: Element, type: string) =>
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "mouse" }));

    it("Next stops autoplay by default, so no tick lands right after the click", async () => {
      const { el, api, next } = carousel('data-carousel-autoplay-delay="300"');
      expect(api.isPlaying()).toBe(true);
      expect(el.getAttribute("data-carousel-state")).toContain("playing");
      await wait(250);
      next.click();
      expect(api.selectedSnap()).toBe(1);
      await wait(400);
      expect(api.selectedSnap()).toBe(1);
      expect(api.isPlaying()).toBe(false);
      expect(el.getAttribute("data-carousel-state") ?? "").not.toContain("playing");
    });

    it("with stop-on-interaction false, Next restarts the delay instead", async () => {
      const { api, next } = carousel(
        'data-carousel-autoplay-delay="600" data-carousel-autoplay-stop-on-interaction="false"',
      );
      await wait(500);
      next.click();
      expect(api.selectedSnap()).toBe(1);
      // the old timer would have fired 100 ms after the click; the restarted
      // one fires a full delay after the click's scroll settles
      await wait(300);
      expect(api.selectedSnap()).toBe(1);
      expect(api.isPlaying()).toBe(true);
      await wait(1000);
      expect(api.selectedSnap()).toBe(2);
    });

    it("a pointer down stops autoplay by default", () => {
      const { api, viewport } = carousel('data-carousel-autoplay-delay="300"');
      press(viewport, "pointerdown");
      expect(api.isPlaying()).toBe(false);
      press(viewport, "pointerup");
      expect(api.isPlaying()).toBe(false);
    });

    it("with stop-on-interaction false, a press holds autoplay and the release resumes it", () => {
      const { api, viewport } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-stop-on-interaction="false"',
      );
      press(viewport, "pointerdown");
      expect(api.isPlaying()).toBe(false);
      press(viewport, "pointerup");
      expect(api.isPlaying()).toBe(true);
    });

    it("a secondary mouse button neither stops nor holds autoplay", () => {
      const { api, viewport } = carousel('data-carousel-autoplay-delay="300"');
      viewport.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 2 }),
      );
      expect(api.isPlaying()).toBe(true);
    });

    it("play-on-init false leaves autoplay stopped until play()", () => {
      const { api } = carousel(
        'data-carousel-autoplay-delay="300" data-carousel-autoplay-play-on-init="false"',
      );
      expect(api.isPlaying()).toBe(false);
      api.play();
      expect(api.isPlaying()).toBe(true);
      api.stop();
      expect(api.isPlaying()).toBe(false);
    });
  });
});
