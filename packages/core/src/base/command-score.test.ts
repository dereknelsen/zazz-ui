"use strict";

/**
 * @fileoverview Tests for the vendored cmdk scoring function (`base/command-score.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { commandScore } from "./command-score.ts";

describe("commandScore", () => {
  it("scores an exact continuous match as 1", () => {
    expect(commandScore("apple", "apple")).toBe(1);
  });

  it("scores a case-insensitive exact match just below 1", () => {
    const score = commandScore("Apple", "apple");
    expect(score).toBeLessThan(1);
    expect(score).toBeGreaterThan(0.99);
  });

  it("returns 0 for a non-match", () => {
    expect(commandScore("apple", "xyz")).toBe(0);
  });

  it("prefers word-boundary jumps over scattered characters", () => {
    // "op" hits the "o…p" word starts in one, scattered letters in the other
    expect(commandScore("open project", "op")).toBeGreaterThan(commandScore("loop", "op"));
  });

  it("prefers a prefix over a mid-word match", () => {
    expect(commandScore("settings", "set")).toBeGreaterThan(commandScore("assets", "set"));
  });

  it("penalizes transpositions but still matches", () => {
    const score = commandScore("ouch", "uo");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(commandScore("ouch", "ou"));
  });

  it("matches against aliases", () => {
    expect(commandScore("Trash", "delete", ["delete", "remove"])).toBeGreaterThan(0);
  });

  it("ranks the shorter candidate higher on an equal prefix", () => {
    expect(commandScore("html", "html")).toBeGreaterThan(commandScore("html5", "html"));
  });
});
