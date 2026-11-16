// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the native carousel engine's pure math: the release
 * projection, the snap a release lands on, and the loop rotation.
 */

import { describe, expect, it } from "vite-plus/test";
import {
  loopLead,
  loopOrders,
  loopShift,
  projectRelease,
  releaseTarget,
} from "./carousel-scroll.ts";

const snaps = (...positions: number[]) => positions.map((pos, i) => ({ pos, slides: [i] }));

describe("projectRelease", () => {
  it("coasts v²/2a, signed like the velocity", () => {
    expect(projectRelease(1)).toBeCloseTo(200);
    expect(projectRelease(-2)).toBeCloseTo(-800);
    expect(projectRelease(0)).toBe(0);
  });
});

describe("releaseTarget", () => {
  const list = snaps(0, 300, 600, 900);

  it("lands on the snap nearest the projection", () => {
    expect(releaseTarget(list, 1, 640, 0)).toBe(2);
  });

  it("a fast flick steps one snap even when the projection falls back", () => {
    // pointer moving left (negative) scrolls forward
    expect(releaseTarget(list, 1, 320, -0.5)).toBe(2);
    expect(releaseTarget(list, 1, 280, 0.5)).toBe(0);
  });

  it("moves one snap at most unless skipSnaps", () => {
    expect(releaseTarget(list, 0, 900, -3)).toBe(1);
    expect(releaseTarget(list, 0, 900, -3, true)).toBe(3);
  });

  it("a slow release stays put and the ends clamp", () => {
    expect(releaseTarget(list, 1, 320, -0.1)).toBe(1);
    expect(releaseTarget(list, 3, 900, -1)).toBe(3);
    expect(releaseTarget(list, 0, 0, 1)).toBe(0);
  });
});

describe("loopOrders", () => {
  it("rotates the current slide to the middle", () => {
    expect(loopOrders(5, 0)).toEqual([2, 3, 4, 0, 1]);
    expect(loopOrders(5, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(loopOrders(4, 3)).toEqual([3, 0, 1, 2]);
  });
});

describe("loopLead", () => {
  it("splits the slides not in view evenly around the view", () => {
    expect(loopLead(5, 1)).toBe(2);
    // 8 slides, 3 in view: 2 ahead, 3 in view, 3 behind
    expect(loopLead(8, 3)).toBe(2);
    expect(loopLead(4, 3)).toBe(1);
  });

  it("rotates with a lead", () => {
    expect(loopOrders(8, 0, 2)).toEqual([2, 3, 4, 5, 6, 7, 0, 1]);
  });
});

describe("loopShift", () => {
  it("leaves the track alone when the view and the target both fit", () => {
    expect(loopShift(8, { first: 2, last: 4 }, { first: 3, last: 5 })).toBe(0);
  });

  it("rotates so a target past the end fits, centring the span", () => {
    // in view 5..7, target 6..8: span 5..8 (4 slides) centred in 8 starts at 2
    expect(loopShift(8, { first: 5, last: 7 }, { first: 6, last: 8 })).toBe(-3);
  });

  it("rotates the other way for a target before the start", () => {
    // in view 0..2, target -1..1: span -1..2 centred in 8 starts at 2
    expect(loopShift(8, { first: 0, last: 2 }, { first: -1, last: 1 })).toBe(3);
  });

  it("returns null when the span needs more slides than the track has", () => {
    expect(loopShift(5, { first: 0, last: 3 }, { first: 4, last: 6 })).toBeNull();
  });
});
