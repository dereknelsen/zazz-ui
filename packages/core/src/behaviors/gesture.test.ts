// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the gesture module's pure release math: the velocity
 * window, boundary resistance, the dismiss decision, and the flick duration.
 * Pointer tracking itself (`trackDrag`) needs a real engine and is covered by
 * the toaster and drawer browser tests.
 */

import { describe, expect, it } from "vite-plus/test";
import {
  createVelocityTracker,
  flickDuration,
  pickSnap,
  rubberBand,
  shouldDismiss,
} from "./gesture.ts";

describe("createVelocityTracker", () => {
  it("reads zero with fewer than two samples or no elapsed time", () => {
    const tracker = createVelocityTracker();
    expect(tracker.velocity()).toEqual({ x: 0, y: 0 });
    tracker.add(0, 10, 10);
    expect(tracker.velocity()).toEqual({ x: 0, y: 0 });
    tracker.add(0, 50, 50);
    expect(tracker.velocity()).toEqual({ x: 0, y: 0 });
  });

  it("measures signed px/ms on each axis", () => {
    const tracker = createVelocityTracker();
    tracker.add(0, 0, 100);
    tracker.add(50, 25, 50);
    expect(tracker.velocity()).toEqual({ x: 0.5, y: -1 });
  });

  it("forgets what the pointer did more than 100ms ago", () => {
    const tracker = createVelocityTracker();
    // a fast flick, then a hold: the release reads the hold
    tracker.add(0, 0, 0);
    tracker.add(20, 0, 200);
    tracker.add(300, 0, 200);
    expect(tracker.velocity().y).toBe(0);
    // a hold, then a flick: the release reads the flick
    tracker.add(600, 0, 200);
    tracker.add(620, 0, 240);
    expect(tracker.velocity().y).toBe(2);
  });
});

describe("rubberBand", () => {
  it("follows less the further it goes and never passes the limit", () => {
    const near = rubberBand(10, 40);
    const far = rubberBand(100, 40);
    const extreme = rubberBand(100_000, 40);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(10);
    expect(far - near).toBeLessThan(90 * (near / 10));
    expect(extreme).toBeLessThan(40);
  });

  it("keeps the sign and is still at the boundary", () => {
    expect(rubberBand(-30, 40)).toBe(-rubberBand(30, 40));
    expect(rubberBand(0, 40)).toBe(0);
    expect(rubberBand(30, 0)).toBe(0);
  });
});

describe("shouldDismiss", () => {
  const thresholds = { distance: 45, velocityThreshold: 0.11 };

  it("dismisses past the distance, however slowly", () => {
    expect(shouldDismiss({ offset: 60, velocity: 0, ...thresholds })).toBe(true);
    expect(shouldDismiss({ offset: 44, velocity: 0, ...thresholds })).toBe(false);
  });

  it("dismisses a fast flick over a short distance", () => {
    expect(shouldDismiss({ offset: 8, velocity: 0.5, ...thresholds })).toBe(true);
  });

  it("does not dismiss a pointer flicking back toward rest", () => {
    expect(shouldDismiss({ offset: 80, velocity: -0.5, ...thresholds })).toBe(false);
  });

  it("never dismisses from the wrong side of rest", () => {
    expect(shouldDismiss({ offset: -80, velocity: 2, ...thresholds })).toBe(false);
    expect(shouldDismiss({ offset: 0, velocity: 2, ...thresholds })).toBe(false);
  });
});

describe("flickDuration", () => {
  it("is the time the remaining travel takes at the release speed", () => {
    expect(flickDuration(300, 1, 500)).toBe(300);
    expect(flickDuration(300, -1, 500)).toBe(300);
  });

  it("stays between the visible floor and the element's own duration", () => {
    expect(flickDuration(300, 0.1, 500)).toBe(500);
    expect(flickDuration(10, 5, 500)).toBe(120);
    expect(flickDuration(300, 0, 500)).toBe(500);
  });

  it("stays instant when the element's duration is zero (reduced motion)", () => {
    expect(flickDuration(300, 1, 0)).toBe(0);
    expect(flickDuration(300, 0, 0)).toBe(0);
  });
});

describe("pickSnap", () => {
  // a 600px drawer with snap points at 150px, 300px, and full height
  const stops = [450, 300, 0];
  const size = 600;
  const pick = (position: number, velocity: number, active: number, sequential = false) =>
    pickSnap({ stops, position, velocity, active, size, sequential });

  it("settles on the nearest stop when released slowly", () => {
    expect(pick(370, 0, 1)).toBe(1);
    expect(pick(390, 0, 1)).toBe(0);
    expect(pick(120, 0, 1)).toBe(2);
  });

  it("moves one stop with a flick over a short distance", () => {
    expect(pick(280, -0.8, 1)).toBe(2);
    expect(pick(320, 0.8, 1)).toBe(0);
    // already at the far end: a flick away from dismissal stays there
    expect(pick(10, -0.8, 2)).toBe(2);
  });

  it("dismisses on a flick toward dismissal from the first stop", () => {
    expect(pick(470, 0.8, 0)).toBe(-1);
  });

  it("skips to the far end or dismisses on a very fast flick", () => {
    expect(pick(430, -2.5, 0)).toBe(2);
    expect(pick(20, 2.5, 2)).toBe(-1);
  });

  it("moves one stop at a time when sequential", () => {
    expect(pick(430, -2.5, 0, true)).toBe(1);
    expect(pick(20, 2.5, 2, true)).toBe(1);
  });

  it("past the first stop, dismisses on enough travel unless the pointer is heading back", () => {
    // the first stop shows 150px: 25% of that is 37.5px
    expect(pick(480, 0, 0)).toBe(0);
    expect(pick(490, 0, 0)).toBe(-1);
    expect(pick(560, -0.8, 0)).toBe(1);
    expect(pickSnap({ stops, position: 560, velocity: -0.5, active: 0, size, flick: 1 })).toBe(-1);
  });

  it("with one stop, behaves as a plain dismissal decision", () => {
    const one = (position: number, velocity: number) =>
      pickSnap({ stops: [0], position, velocity, active: 0, size: 400 });
    expect(one(40, 0)).toBe(0);
    expect(one(120, 0)).toBe(-1);
    expect(one(20, 0.8)).toBe(-1);
    expect(one(120, -0.8)).toBe(0);
  });
});
