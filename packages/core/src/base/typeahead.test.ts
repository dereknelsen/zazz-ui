// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the typeahead engine's pure functions (`base/typeahead.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { nextActiveIndex, rankItems } from "./typeahead.ts";

describe("rankItems", () => {
  const items = [
    { value: "Apple", keywords: [] },
    { value: "Banana", keywords: [] },
    { value: "Cherry", keywords: ["red"] },
  ];

  it("keeps every item visible on an empty query", () => {
    const ranked = rankItems("", items);
    expect(ranked.every((verdict) => !verdict.hidden)).toBe(true);
    expect(ranked.every((verdict) => verdict.score === 1)).toBe(true);
  });

  it("treats a whitespace-only query as empty", () => {
    expect(rankItems("   ", items).every((verdict) => !verdict.hidden)).toBe(true);
  });

  it("hides non-matching items", () => {
    const ranked = rankItems("app", items);
    expect(ranked[0].hidden).toBe(false);
    expect(ranked[1].hidden).toBe(true);
  });

  it("matches through keywords", () => {
    const ranked = rankItems("red", items);
    expect(ranked[2].hidden).toBe(false);
  });

  it("preserves input order in its verdicts", () => {
    expect(rankItems("a", items).map((verdict) => verdict.index)).toEqual([0, 1, 2]);
  });
});

describe("nextActiveIndex", () => {
  it("returns -1 when nothing is visible", () => {
    expect(nextActiveIndex(0, "ArrowDown", 0)).toBe(-1);
  });

  it("enters the list from nothing at either end", () => {
    expect(nextActiveIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(nextActiveIndex(-1, "ArrowUp", 3)).toBe(2);
  });

  it("wraps in both directions", () => {
    expect(nextActiveIndex(2, "ArrowDown", 3)).toBe(0);
    expect(nextActiveIndex(0, "ArrowUp", 3)).toBe(2);
  });

  it("jumps with Home and End", () => {
    expect(nextActiveIndex(1, "Home", 3)).toBe(0);
    expect(nextActiveIndex(1, "End", 3)).toBe(2);
  });

  it("ignores unrelated keys", () => {
    expect(nextActiveIndex(1, "PageDown", 3)).toBe(1);
  });
});
