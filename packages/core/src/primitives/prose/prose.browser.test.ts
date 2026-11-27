"use strict";

/**
 * @fileoverview Prose: `data-ui="prose"` spaces and styles rich text from its
 * tags, `data-prose-slot` turns it off and on for a subtree, and
 * `data-prose-size` re-runs the type scale for the prose it sits on.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { atWidth, mount, style, useKit } from "../../../test/browser.ts";

describe("prose", () => {
  useKit();

  it("prose spaces its flow content", () => {
    const root = mount(`<article data-ui="prose"><p>one</p><p data-second>two</p></article>`);
    expect(
      Number.parseFloat(style(root.querySelector("[data-second]")!, "margin-block-start")),
    ).toBeGreaterThan(0);
  });

  it("an end slot stops prose styling for its subtree", () => {
    const root = mount(`<article data-ui="prose">
      <p>one</p>
      <div data-prose-slot="end" data-out><p>a</p><p data-p>b</p><ul data-ul><li>x</li></ul></div>
      <p data-after>two</p>
    </article>`);
    const px = (selector: string, property: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, property));
    expect(px("[data-p]", "margin-block-start")).toBe(0);
    expect(style(root.querySelector("[data-ul]")!, "list-style-type")).toBe("none");
    expect(px("[data-ul]", "padding-inline-start")).toBe(0);
    // prose resumes after the subtree
    expect(px("[data-after]", "margin-block-start")).toBeGreaterThan(0);
  });

  it("a start slot inside an end slot turns prose back on", () => {
    const root = mount(`<article data-ui="prose">
      <div data-prose-slot="end">
        <p data-off>a</p><p data-still-off>b</p>
        <div data-prose-slot="start" data-on><p>c</p><p data-resumed>d</p></div>
      </div>
    </article>`);
    const margin = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "margin-block-start"));
    expect(margin("[data-still-off]")).toBe(0);
    expect(margin("[data-resumed]")).toBeGreaterThan(0);
    expect(style(root.querySelector("[data-on]")!, "display")).toBe("flex");
  });

  it("a start slot outside prose does nothing", () => {
    const root = mount(`<div data-prose-slot="start"><p>a</p><p data-p>b</p></div>`);
    expect(Number.parseFloat(style(root.querySelector("[data-p]")!, "margin-block-start"))).toBe(0);
    expect(style(root, "display")).toBe("block");
  });

  it("a prose nested inside an end slot styles its own content again", () => {
    const root = mount(`<article data-ui="prose">
      <div data-prose-slot="end"><div data-ui="prose"><p>a</p><p data-inner>b</p></div></div>
    </article>`);
    expect(
      Number.parseFloat(style(root.querySelector("[data-inner]")!, "margin-block-start")),
    ).toBeGreaterThan(0);
  });
});

describe("prose size and flow", () => {
  useKit();
  afterEach(() => document.documentElement.removeAttribute("style"));

  const size = (el: Element) => Number.parseFloat(style(el, "font-size"));

  it("data-prose-size resizes the prose it sits on, not the page around it", async () => {
    await atWidth(1280);
    const root = mount(`<div>
      <article data-ui="prose" data-prose-size="lg"><h2 data-h2>a</h2><p data-p>b</p></article>
      <article data-ui="prose"><h2 data-plain-h2>a</h2><p data-plain-p>b</p></article>
    </div>`);
    const at = (selector: string) => size(root.querySelector(selector)!);
    expect(at("[data-p]")).toBeGreaterThan(at("[data-plain-p]"));
    expect(at("[data-h2]")).toBeGreaterThan(at("[data-plain-h2]"));
    expect(at("[data-plain-p]")).toBeCloseTo(16, 1);
  });

  it('data-prose-size="lg" sets an 18px base with 1.8 leading', async () => {
    await atWidth(1280);
    const p = mount(
      `<article data-ui="prose" data-prose-size="lg"><p>a</p></article>`,
    ).firstElementChild!;
    expect(size(p)).toBeCloseTo(18, 1);
    expect(Number.parseFloat(style(p, "line-height"))).toBeCloseTo(18 * 1.8, 0);
  });

  it(":root controls and hooks still reach a sized prose", async () => {
    await atWidth(1280);
    const mountLg = () =>
      mount(`<article data-ui="prose" data-prose-size="lg"><h2>a</h2><p>b</p><p>c</p></article>`);
    const before = mountLg();
    const h2 = size(before.children[0]);
    const margin = Number.parseFloat(style(before.children[2], "margin-block-start"));
    document.documentElement.style.setProperty("--typeset-scale-max", "1.5");
    document.documentElement.style.setProperty("--ui-prose-flow", "2");
    const after = mountLg();
    expect(size(after.children[0])).toBeGreaterThan(h2);
    expect(Number.parseFloat(style(after.children[2], "margin-block-start"))).toBeCloseTo(
      margin * 2,
      1,
    );
  });

  it('data-prose-size="sm" tightens size and flow', async () => {
    await atWidth(1280);
    const root = mount(`<div>
      <article data-ui="prose" data-prose-size="sm"><p>a</p><p data-p>b</p></article>
      <article data-ui="prose"><p>a</p><p data-plain>b</p></article>
    </div>`);
    const p = root.querySelector("[data-p]")!;
    const plain = root.querySelector("[data-plain]")!;
    expect(size(p)).toBeLessThan(size(plain));
    expect(Number.parseFloat(style(p, "margin-block-start"))).toBeLessThan(
      Number.parseFloat(style(plain, "margin-block-start")),
    );
  });

  it("--ui-prose-flow scales the space between prose blocks", () => {
    const root = mount(`<div>
      <article data-ui="prose" style="--ui-prose-flow: 2"><p>a</p><p data-double>b</p></article>
      <article data-ui="prose"><p>a</p><p data-single>b</p></article>
    </div>`);
    const margin = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "margin-block-start"));
    expect(margin("[data-single]")).toBeGreaterThan(0);
    expect(margin("[data-double]")).toBeCloseTo(margin("[data-single]") * 2, 1);
  });

  it("a data-font role takes its own spacing, and beats a prose default", () => {
    const root = mount(`<article data-ui="prose">
      <p>a</p>
      <p data-font="h2" data-heading>b</p>
      <p data-plain>c</p>
      <figure><img alt="" /><figcaption data-font="lg" data-caption>d</figcaption></figure>
      <hgroup data-font="sm" data-group><p>e</p></hgroup>
    </article>`);
    const margin = (selector: string) =>
      Number.parseFloat(style(root.querySelector(selector)!, "margin-block-start"));
    expect(margin("[data-heading]")).toBeGreaterThan(margin("[data-plain]"));
    expect(size(root.querySelector("[data-caption]")!)).toBeGreaterThan(
      size(root.querySelector("[data-plain]")!),
    );
    expect(size(root.querySelector("[data-group]")!)).toBeLessThan(
      size(root.querySelector("[data-plain]")!),
    );
  });
});
