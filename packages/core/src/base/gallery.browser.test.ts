"use strict";

/**
 * @fileoverview `--display: grid-gallery` picks its column count from its child
 * count: as many as fit at the minimum width, up to six, skipping a count that
 * would leave one child alone in the last row. `--display: subgrid`,
 * `subgrid-col`, and `subgrid-row` take the parent grid's tracks.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

/** Columns in use: the distinct inline offsets of the children. */
const columns = (el: Element) =>
  new Set(
    [...el.children]
      .filter((child) => child.getClientRects().length)
      .map((child) => Math.round(child.getBoundingClientRect().left)),
  ).size;
const kids = (n: number) => "<i></i>".repeat(n);
/** A gallery `width` px wide with a 100px minimum and a 10px gap: `c` columns fit from `110c - 10` px. */
const gallery = (n: number, width: number, more = "") =>
  mount(
    `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --gap: 10px; inline-size: ${width}px; ${more}">${kids(n)}</div>`,
  );
const counts = (width: number, ns: number[]) => ns.map((n) => columns(gallery(n, width)));

describe("--display: grid-gallery", () => {
  useKit();

  it("is a grid, and one child fills the row", () => {
    const el = gallery(1, 700);
    expect(style(el, "display")).toBe("grid");
    expect(el.firstElementChild!.getBoundingClientRect().width).toBeCloseTo(700, 0);
  });

  it("puts up to six in a row where six fit, and never leaves one alone", () => {
    //                         n:  2  3  4  5  6  7  8  9  12 13
    expect(counts(700, [2, 3, 4, 5, 6, 7, 8, 9, 12, 13])).toEqual([2, 3, 4, 5, 6, 5, 6, 6, 6, 5]);
  });

  it("drops a column where the count that fits would orphan a child", () => {
    // five fit: 6 would go 5 + 1, 11 would go 5 + 5 + 1
    expect(counts(600, [5, 6, 10, 11])).toEqual([5, 4, 5, 4]);
    // four fit: 5 → 3 + 2, 9 → 3 × 3
    expect(counts(500, [4, 5, 8, 9])).toEqual([4, 3, 4, 3]);
    // three fit: 4 → 2 × 2, 7 → pairs
    expect(counts(400, [3, 4, 5, 6, 7])).toEqual([3, 2, 3, 3, 2]);
  });

  it("keeps two columns for an odd count, and one column when only one fits", () => {
    expect(counts(250, [2, 3, 5])).toEqual([2, 2, 2]);
    expect(counts(150, [2, 3])).toEqual([1, 1]);
    expect(columns(gallery(3, 60))).toBe(1);
  });

  it("holds at each threshold, with the gap from --gap, --gap-x, or a scale step", () => {
    // five fit from 540px
    expect(counts(539, [6])).toEqual([4]);
    expect(counts(541, [6])).toEqual([4]);
    expect(counts(649, [6])).toEqual([4]);
    expect(counts(649.95, [6])).toEqual([4]);
    expect(counts(651, [6])).toEqual([6]);
    const x = mount(
      `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --gap: 40px; --gap-x: 10px; inline-size: 649px">${kids(6)}</div>`,
    );
    expect(columns(x)).toBe(4);
    const step = mount(
      `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --gap: 4; inline-size: 600px">${kids(6)}</div>`,
    );
    expect(columns(step)).toBe(4);
  });

  it("counts only the children that take a cell", () => {
    const el = mount(
      `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --gap: 10px; inline-size: 700px">${kids(6)}<i hidden></i><template></template></div>`,
    );
    expect(columns(el)).toBe(6);
  });

  it("defaults to a 20ch minimum", () => {
    const el = mount(
      `<div style="--display: grid-gallery; --gap: 0; font: 16px monospace; inline-size: 50ch">${kids(4)}</div>`,
    );
    expect(columns(el)).toBe(2);
  });

  it("does not hand its count to a nested gallery", () => {
    // the outer's four children flag a three-column orphan; the inner's three fit exactly three across
    const outer = mount(
      `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --gap: 0; inline-size: 800px"><div data-inner style="--display: grid-gallery; --ui-gallery-min-w: 60px; --gap: 0">${kids(3)}</div>${kids(3)}</div>`,
    );
    expect(columns(outer)).toBe(4);
    expect(columns(outer.querySelector("[data-inner]")!)).toBe(3);
  });

  it("turns on at a breakpoint, and ends at a tier that names another display", async () => {
    const on = mount(
      `<div style="--display: flex-col; --display--md: grid-gallery; --ui-gallery-min-w: 100px">${kids(3)}</div>`,
    );
    await atWidth(below("md"));
    expect(style(on, "display")).toBe("flex");
    await atWidth(at("md"));
    expect(style(on, "display")).toBe("grid");
    expect(columns(on)).toBe(3);
    const off = mount(
      `<div style="--display: grid-gallery; --ui-gallery-min-w: 100px; --display--md: grid; --grid-cols--md: 2">${kids(3)}</div>`,
    );
    expect(columns(off)).toBe(2);
    await atWidth(below("md"));
    expect(columns(off)).toBe(3);
  });
});

describe("--display: subgrid, subgrid-col, subgrid-row", () => {
  useKit();

  /** One grid item per `display`, each spanning a three-column parent's columns and two rows. */
  const nestedAll = (...displays: string[]) => [
    ...mount(
      `<div style="inline-size: 600px; --display: grid; --grid-cols: 3">${displays.map((display) => `<div style="--col-span: 3; --row-span: 2; ${display}"><i></i><i></i><i></i></div>`).join("")}</div>`,
    ).children,
  ];
  const nested = (display: string) => nestedAll(display)[0]!;
  const cols = (el: Element) => style(el, "grid-template-columns");
  const rows = (el: Element) => style(el, "grid-template-rows");

  it("subgrid takes both axes from the parent", () => {
    const el = nested("--display: subgrid");
    expect(style(el, "display")).toBe("grid");
    expect(cols(el)).toMatch(/^subgrid/);
    expect(rows(el)).toMatch(/^subgrid/);
    expect(el.firstElementChild!.getBoundingClientRect().width).toBeCloseTo(200, 0);
  });

  it("subgrid-col takes the columns only, subgrid-row the rows only", () => {
    const col = nested("--display: subgrid-col");
    expect(cols(col)).toMatch(/^subgrid/);
    expect(rows(col)).not.toMatch(/subgrid/);
    const row = nested("--display: subgrid-row");
    expect(style(row, "display")).toBe("grid");
    expect(rows(row)).toMatch(/^subgrid/);
    expect(cols(row)).not.toMatch(/subgrid/);
  });

  it("the other axis keeps its count", () => {
    const el = nested("--display: subgrid-row; --grid-cols: 2");
    expect(rows(el)).toMatch(/^subgrid/);
    expect(cols(el).split(" ")).toHaveLength(2);
  });

  it("mixes with a count across tiers: the highest tier that names a display decides", async () => {
    const [up, down] = nestedAll(
      "--display: grid; --grid-cols: 2; --display--md: subgrid-col",
      "--display: subgrid-col; --display--lg: grid; --grid-cols--lg: 2",
    ) as [Element, Element];
    await atWidth(below("md"));
    expect(cols(up).split(" ")).toHaveLength(2);
    expect(cols(down)).toMatch(/^subgrid/);
    await atWidth(at("md"));
    expect(cols(up)).toMatch(/^subgrid/);
    await atWidth(at("lg"));
    expect(cols(up)).toMatch(/^subgrid/);
    expect(cols(down)).not.toMatch(/subgrid/);
    expect(cols(down).split(" ")).toHaveLength(2);
  });

  it("a count at a higher tier takes its axis back", async () => {
    const [sub, gal] = nestedAll(
      "--display: subgrid-col; --grid-cols--md: 2",
      "--display: grid-gallery; --ui-gallery-min-w: 100px; --grid-cols--md: 2",
    ) as [Element, Element];
    await atWidth(below("md"));
    expect(cols(sub)).toMatch(/^subgrid/);
    expect(columns(gal)).toBe(3);
    await atWidth(at("md"));
    expect(cols(sub).split(" ")).toHaveLength(2);
    expect(columns(gal)).toBe(2);
  });

  it("below its tier it leaves a tier-only count and a raw template alone", async () => {
    const [count, raw] = nestedAll(
      "--display: grid; --grid-cols--sm: 3; --display--lg: subgrid-row",
      "--display: subgrid-col; --template-rows: 10px 20px",
    ) as [Element, Element];
    // below sm the tier-only count's own rule in the defaults layer shows through
    await atWidth(below("sm"));
    expect(cols(count)).toMatch(/^[\d.]+px$/);
    await atWidth(at("sm"));
    expect(cols(count).split(" ")).toHaveLength(3);
    expect(rows(raw)).toBe("10px 20px");
    expect(cols(raw)).toMatch(/^subgrid/);
  });
});
