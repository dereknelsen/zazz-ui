"use strict";

/**
 * @fileoverview Touch targets: `--spacing-touch-min` is the 44px floor, carried to the
 * primitives by `--_touch-min` on a touch screen (a primary pointer that cannot hover)
 * only. Visible controls grow to it; small indicators keep their box and extend an
 * invisible `::after` hit area. A control's inline padding grows by what its height grew, so
 * the text keeps the same optical margins on every side.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { commands, server, userEvent } from "vite-plus/test/browser/context";
import { lengthPx, mount, style, useCss, useKit } from "../../test/browser.ts";

const held = commands as unknown as { emulateTouch(enabled: boolean): Promise<void> };
const px = (value: string) => Number.parseFloat(value);
const box = (el: Element) => el.getBoundingClientRect();

/** The element a tap at (x, y) lands on. A pseudo-element hit-tests as its host. */
const tapped = (x: number, y: number) => document.elementFromPoint(x, y);

/** The floor in px, set directly on :root the way _variables.css sets it on a touch screen;
 * `floor` overrides the token so a hit area is measurably larger than the control. */
function withTouchFloor(floor?: number): number {
  const root = document.documentElement.style;
  if (floor !== undefined) root.setProperty("--spacing-touch-min", `${floor}px`);
  root.setProperty("--_touch-min", "var(--spacing-touch-min)");
  return lengthPx("var(--spacing-touch-min)");
}

describe("at a very small --spacing", () => {
  useKit();
  useCss(`:root { --spacing: 0.15rem; } * { transition: none !important; }`);

  it("a floored tag remove button doesn't make its tag taller", () => {
    const root = mount(`<div>
      <ui-combobox><span data-ui="badge" data-plain>Tag</span></ui-combobox>
      <ui-combobox><span data-ui="badge" data-with>Tag<button type="button" data-combobox-slot="tag-remove"></button></span></ui-combobox>
    </div>`);
    expect(box(root.querySelector("[data-with]")!).height).toBeCloseTo(
      box(root.querySelector("[data-plain]")!).height,
      1,
    );
  });

  it("checkbox, radio, switch, slider thumb, and tag remove keep a 1rem floor", () => {
    const rem = lengthPx("1rem");
    const root = mount(`<div style="--display: grid; --gap: 4; --justify-items: start">
      <input type="checkbox" data-checkbox />
      <input type="checkbox" data-sized style="--size: 2" />
      <input type="radio" data-ui="radio" data-radio />
      <label data-switch-label><input type="checkbox" role="switch" data-switch /></label>
      <input type="range" data-slider />
      <ui-combobox><button type="button" data-combobox-slot="tag-remove" data-remove></button></ui-combobox>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    for (const selector of ["[data-checkbox]", "[data-sized]", "[data-radio]", "[data-remove]"]) {
      expect(box(at(selector)).width, selector).toBeCloseTo(rem, 1);
      expect(box(at(selector)).height, selector).toBeCloseTo(rem, 1);
    }
    const track = box(at("[data-switch]"));
    expect(track.height).toBeCloseTo(rem, 1);
    expect(track.width).toBeGreaterThan(track.height);
    const label = at("[data-switch-label]");
    const thumb = px(style(label, "inline-size", "::after"));
    expect(thumb).toBeLessThan(track.height);
    expect(thumb).toBeGreaterThan(track.height / 2);
    expect(lengthPx(style(at("[data-slider]"), "--ui-slider-thumb-size"))).toBeCloseTo(rem, 1);
    // the remove glyph stays its own size inside the floored button
    expect(px(style(at("[data-remove]"), "inline-size", "::before"))).toBeCloseTo(
      lengthPx("var(--ui-combobox-tag-remove-size)"),
      1,
    );
  });
});

describe("touch targets", () => {
  useKit();
  useCss(`* { transition: none !important; }`);
  afterEach(() => document.documentElement.removeAttribute("style"));

  it("--spacing-touch-min is 44px and --_touch-min is 0 on a pointer that hovers", () => {
    expect(lengthPx("var(--spacing-touch-min)")).toBe(44);
    expect(lengthPx("var(--_touch-min)")).toBe(0);
    expect(lengthPx("var(--spacing-min)")).toBeCloseTo(16 * 0.225, 1);
  });

  // Touch emulation is a CDP session: Chromium only.
  it.skipIf(server.browser !== "chromium")(
    "a primary pointer that cannot hover turns the floor on and leaves the spacing scale alone",
    async () => {
      await held.emulateTouch(true);
      try {
        expect(matchMedia("(hover: hover)").matches).toBe(false);
        expect(lengthPx("var(--_touch-min)")).toBe(44);
        expect(lengthPx("var(--spacing-min)")).toBeCloseTo(16 * 0.225, 1);
        const button = mount(`<button data-ui="button">Save</button>`);
        expect(box(button).height).toBeGreaterThanOrEqual(44);
      } finally {
        await held.emulateTouch(false);
      }
      expect(lengthPx("var(--_touch-min)")).toBe(0);
    },
  );

  it("visible controls grow to the floor; link and sm buttons keep their box", () => {
    const floor = withTouchFloor();
    const root = mount(`<div style="--display: grid; --gap: 12; --justify-items: start">
      <button data-ui="button" data-default>Save</button>
      <button data-ui="button" data-button-size="icon" data-icon><svg></svg></button>
      <button data-ui="button" data-button-variant="link" data-link>Learn more</button>
      <button data-ui="button" data-button-size="sm" data-sm>Small</button>
      <input data-ui="input" data-input />
      <select data-ui="select" data-select><option>One</option></select>
      <label data-ui="toggle" data-toggle><input type="checkbox" />Bold</label>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(box(at("[data-default]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-icon]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-icon]")).width).toBeCloseTo(box(at("[data-icon]")).height, 0);
    expect(box(at("[data-link]")).height).toBeLessThan(floor);
    expect(box(at("[data-sm]")).height).toBeLessThan(floor);
    expect(box(at("[data-input]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-select]")).height).toBeGreaterThanOrEqual(floor);
    expect(box(at("[data-toggle]")).height).toBeGreaterThanOrEqual(floor);
  });

  it("controls that grow to the floor add the growth to their inline padding", () => {
    const FIXTURE = `<div style="--display: grid; --gap: 12; --justify-items: start">
      <button data-ui="button" data-default>Save</button>
      <label data-ui="toggle" data-toggle><input type="checkbox" />Bold</label>
      <input data-ui="input" data-input />
      <select data-ui="select" data-select><option>One</option></select>
      <div data-ui="tabs"><div data-tabs-slot="list"><label data-tabs-slot="label" data-tab>One</label></div></div>
      <div data-ui="input-group" data-group><input data-ui="input" data-grouped /></div>
      <button data-ui="button" data-kbd><span>Search</span><kbd>K</kbd></button>
      <div data-ui="input-group" data-tall style="--ui-input-group-min-h: 2.25rem"><input data-ui="input" data-tall-input /></div>
      <button data-ui="button" data-button-variant="link" data-link>Learn more</button>
      <button data-ui="button" data-button-size="sm" data-sm>Small</button>
      <ui-accordion>
        <details><summary data-ui="button" data-summary-button>Menu</summary><div>A</div></details>
        <details><summary data-summary>Plain</summary><div>B</div></details>
      </ui-accordion>
    </div>`;
    // WebKit drops the select's custom properties (and with them its padding) once the floor
    // is set inline on :root, with or without the inline growth; its height still grows
    // the summary that is a button pads from its own floor growth, not the accordion's 0 min-h
    const GROWS = [
      "[data-default]",
      "[data-toggle]",
      "[data-input]",
      "[data-tab]",
      "[data-summary-button]",
    ].concat(server.browser === "webkit" ? [] : ["[data-select]"]);
    const KEEPS = ["[data-link]", "[data-sm]"];
    const measure = () => {
      const root = mount(FIXTURE);
      const read = (selector: string) => {
        const el = root.querySelector(selector)!;
        return {
          height: box(el).height,
          start: px(style(el, "padding-inline-start")),
          end: px(style(el, "padding-inline-end")),
        };
      };
      const all = [
        ...GROWS,
        ...KEEPS,
        "[data-group]",
        "[data-grouped]",
        "[data-kbd]",
        "[data-tall]",
        "[data-tall-input]",
        "[data-summary]",
      ];
      return Object.fromEntries(all.map((selector) => [selector, read(selector)]));
    };
    const mouse = measure();
    const floor = withTouchFloor();
    const touch = measure();
    for (const selector of GROWS) {
      const grew = touch[selector]!.height - mouse[selector]!.height;
      expect(grew, selector).toBeGreaterThan(0);
      expect(touch[selector]!.start - mouse[selector]!.start, selector).toBeCloseTo(grew / 2, 0);
      expect(touch[selector]!.end - mouse[selector]!.end, selector).toBeCloseTo(grew / 2, 0);
    }
    for (const selector of KEEPS) {
      expect(touch[selector]!.start, selector).toBeCloseTo(mouse[selector]!.start, 1);
    }
    // the input inside a group pads by the group's growth
    const grew = touch["[data-group]"]!.height - mouse["[data-group]"]!.height;
    expect(grew).toBeGreaterThan(0);
    const grouped = touch["[data-grouped]"]!.start - mouse["[data-grouped]"]!.start;
    expect(grouped).toBeCloseTo(grew / 2, 0);
    // a group with its own min-h hook (36px): the input pads by the shell's floor growth,
    // (44 - 36) / 2, not the field's
    const tallPad = touch["[data-tall-input]"]!.start - mouse["[data-tall-input]"]!.start;
    expect(tallPad).toBeCloseTo((floor - 36) / 2, 0);
    // a plain accordion summary grows to the floor and pads nothing
    expect(touch["[data-summary]"]!.height).toBeGreaterThanOrEqual(floor - 0.5);
    expect(touch["[data-summary]"]!.start).toBeCloseTo(mouse["[data-summary]"]!.start, 1);
    // a button with a kbd at one end pads both ends by the same touch growth as a plain
    // button: the growth comes from the min height, and the kbd can make the box taller
    const padGrew = touch["[data-default]"]!.start - mouse["[data-default]"]!.start;
    expect(touch["[data-kbd]"]!.end, "kbd end is tighter").toBeLessThan(touch["[data-kbd]"]!.start);
    expect(touch["[data-kbd]"]!.start - mouse["[data-kbd]"]!.start).toBeCloseTo(padGrew, 1);
    expect(touch["[data-kbd]"]!.end - mouse["[data-kbd]"]!.end).toBeCloseTo(padGrew, 1);
  });

  it.each(["single", "multiselect"])(
    "a %s combobox control pads by half its own growth, like an input",
    (variant) => {
      const attr = variant === "multiselect" ? 'data-combobox-variant="multiselect"' : "";
      const measure = () => {
        const root = mount(`<div style="--display: grid; --gap: 12; inline-size: 320px">
          <ui-combobox ${attr}><div data-combobox-slot="control"><input role="combobox" /></div></ui-combobox>
          <input data-ui="input" />
        </div>`);
        const read = (el: Element) => ({
          height: box(el).height,
          start: px(style(el, "padding-inline-start")),
          end: px(style(el, "padding-inline-end")),
        });
        return {
          control: read(root.querySelector('[data-combobox-slot~="control"]')!),
          input: read(root.querySelector('[data-ui="input"]')!),
        };
      };
      const mouse = measure();
      withTouchFloor();
      const touch = measure();
      const grew = touch.control.height - mouse.control.height;
      expect(grew).toBeGreaterThan(0);
      expect(touch.control.start - mouse.control.start).toBeCloseTo(grew / 2, 0);
      expect(touch.control.end - mouse.control.end).toBeCloseTo(grew / 2, 0);
      expect(touch.control.start - mouse.control.start).toBeCloseTo(
        touch.input.start - mouse.input.start,
        0,
      );
    },
  );

  it("a sm button keeps its box but a tap just outside it still lands on it", () => {
    const floor = withTouchFloor(44);
    const root = mount(`<div style="--p: 16">
      <button data-ui="button" data-button-size="sm">Small</button>
    </div>`);
    const button = root.querySelector("button")!;
    const b = box(button);
    expect(b.height).toBeLessThan(floor);
    // the inset resolves against the padding box, so the border adds to the floor
    const hit = b.height - 2 * px(style(button, "inset-block-start", "::after"));
    expect(hit).toBeGreaterThanOrEqual(floor);
    expect(hit).toBeLessThan(floor + 3);
    const reach = (hit - b.height) / 2 - 2;
    expect(reach).toBeGreaterThan(0);
    expect(tapped(b.left + b.width / 2, b.top - reach)).toBe(button);
    expect(tapped(b.left + b.width / 2, b.bottom + reach)).toBe(button);
  });

  it("checkbox, radio and switch keep their size and gain a hit area at the floor", () => {
    const floor = withTouchFloor(44);
    const root = mount(`<div style="--display: grid; --gap: 16; --p: 16; --justify-items: start">
      <input type="checkbox" data-checkbox />
      <input type="radio" data-ui="radio" data-radio />
      <label data-switch-label><input type="checkbox" role="switch" data-switch /></label>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    for (const selector of ["[data-checkbox]", "[data-radio]", "[data-switch]"]) {
      const el = at(selector);
      const b = box(el);
      expect(b.height, selector).toBeLessThan(floor);
      // the ::after is inset by half the shortfall on each side (measured against the
      // padding box, so the border adds to the floor): the hit area spans at least the floor
      const hit = b.height - 2 * px(style(el, "inset-block-start", "::after"));
      expect(hit, selector).toBeGreaterThanOrEqual(floor);
      expect(hit, selector).toBeLessThan(floor + 3);
      // just inside the hit area's edge is outside the box but still lands on the control
      const reach = (hit - b.height) / 2 - 2;
      expect(reach, selector).toBeGreaterThan(0);
      expect(tapped(b.left + b.width / 2, b.top - reach), selector).toBe(el);
      expect(tapped(b.left + b.width / 2, b.bottom + reach), selector).toBe(el);
    }
  });

  // A range thumb can't have an ::after, so the thumb's own box grows. A press that lands
  // on the thumb keeps the value; one on the track jumps the value to the press.
  it.each([
    [12, "lands on the thumb"],
    [40, "lands on the track"],
  ])("a press %ipx from the slider thumb's center %s at the floor", async (offset, where) => {
    withTouchFloor(44);
    const root = mount(`<div style="inline-size: 300px; --p: 16">
      <input type="range" min="0" max="100" value="50" />
    </div>`);
    const input = root.querySelector("input")!;
    const b = box(input);
    expect(lengthPx(style(input, "--_slider-thumb-hit"))).toBeCloseTo(
      (44 - lengthPx("var(--ui-slider-thumb-size)")) / 2,
      1,
    );
    await userEvent.click(input, { position: { x: b.width / 2 + offset, y: b.height / 2 } });
    if (where === "lands on the thumb") expect(input.valueAsNumber).toBe(50);
    else expect(input.valueAsNumber).toBeGreaterThan(50);
  });

  it("without the floor the hit area collapses to the control's own box", () => {
    const root = mount(`<div style="--p: 16"><input type="checkbox" /></div>`);
    const el = root.querySelector("input")!;
    const b = box(el);
    expect(px(style(el, "inset-block-start", "::after"))).toBe(0);
    expect(tapped(b.left + b.width / 2, b.top - 12)).not.toBe(el);
  });
});
