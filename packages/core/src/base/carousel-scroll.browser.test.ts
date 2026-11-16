"use strict";

/**
 * @fileoverview The carousel engine in a real browser engine: the viewport
 * scrolls natively, the controls and a mouse
 * drag move one snap, a touch press is left to native scrolling, a loop
 * wraps without clones, RTL and vertical tracks run the same paths, thumbs
 * follow the main carousel, and autoplay / auto-scroll move it on their own.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { Carousel } from "./carousel.ts";
import { frame, mount, style, useKit } from "../../test/browser.ts";
import { drag } from "../../test/pointer.ts";

const SLIDES = 5;

const carouselHtml = (attrs = "") => `<div data-ui="carousel" ${attrs}
    style="width: 300px">
  <div data-carousel-slot="viewport">
    <div data-carousel-slot="container">${Array.from(
      { length: SLIDES },
      (_, i) => `<div data-carousel-slot="slide" style="height: 100px">${i}</div>`,
    ).join("")}</div>
  </div>
  <button type="button" data-carousel-slot="prev">Prev</button>
  <button type="button" data-carousel-slot="next">Next</button>
  <div data-carousel-slot="dots"><button type="button" data-carousel-slot="dot"></button></div>
</div>`;

/** Resolves once `check` passes (scrolls are smooth and end on their own time). */
async function until(
  check: () => boolean,
  timeout = 3000,
  report: () => unknown = () => "",
): Promise<void> {
  const start = performance.now();
  while (!check()) {
    if (performance.now() - start > timeout) {
      throw new Error(`until: timed out ${JSON.stringify(report())}`);
    }
    await frame();
  }
  // let scrollend run its settle work
  await frame();
  await frame();
}

const thumbsHtml = `<div data-carousel-slot="thumbs">
  <div data-carousel-slot="viewport" style="width: 200px">
    <div data-carousel-slot="container">${Array.from(
      { length: SLIDES },
      (_, i) =>
        `<button type="button" data-carousel-slot="slide" style="width: 80px">${i}</button>`,
    ).join("")}</div>
  </div>
</div>`;

function setup(attrs = "", extra = "") {
  const root = mount(carouselHtml(attrs).replace(/<\/div>$/, `${extra}</div>`));
  Carousel.init(root.parentElement!);
  const viewport = root.querySelector<HTMLElement>("[data-carousel-slot='viewport']")!;
  const slides = [...root.querySelectorAll<HTMLElement>("[data-carousel-slot='slide']")];
  const api = root._carousel!;
  return { root, viewport, slides, api };
}

describe("carousel engine", () => {
  useKit();
  afterEach(() => {
    for (const root of document.querySelectorAll("[data-ui~='carousel']")) {
      root._carouselController?.abort();
    }
  });

  it("makes the viewport a snapping scroll container", () => {
    const { viewport, api } = setup();
    expect(api).toBeDefined();
    expect(style(viewport, "overflow-x")).toBe("auto");
    expect(style(viewport, "scroll-snap-type")).toBe("x mandatory");
    expect(api.snapList()).toEqual([0, 300, 600, 900, 1200]);
  });

  it("next, prev, and dots move one snap and mark the active dot", async () => {
    const { root, viewport, api } = setup();
    const dots = [...root.querySelectorAll("[data-carousel-slot='dot']")];
    expect(dots).toHaveLength(SLIDES);
    expect(dots[0]!.getAttribute("data-carousel-state")).toBe("active");

    const selected: number[] = [];
    root.addEventListener("zazz:carousel-select", (event) =>
      selected.push((event as CustomEvent<{ index: number }>).detail.index),
    );
    root.querySelector<HTMLElement>("[data-carousel-slot='next']")!.click();
    await until(() => viewport.scrollLeft === 300);
    expect(api.selectedSnap()).toBe(1);
    expect(selected).toEqual([1]);

    (dots[3] as HTMLElement).click();
    await until(() => viewport.scrollLeft === 900);
    expect(dots[3]!.getAttribute("data-carousel-state")).toBe("active");

    root.querySelector<HTMLElement>("[data-carousel-slot='prev']")!.click();
    await until(() => viewport.scrollLeft === 600);
    expect(api.selectedSnap()).toBe(2);
  });

  it("a mouse flick drags the track and lands one snap on", async () => {
    const { viewport, api } = setup();
    const html = document.documentElement;
    let sawDragging = false;
    const observer = new MutationObserver(() => {
      sawDragging ||= viewport.matches("[data-carousel-state~='dragging']");
    });
    observer.observe(viewport, { attributes: true });

    await drag(viewport, { dx: -80, steps: 4, interval: 8 });
    observer.disconnect();
    expect(sawDragging).toBe(true);
    expect(viewport.matches("[data-carousel-state~='dragging']")).toBe(false);
    // the pointer is captured, so the cursor needs no page-wide (restyle-everything) flag
    expect(html.hasAttribute("data-ui-dragging")).toBe(false);
    await until(() => viewport.scrollLeft === 300);
    expect(api.selectedSnap()).toBe(1);
    expect(style(viewport, "scroll-snap-type")).toBe("x mandatory");
  });

  it("a slow short mouse drag springs back to the same snap", async () => {
    const { viewport, api } = setup();
    await drag(viewport, { dx: -60, hold: 150 });
    await until(() => viewport.scrollLeft === 0);
    expect(api.selectedSnap()).toBe(0);
  });

  it("leaves a touch press to native scrolling", async () => {
    const { viewport } = setup();
    await drag(viewport, { dx: -80, pointerType: "touch", keepDown: false });
    expect(viewport.matches("[data-carousel-state~='dragging']")).toBe(false);
    expect(viewport.getAttribute("data-carousel-state") ?? "").not.toContain("gliding");
  });

  it("loops without clones: prev from the first slide reaches the last", async () => {
    const { root, viewport, slides, api } = setup('data-carousel-loop="true"');
    expect(root.querySelectorAll("[data-carousel-slot='slide']")).toHaveLength(SLIDES);
    expect(api.selectedSnap()).toBe(0);
    // the first slide sits mid-track with neighbours on both sides
    expect(viewport.scrollLeft).toBeGreaterThan(0);

    const last = slides[SLIDES - 1]!;
    const offset = () =>
      Math.round(last.getBoundingClientRect().left - viewport.getBoundingClientRect().left);
    root.querySelector<HTMLElement>("[data-carousel-slot='prev']")!.click();
    // rests on the last slide, rotated back to mid-track
    await until(
      () =>
        offset() === 0 &&
        last.style.order === "2" &&
        !viewport.matches("[data-carousel-state~='settling']"),
      3000,
      () => ({
        offset: offset(),
        scrollLeft: viewport.scrollLeft,
        orders: slides.map((slide) => slide.style.order),
        state: viewport.getAttribute("data-carousel-state"),
        selected: api.selectedSnap(),
      }),
    );
    expect(api.selectedSnap()).toBe(SLIDES - 1);
    expect(viewport.scrollLeft).toBe(600);
    expect(last.inert).toBe(false);
    // wrapped slides that are out of view leave Tab order
    expect(slides.filter((slide) => slide.inert).length).toBeGreaterThan(0);
  });

  it("a click during a loop's rotation still lands (WebKit drops scrolls under the lock)", async () => {
    const { root, viewport, slides, api } = setup('data-carousel-loop="true"');
    const prev = root.querySelector<HTMLElement>("[data-carousel-slot='prev']")!;
    const events: unknown[] = [];
    root.addEventListener("zazz:carousel-select", (e) =>
      events.push([
        (e as CustomEvent).detail.index,
        Math.round(viewport.scrollLeft),
        viewport.getAttribute("data-carousel-state"),
      ]),
    );
    // the lock lasts two frames; click the moment it appears
    let clickedUnderLock = false;
    const observer = new MutationObserver(() => {
      if (clickedUnderLock || !viewport.matches("[data-carousel-state~='settling']")) return;
      clickedUnderLock = true;
      prev.click();
    });
    observer.observe(viewport, { attributes: true, attributeFilter: ["data-carousel-state"] });
    prev.click();
    await until(() => clickedUnderLock);
    observer.disconnect();
    const target = slides[SLIDES - 2]!;
    await until(
      () =>
        Math.round(target.getBoundingClientRect().left - viewport.getBoundingClientRect().left) ===
          0 && !viewport.matches("[data-carousel-state~='settling']"),
      3000,
      () => ({
        offset: Math.round(
          target.getBoundingClientRect().left - viewport.getBoundingClientRect().left,
        ),
        scrollLeft: viewport.scrollLeft,
        orders: slides.map((slide) => slide.style.order),
        state: viewport.getAttribute("data-carousel-state"),
        selected: api.selectedSnap(),
        events,
      }),
    );
    expect(api.selectedSnap()).toBe(SLIDES - 2);
  });

  it("runs right to left: logical snaps, negative scrollLeft, mirrored drag and keys", async () => {
    const { root, viewport, api } = setup('dir="rtl"');
    expect(api.rtl).toBe(true);
    expect(api.snapList()).toEqual([0, 300, 600, 900, 1200]);
    root.querySelector<HTMLElement>("[data-carousel-slot='next']")!.click();
    await until(() => viewport.scrollLeft === -300);
    expect(api.selectedSnap()).toBe(1);

    // pointer moving right drags toward the end in RTL
    await drag(viewport, { dx: 80, steps: 4, interval: 8 });
    await until(
      () => viewport.scrollLeft === -600,
      3000,
      () => viewport.scrollLeft,
    );
    expect(api.selectedSnap()).toBe(2);

    viewport.focus();
    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await until(
      () => viewport.scrollLeft === -900,
      3000,
      () => viewport.scrollLeft,
    );
    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await until(
      () => viewport.scrollLeft === -600,
      3000,
      () => viewport.scrollLeft,
    );
  });

  it("runs vertically with data-carousel-axis=y", async () => {
    const { root, viewport, api } = setup('data-carousel-axis="y"');
    viewport.style.height = "100px";
    for (const slide of root.querySelectorAll<HTMLElement>("[data-carousel-slot='slide']")) {
      slide.style.height = "";
    }
    await frame();
    await frame();
    expect(api.vertical).toBe(true);
    expect(style(viewport, "scroll-snap-type")).toBe("y mandatory");
    expect(style(viewport, "overflow-y")).toBe("auto");
    expect(api.snapList()).toEqual([0, 100, 200, 300, 400]);

    root.querySelector<HTMLElement>("[data-carousel-slot='next']")!.click();
    await until(
      () => viewport.scrollTop === 100,
      3000,
      () => viewport.scrollTop,
    );

    await drag(viewport, { dy: -60, steps: 4, interval: 8 });
    await until(
      () => viewport.scrollTop === 200,
      3000,
      () => viewport.scrollTop,
    );

    viewport.focus();
    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await until(
      () => viewport.scrollTop === 300,
      3000,
      () => viewport.scrollTop,
    );
    // off-axis arrows are left alone
    const sideways = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    viewport.dispatchEvent(sideways);
    expect(sideways.defaultPrevented).toBe(false);
    expect(api.selectedSnap()).toBe(3);
  });

  it("thumbs: a click steps the main carousel; the selected thumb is marked and kept in view", async () => {
    const { root, viewport, api } = setup("", thumbsHtml);
    const strip = root.querySelector<HTMLElement>(
      "[data-carousel-slot='thumbs'] [data-carousel-slot='viewport']",
    )!;
    const thumbs = [...strip.querySelectorAll<HTMLElement>("[data-carousel-slot='slide']")];
    // the main engine ignores the strip's slides
    expect(api.snapList()).toHaveLength(SLIDES);
    expect(strip.getAttribute("data-carousel-state")).toContain("free");
    expect(style(strip, "scroll-snap-type")).toBe("none");
    expect(thumbs[0]!.getAttribute("aria-current")).toBe("true");

    thumbs[3]!.click();
    await until(
      () => viewport.scrollLeft === 900,
      3000,
      () => viewport.scrollLeft,
    );
    expect(thumbs[3]!.getAttribute("aria-current")).toBe("true");
    expect(thumbs[3]!.getAttribute("data-carousel-state")).toContain("active");
    expect(thumbs.filter((thumb) => thumb.hasAttribute("aria-current"))).toHaveLength(1);
    const box = strip.getBoundingClientRect();
    await until(() => {
      const rect = thumbs[3]!.getBoundingClientRect();
      return rect.left >= box.left - 1 && rect.right <= box.right + 1;
    });

    root._carouselController!.abort();
    expect(thumbs.some((thumb) => thumb.hasAttribute("aria-current"))).toBe(false);
  });

  it("autoplay advances on its delay, and a manual step stops it", async () => {
    const { root, viewport, api } = setup(
      'data-carousel-plugins="autoplay" data-carousel-autoplay-delay="50"',
    );
    expect(api.isPlaying()).toBe(true);
    expect(root.getAttribute("data-carousel-state")).toContain("playing");
    await until(
      () => viewport.scrollLeft === 600,
      4000,
      () => viewport.scrollLeft,
    );

    root.querySelector<HTMLElement>("[data-carousel-slot='next']")!.click();
    expect(api.isPlaying()).toBe(false);
    expect(root.getAttribute("data-carousel-state") ?? "").not.toContain("playing");
    // autoplay may have stepped once more before the click; either way it stops
    await new Promise((resolve) => setTimeout(resolve, 600));
    const at = viewport.scrollLeft;
    expect(at % 300).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(viewport.scrollLeft).toBe(at);
  });

  it("autoplay with stop-on-interaction false holds while a slide has focus", async () => {
    const { root, viewport, slides, api } = setup(
      'data-carousel-plugins="autoplay" data-carousel-autoplay-delay="50" data-carousel-autoplay-stop-on-interaction="false"',
    );
    // dispatched: Firefox fires no focus events in a window without system focus
    slides[0]!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(api.isPlaying()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(viewport.scrollLeft).toBe(0);
    const next = root.querySelector<HTMLElement>("[data-carousel-slot='next']")!;
    slides[0]!.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: next }));
    expect(api.isPlaying()).toBe(true);
    await until(
      () => viewport.scrollLeft >= 300,
      4000,
      () => viewport.scrollLeft,
    );
  });

  it("autoplay wraps to the first snap after the last", async () => {
    const { viewport } = setup(
      'data-carousel-plugins="autoplay" data-carousel-autoplay-delay="10" data-carousel-start-snap="4"',
    );
    expect(viewport.scrollLeft).toBe(1200);
    await until(
      () => viewport.scrollLeft === 0,
      4000,
      () => viewport.scrollLeft,
    );
  });

  it("auto-scroll moves continuously with snapping off, and lands on a snap when stopped", async () => {
    const { viewport, api } = setup(
      'data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-speed="6" data-carousel-auto-scroll-start-delay="0"',
    );
    await until(
      () => viewport.scrollLeft > 350,
      4000,
      () => viewport.scrollLeft,
    );
    expect(viewport.getAttribute("data-carousel-state")).toContain("gliding");
    api.stop();
    await until(
      () =>
        viewport.scrollLeft % 300 === 0 &&
        !(viewport.getAttribute("data-carousel-state") ?? "").includes("gliding"),
      3000,
      () => [viewport.scrollLeft, viewport.getAttribute("data-carousel-state")],
    );
    const at = viewport.scrollLeft;
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(viewport.scrollLeft).toBe(at);
  });

  it("auto-scroll on a loop keeps going past the last slide", async () => {
    const { viewport, slides, api } = setup(
      'data-carousel-loop="true" data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-speed="20" data-carousel-auto-scroll-start-delay="0"',
    );
    const seen = new Set<number>();
    await until(
      () => {
        seen.add(api.selectedSnap());
        return seen.size === SLIDES && api.selectedSnap() === 1;
      },
      6000,
      () => [...seen],
    );
    expect(api.isPlaying()).toBe(true);
    expect(viewport.scrollLeft).toBeGreaterThan(0);
    expect(viewport.scrollLeft).toBeLessThan(1200);
    expect(slides).toHaveLength(SLIDES);
  });

  it("a press during auto-scroll hands snapping back at once (stop-on-interaction false)", async () => {
    const { viewport, api } = setup(
      'data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-speed="4" data-carousel-auto-scroll-start-delay="0" data-carousel-auto-scroll-stop-on-interaction="false"',
    );
    await until(() => viewport.scrollLeft > 20);
    viewport.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, isPrimary: true }),
    );
    expect(api.isPlaying()).toBe(false);
    expect(viewport.getAttribute("data-carousel-state") ?? "").not.toContain("gliding");
  });

  it("steps taken mid-animation keep looping: the track rotates before it runs out", async () => {
    const { root, viewport, slides, api } = setup('data-carousel-loop="true"');
    const next = root.querySelector<HTMLElement>("[data-carousel-slot='next']")!;
    const prev = root.querySelector<HTMLElement>("[data-carousel-slot='prev']")!;
    const resting = (index: number) => () =>
      api.selectedSnap() === index &&
      Math.round(
        slides[index]!.getBoundingClientRect().left - viewport.getBoundingClientRect().left,
      ) === 0 &&
      !viewport.getAttribute("data-carousel-state");
    const report = () => ({
      selected: api.selectedSnap(),
      scrollLeft: viewport.scrollLeft,
      orders: slides.map((slide) => slide.style.order),
      state: viewport.getAttribute("data-carousel-state"),
    });

    // each click lands before the last one's scroll has finished
    for (let i = 0; i < 7; i++) {
      next.click();
      await new Promise((resolve) => setTimeout(resolve, 110));
    }
    await until(resting(7 % SLIDES), 4000, report);

    for (let i = 0; i < 6; i++) {
      prev.click();
      await new Promise((resolve) => setTimeout(resolve, 110));
    }
    await until(resting((((7 - 6) % SLIDES) + SLIDES) % SLIDES), 4000, report);
    expect(slides).toHaveLength(SLIDES);
  });

  it("drag-free: a flick coasts on from the release speed, slows steadily, and rests on the end", async () => {
    const { viewport } = setup('data-carousel-drag-free="true"');
    const max = viewport.scrollWidth - viewport.clientWidth;
    const resting = () => !(viewport.getAttribute("data-carousel-state") ?? "").includes("gliding");

    await drag(viewport, { dx: -60, steps: 6, interval: 12 });
    const released = viewport.scrollLeft;
    // sampled per frame: no stall after the release, and no speeding back up
    const moves: number[] = [];
    let last = released;
    for (let i = 0; i < 12; i++) {
      await frame();
      moves.push(viewport.scrollLeft - last);
      last = viewport.scrollLeft;
    }
    expect(moves.slice(0, 3).some((move) => move > 1)).toBe(true);
    expect(Math.max(...moves.slice(6))).toBeLessThanOrEqual(Math.max(...moves.slice(0, 6)));
    await until(resting, 4000, () => viewport.scrollLeft);
    expect(viewport.scrollLeft).toBeGreaterThan(released + 20);
    expect(viewport.scrollLeft).toBeLessThan(max);

    // a hard flick stops exactly on the end, not short of it
    await drag(viewport, { dx: -260, steps: 4, interval: 6 });
    await until(
      () => resting() && viewport.scrollLeft === max,
      4000,
      () => [viewport.scrollLeft, max],
    );

    // a release with no speed stays put and leaves no glide behind
    // (the travel includes the drag's start threshold, so a little under 50px)
    await drag(viewport, { dx: 50, hold: 150 });
    await until(resting);
    const at = viewport.scrollLeft;
    expect(at).toBeGreaterThanOrEqual(max - 50);
    expect(at).toBeLessThan(max - 20);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(viewport.scrollLeft).toBe(at);
  });

  it("teardown restores the markup", () => {
    const { root, slides } = setup('data-carousel-loop="true"');
    root._carouselController!.abort();
    expect(root._carousel).toBeUndefined();
    expect(slides.every((slide) => !slide.style.order && !slide.inert)).toBe(true);
    expect(root.querySelectorAll("[data-carousel-slot='dot']")).toHaveLength(1);
  });
});
