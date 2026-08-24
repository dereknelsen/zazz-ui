// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for Embla helpers — active-index sync (`setActiveIndex`)
 * and plugin-slug parsing (`parseCarouselPlugins`).
 */

import { describe, expect, it } from "vite-plus/test";
import { parseCarouselPlugins, setActiveIndex } from "./embla.ts";

function makeNodes(count: number): HTMLElement[] {
  return Array.from({ length: count }, () => document.createElement("button"));
}

describe("setActiveIndex", () => {
  it("marks only the selected node active", () => {
    const nodes = makeNodes(3);
    setActiveIndex(nodes, 1);
    expect(nodes.map((n) => n.classList.contains("is-active"))).toEqual([false, true, false]);
  });

  it("moves the active class when the selection changes", () => {
    const nodes = makeNodes(3);
    setActiveIndex(nodes, 0);
    setActiveIndex(nodes, 2);
    expect(nodes.map((n) => n.classList.contains("is-active"))).toEqual([false, false, true]);
  });

  it("does not touch aria-current by default", () => {
    const nodes = makeNodes(2);
    setActiveIndex(nodes, 0);
    expect(nodes.every((n) => !n.hasAttribute("aria-current"))).toBe(true);
  });

  it("sets aria-current only on the active node when requested", () => {
    const nodes = makeNodes(3);
    setActiveIndex(nodes, 1, { ariaCurrent: true });
    expect(nodes.map((n) => n.getAttribute("aria-current"))).toEqual([null, "true", null]);
  });

  it("clears aria-current from the previously active node", () => {
    const nodes = makeNodes(2);
    setActiveIndex(nodes, 0, { ariaCurrent: true });
    setActiveIndex(nodes, 1, { ariaCurrent: true });
    expect(nodes[0].hasAttribute("aria-current")).toBe(false);
    expect(nodes[1].getAttribute("aria-current")).toBe("true");
  });

  it("handles an empty node list", () => {
    expect(() => setActiveIndex([], 0)).not.toThrow();
  });
});

describe("parseCarouselPlugins", () => {
  it("returns an empty array for null", () => {
    expect(parseCarouselPlugins(null)).toEqual([]);
  });

  it("returns an empty array for empty or whitespace-only values", () => {
    expect(parseCarouselPlugins("")).toEqual([]);
    expect(parseCarouselPlugins("   ")).toEqual([]);
  });

  it("splits space-separated plugin slugs", () => {
    expect(parseCarouselPlugins("class-names autoplay")).toEqual(["class-names", "autoplay"]);
  });

  it("preserves authoring order and collapses extra whitespace", () => {
    expect(parseCarouselPlugins("  auto-scroll   class-names  ")).toEqual([
      "auto-scroll",
      "class-names",
    ]);
  });

  it("keeps unknown slugs (caller ignores them)", () => {
    expect(parseCarouselPlugins("class-names nope autoplay")).toEqual([
      "class-names",
      "nope",
      "autoplay",
    ]);
  });
});
