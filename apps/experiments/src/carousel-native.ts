/**
 * @fileoverview Carousel playground: one carousel per configuration (loop,
 * alignment, free scrolling, RTL, vertical, thumbs, autoplay, auto-scroll), for
 * checking the feel by hand. Slides are links, to check that a drag never
 * also follows one.
 */

import "@zazz-ui/core/index.ts";
import { Carousel } from "@zazz-ui/core/base/carousel.ts";

interface Row {
  title: string;
  /** Attributes on the root. */
  attrs: string;
  basis: string;
  slides: number;
  rtl?: boolean;
  vertical?: boolean;
  thumbs?: boolean;
}

const ROWS: Row[] = [
  { title: "One per view", attrs: "", basis: "100%", slides: 6 },
  {
    title: "Three per view, loop",
    attrs: 'data-carousel-loop="true"',
    basis: "33.333%",
    slides: 8,
  },
  {
    title: "Centered, loop",
    attrs: 'data-carousel-loop="true" data-carousel-align="center"',
    basis: "70%",
    slides: 6,
  },
  { title: "Free scrolling", attrs: 'data-carousel-snap="free"', basis: "40%", slides: 10 },
  {
    title: "Right to left, loop",
    attrs: 'data-carousel-loop="true"',
    basis: "50%",
    slides: 6,
    rtl: true,
  },
  { title: "Vertical", attrs: 'data-carousel-axis="y"', basis: "100%", slides: 5, vertical: true },
  { title: "Thumbs", attrs: "", basis: "100%", slides: 8, thumbs: true },
  {
    title: "Autoplay (holds on hover, focus, and drag)",
    attrs:
      'data-carousel-plugins="autoplay" data-carousel-autoplay-delay="2000" data-carousel-autoplay-stop-on-interaction="false" data-carousel-autoplay-stop-on-mouse-enter="true"',
    basis: "50%",
    slides: 6,
  },
  {
    title: "Auto-scroll, loop (holds on drag)",
    attrs:
      'data-carousel-loop="true" data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-stop-on-interaction="false"',
    basis: "33.333%",
    slides: 8,
  },
];

const slide = (i: number, basis: string) => `
  <a href="#slide-${i}" data-carousel-slot="slide" style="--basis: ${basis}; --pr: 3">
    <span style="--display: grid; --place-items: center; --h: 40; --rounded: lg; --bg: muted; --font-size: var(--font-size-h3)">${i + 1}</span>
  </a>`;

const thumbs = (count: number) => `
  <div data-carousel-slot="thumbs" style="--pt: 3">
    <div data-carousel-slot="viewport">
      <div data-carousel-slot="container" style="--gap: 2">
        ${Array.from(
          { length: count },
          (_, i) => `<button type="button" data-carousel-slot="slide" data-ui="button"
            data-button-variant="muted" aria-label="Slide ${i + 1}">${i + 1}</button>`,
        ).join("")}
      </div>
    </div>
  </div>`;

const carousel = (row: Row) => `
  <div style="--min-w: 0" ${row.rtl ? 'dir="rtl"' : ""}>
    <div data-ui="carousel" ${row.attrs}>
      <div data-carousel-slot="viewport" ${row.vertical ? 'style="--h: 40"' : ""}>
        <div data-carousel-slot="container">
          ${Array.from({ length: row.slides }, (_, i) => slide(i, row.basis)).join("")}
        </div>
      </div>
      ${row.thumbs ? thumbs(row.slides) : ""}
      <div style="--display: flex; --gap: 2; --pt: 3; --items: center">
        <button type="button" data-ui="button" data-button-variant="muted" data-carousel-slot="prev">Prev</button>
        <button type="button" data-ui="button" data-button-variant="muted" data-carousel-slot="next">Next</button>
        <div data-carousel-slot="dots" style="--display: flex; --gap: 1">
          <button type="button" data-carousel-slot="dot" aria-label="Go to slide"
            style="--size: 2; --rounded: full; --bg: muted"></button>
        </div>
      </div>
    </div>
  </div>`;

const rows = document.querySelector("#rows");
if (rows) {
  rows.innerHTML = ROWS.map(
    (row) => `
    <section style="--display: flex-col; --gap: 4">
      <h2 data-font="h5">${row.title}</h2>
      ${carousel(row)}
    </section>`,
  ).join("");
  // the kit auto-inits on load; these were added after it
  Carousel.init(rows);
}
