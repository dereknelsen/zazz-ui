// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the toaster's pure stack math (`computeStackLayout`).
 * The measure step and the DOM writes are adapters around this function; the
 * stacking model itself is fully specified here.
 */

import { describe, expect, it } from "vite-plus/test";
import { computeStackLayout } from "./toaster.ts";

describe("computeStackLayout", () => {
  it("returns an empty layout for an empty stack", () => {
    const { toasts, frontToastHeightPx } = computeStackLayout([]);
    expect(toasts).toEqual([]);
    expect(frontToastHeightPx).toBeNull();
  });

  it("puts a single toast in front with no offset", () => {
    const { toasts, frontToastHeightPx } = computeStackLayout([64]);
    expect(toasts).toEqual([{ stackIndex: 0, offsetPx: 0, zIndex: 1, front: true, visible: true }]);
    expect(frontToastHeightPx).toBe(64);
  });

  it("stacks newest (last) in front and accumulates offsets backward", () => {
    // Oldest first: heights [40, 50, 60] (the 60px toast is newest/front).
    const { toasts, frontToastHeightPx } = computeStackLayout([40, 50, 60]);

    expect(toasts[2]).toEqual({
      stackIndex: 0,
      offsetPx: 0,
      zIndex: 3,
      front: true,
      visible: true,
    });
    // One toast (60px) sits in front of the middle toast.
    expect(toasts[1]).toEqual({
      stackIndex: 1,
      offsetPx: 60,
      zIndex: 2,
      front: false,
      visible: true,
    });
    // Two toasts (60 + 50 px) sit in front of the oldest.
    expect(toasts[0]).toEqual({
      stackIndex: 2,
      offsetPx: 110,
      zIndex: 1,
      front: false,
      visible: true,
    });
    expect(frontToastHeightPx).toBe(60);
  });

  it("hides toasts beyond the visible stack size", () => {
    const { toasts } = computeStackLayout([10, 20, 30, 40, 50]);
    const visibility = toasts.map((toast) => toast.visible);
    // Oldest two fall outside VISIBLE_TOASTS (3).
    expect(visibility).toEqual([false, false, true, true, true]);
  });

  it("keeps z-index strictly decreasing toward the back", () => {
    const { toasts } = computeStackLayout([10, 10, 10, 10]);
    const zOrder = [...toasts].sort((a, b) => a.stackIndex - b.stackIndex).map((t) => t.zIndex);
    expect(zOrder).toEqual([4, 3, 2, 1]);
  });
});
