"use strict";

/**
 * @fileoverview Card: a variant stays on its element, an inline hook reaches a
 * nested card, the 1px border holds across variants, and utilities beat variants.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, scale, style, useKit } from "../../../test/browser.ts";

const background = (el: Element) => style(el, "background-color");

describe("card (claim 26)", () => {
  useKit();

  it("a variant stays on its element; an inline hook reaches a nested card", () => {
    const root = mount(`<div>
      <div data-ui="card" data-reference>r</div>
      <div data-ui="card" data-card-variant="muted" data-outer><div data-ui="card" data-inner>i</div></div>
      <div data-ui="card" style="--ui-card-bg: rgb(255, 0, 0)"><div data-ui="card" data-hooked>h</div></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(background(at("[data-outer]"))).not.toBe(background(at("[data-reference]")));
    expect(background(at("[data-inner]"))).toBe(background(at("[data-reference]")));
    expect(background(at("[data-hooked]"))).toBe("rgb(255, 0, 0)");
  });

  it("is bare by default; outline, muted, and floating each add padding, the radius, and one treatment", () => {
    const root = mount(`<div>
      <div data-ui="card" data-default>d</div>
      <div data-ui="card" data-card-variant="outline" data-outline>o</div>
      <div data-ui="card" data-card-variant="muted" data-muted>m</div>
      <div data-ui="card" data-card-variant="floating" data-floating>f</div>
      <div data-ui="card" data-card-variant="muted" data-utility style="--p: 2">u</div>
      <div data-swatch style="background-color: var(--color-border)"></div>
      <div data-swatch-muted style="background-color: var(--color-muted)"></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    const inset = lengthPx("var(--space-md)");
    const radius = lengthPx("var(--radius-lg)");
    const border = background(at("[data-swatch]"));
    const transparent = "rgba(0, 0, 0, 0)";

    // every card keeps a 1px border, so variants line up; only its color changes
    for (const card of root.querySelectorAll('[data-ui="card"]')) {
      expect(style(card, "border-top-width")).toBe("1px");
    }

    const plain = at("[data-default]");
    expect(style(plain, "padding-top")).toBe("0px");
    expect(style(plain, "border-top-color")).toBe(transparent);
    expect(style(plain, "border-top-left-radius")).toBe("0px");
    expect(style(plain, "box-shadow")).toBe("none");

    const outline = at("[data-outline]");
    expect(Number.parseFloat(style(outline, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(outline, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(style(outline, "border-top-color")).toBe(border);
    expect(style(outline, "box-shadow")).toBe("none");

    const muted = at("[data-muted]");
    expect(Number.parseFloat(style(muted, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(muted, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(background(muted)).toBe(background(at("[data-swatch-muted]")));
    expect(style(muted, "border-top-color")).toBe(transparent);

    const floating = at("[data-floating]");
    expect(Number.parseFloat(style(floating, "padding-top"))).toBeCloseTo(inset, 1);
    expect(Number.parseFloat(style(floating, "border-top-left-radius"))).toBeCloseTo(radius, 1);
    expect(style(floating, "box-shadow")).not.toBe("none");
    expect(style(floating, "border-top-color")).toBe(border);

    expect(Number.parseFloat(style(at("[data-utility]"), "padding-top"))).toBeCloseTo(scale(2), 1);
  });

  it("takes --radius and --border-color utilities over its variant", () => {
    const root = mount(`<div>
      <div data-ui="card" data-radius style="--radius: 1.5">r</div>
      <div data-ui="card" data-card-variant="outline" data-colored style="--border-color: rgb(255, 0, 0)">c</div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(Number.parseFloat(style(at("[data-radius]"), "border-top-left-radius"))).toBeCloseTo(
      lengthPx("var(--radius-sm)"),
      1,
    );
    expect(style(at("[data-colored]"), "border-top-color")).toBe("rgb(255, 0, 0)");
  });

  it("is a grid with the gap hook, or a --gap utility", () => {
    const root = mount(`<div>
      <div data-ui="card" data-default><p>a</p><p>b</p></div>
      <div data-ui="card" data-utility style="--gap: 4"><p>a</p><p>b</p></div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    expect(style(at("[data-default]"), "display")).toBe("grid");
    expect(Number.parseFloat(style(at("[data-default]"), "row-gap"))).toBeCloseTo(
      lengthPx("var(--ui-card-gap)"),
      1,
    );
    expect(Number.parseFloat(style(at("[data-utility]"), "row-gap"))).toBeCloseTo(scale(4), 1);
  });

  it("styles the <ui-card> tag like the data-ui form", () => {
    const root = mount(`<div>
      <div data-ui="card" data-card-variant="outline" data-attr>a</div>
      <ui-card data-card-variant="outline" data-tag>t</ui-card>
    </div>`);
    const attr = root.querySelector("[data-attr]")!;
    const tag = root.querySelector("[data-tag]")!;
    for (const property of [
      "display",
      "padding-top",
      "border-top-width",
      "border-top-color",
      "border-top-left-radius",
    ]) {
      expect(style(tag, property)).toBe(style(attr, property));
    }
  });

  it("keeps its padding with slots, and a media header bleeds to the edge", () => {
    const root = mount(`<div style="width: 320px">
      <ui-card data-card-variant="outline" data-media-card>
        <figure data-card-slot="header" data-media><img width="300" height="200" alt="" style="--size: 100%"></figure>
        <div data-card-slot="body" data-body>b</div>
        <footer data-card-slot="footer">f</footer>
      </ui-card>
      <ui-card data-card-variant="outline" data-captioned-card>
        <figure data-card-slot="header" data-captioned><img width="300" height="200" alt=""><figcaption>c</figcaption></figure>
      </ui-card>
      <ui-card data-card-variant="outline" style="--p: 2" data-small-card>
        <figure data-card-slot="header" data-small-media><img width="300" height="200" alt="" style="--size: 100%"></figure>
        <div data-card-slot="body">b</div>
      </ui-card>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    const inset = lengthPx("var(--space-md)");
    const px = (el: Element, property: string) => Number.parseFloat(style(el, property));
    const edges = (card: Element, media: Element) => {
      const c = card.getBoundingClientRect();
      const m = media.getBoundingClientRect();
      return {
        left: m.left - c.left - px(card, "border-left-width"),
        right: c.right - m.right - px(card, "border-right-width"),
        top: m.top - c.top - px(card, "border-top-width"),
      };
    };

    const card = at("[data-media-card]");
    expect(px(card, "padding-top")).toBeCloseTo(inset, 1);
    expect(style(at("[data-body]"), "padding-left")).toBe("0px");
    for (const gap of Object.values(edges(card, at("[data-media]")))) expect(gap).toBeCloseTo(0, 0);

    // a figure with a caption stays inside the padding
    expect(edges(at("[data-captioned-card]"), at("[data-captioned]")).left).toBeCloseTo(inset, 0);

    // --p sets the card's padding once, and the bleed follows it
    const small = at("[data-small-card]");
    expect(px(small, "padding-left")).toBeCloseTo(scale(2), 1);
    for (const gap of Object.values(edges(small, at("[data-small-media]"))))
      expect(gap).toBeCloseTo(0, 0);
  });

  it("lays a horizontal card out in two columns from sm up, and stacks below", () => {
    const card = (
      name: string,
    ) => `<ui-card data-card-variant="outline" data-card-orientation="horizontal" data-${name}>
      <figure data-card-slot="header" data-media><img width="300" height="200" alt="" style="--size: 100%"></figure>
      <div data-card-slot="body" data-body>
        b
        <ui-card data-card-variant="outline" data-nested><div data-card-slot="header" data-nested-header>h</div><div data-card-slot="body" data-nested-body>n</div></ui-card>
      </div>
      <footer data-card-slot="footer" data-footer>f</footer>
    </ui-card>`;
    const root = mount(`<div>
      <div style="--container-type: inline-size; width: 48rem">${card("wide")}</div>
      <div dir="rtl" style="--container-type: inline-size; width: 48rem">${card("rtl")}</div>
      <div style="--container-type: inline-size; width: 20rem">${card("narrow")}</div>
      <div style="--container-type: inline-size; width: 48rem">
        <ui-card data-card-variant="outline" data-card-orientation="horizontal" data-headless>
          <div data-card-slot="body" data-headless-body>b</div>
          <footer data-card-slot="footer" data-headless-footer>f</footer>
        </ui-card>
      </div>
    </div>`);
    const at = (selector: string) => root.querySelector(selector)!;
    const box = (selector: string) => at(selector).getBoundingClientRect();
    const px = (el: Element, property: string) => Number.parseFloat(style(el, property));

    const wide = at("[data-wide]");
    const cardBox = wide.getBoundingClientRect();
    const media = box("[data-wide] > [data-media]");
    const body = box("[data-wide] > [data-body]");
    const footer = box("[data-wide] > [data-footer]");
    expect(body.left).toBeGreaterThan(media.right);
    // the media bleeds on its three outer sides
    expect(media.left - cardBox.left).toBeCloseTo(px(wide, "border-left-width"), 0);
    expect(media.top - cardBox.top).toBeCloseTo(px(wide, "border-top-width"), 0);
    expect(cardBox.bottom - media.bottom).toBeCloseTo(px(wide, "border-bottom-width"), 0);
    expect(footer.left).toBeCloseTo(body.left, 0);
    expect(footer.top).toBeGreaterThanOrEqual(body.bottom - 0.5);
    // the footer pins to the bottom, inside the padding
    expect(cardBox.bottom - footer.bottom).toBeCloseTo(
      px(wide, "border-bottom-width") + px(wide, "padding-bottom"),
      0,
    );

    // a nested card keeps its own vertical layout
    expect(box("[data-wide] [data-nested-body]").top).toBeGreaterThanOrEqual(
      box("[data-wide] [data-nested-header]").bottom - 0.5,
    );
    expect(style(at("[data-wide] [data-nested-header]"), "grid-column-start")).toBe("auto");

    // in RTL the header column is on the right
    expect(box("[data-rtl] > [data-media]").left).toBeGreaterThan(
      box("[data-rtl] > [data-body]").right,
    );

    // below sm the card stacks
    const narrowMedia = box("[data-narrow] > [data-media]");
    const narrowBody = box("[data-narrow] > [data-body]");
    expect(narrowBody.top).toBeGreaterThanOrEqual(narrowMedia.bottom - 0.5);
    expect(narrowBody.left).toBeCloseTo(
      narrowMedia.left + px(at("[data-narrow]"), "padding-left"),
      0,
    );

    // without a header, a horizontal card stays one column
    const headless = box("[data-headless-body]");
    expect(box("[data-headless-footer]").top).toBeGreaterThanOrEqual(headless.bottom - 0.5);
    expect(headless.left - box("[data-headless]").left).toBeCloseTo(
      px(at("[data-headless]"), "border-left-width") + px(at("[data-headless]"), "padding-left"),
      0,
    );
  });

  it('names the default with data-card-orientation="vertical"', () => {
    const root = mount(`<div style="width: 320px">
      <ui-card data-plain><div data-card-slot="body">b</div></ui-card>
      <ui-card data-card-orientation="vertical" data-vertical><div data-card-slot="body">b</div></ui-card>
    </div>`);
    expect(style(root.querySelector("[data-vertical]")!, "grid-template-columns")).toBe(
      style(root.querySelector("[data-plain]")!, "grid-template-columns"),
    );
  });
});
