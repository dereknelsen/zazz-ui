// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the list navigation behavior
 * (`behaviors/list-navigation.ts`): which key is which step, per orientation
 * and writing direction, and where a step lands in a wrapping list.
 */

import { describe, expect, it } from "vite-plus/test";
import { isDisabledItem, listStep, stepIndex } from "./list-navigation.ts";

describe("listStep", () => {
  it("reads the vertical arrows by default", () => {
    expect(listStep("ArrowDown")).toBe("next");
    expect(listStep("ArrowUp")).toBe("previous");
    expect(listStep("ArrowRight")).toBeNull();
    expect(listStep("ArrowLeft")).toBeNull();
  });

  it("reads the horizontal arrows in a horizontal list", () => {
    expect(listStep("ArrowRight", { orientation: "horizontal" })).toBe("next");
    expect(listStep("ArrowLeft", { orientation: "horizontal" })).toBe("previous");
    expect(listStep("ArrowDown", { orientation: "horizontal" })).toBeNull();
  });

  it("mirrors the horizontal arrows in RTL", () => {
    expect(listStep("ArrowLeft", { orientation: "horizontal", rtl: true })).toBe("next");
    expect(listStep("ArrowRight", { orientation: "horizontal", rtl: true })).toBe("previous");
  });

  it("leaves the vertical arrows alone in RTL", () => {
    expect(listStep("ArrowDown", { rtl: true })).toBe("next");
    expect(listStep("ArrowUp", { rtl: true })).toBe("previous");
  });

  it("reads Home and End in every list", () => {
    expect(listStep("Home")).toBe("first");
    expect(listStep("End", { orientation: "horizontal", rtl: true })).toBe("last");
  });

  it("returns null for any other key", () => {
    expect(listStep("PageDown")).toBeNull();
    expect(listStep("Enter")).toBeNull();
  });
});

describe("stepIndex", () => {
  it("returns -1 for an empty list", () => {
    expect(stepIndex(0, "next", 0)).toBe(-1);
  });

  it("enters from nothing at the first item going forward, the last going back", () => {
    expect(stepIndex(-1, "next", 3)).toBe(0);
    expect(stepIndex(-1, "previous", 3)).toBe(2);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(2, "next", 3)).toBe(0);
    expect(stepIndex(0, "previous", 3)).toBe(2);
  });

  it("jumps to the first and last item", () => {
    expect(stepIndex(1, "first", 3)).toBe(0);
    expect(stepIndex(1, "last", 3)).toBe(2);
  });
});

describe("isDisabledItem", () => {
  const item = (html: string): Element => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.querySelector("[data-item]")!;
  };

  it("is true for a disabled control and for aria-disabled", () => {
    expect(isDisabledItem(item(`<button data-item disabled></button>`))).toBe(true);
    expect(isDisabledItem(item(`<a href="/" data-item aria-disabled="true"></a>`))).toBe(true);
  });

  it("is false for an enabled item, and for aria-disabled=false", () => {
    expect(isDisabledItem(item(`<button data-item></button>`))).toBe(false);
    expect(isDisabledItem(item(`<a href="/" data-item aria-disabled="false"></a>`))).toBe(false);
  });
});
