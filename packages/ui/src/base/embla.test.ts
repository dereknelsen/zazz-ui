// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the active-index sync helper (`setActiveIndex`) —
 * the shared "which one is current" marker used by both dot pagination and
 * thumb navigation in `embla.ts`.
 */

import { describe, expect, it } from "vite-plus/test";
import { setActiveIndex } from "./embla.ts";

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
