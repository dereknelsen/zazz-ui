// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the OTP field's pure derivations (`primitives/otp/otp.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { isComplete, parseGroups, resolveSlots, sanitizeOtp } from "./otp.ts";

describe("parseGroups", () => {
  it("defaults to one run", () => {
    expect(parseGroups(null, 6)).toEqual([6]);
  });

  it("splits well-formed groups", () => {
    expect(parseGroups("3-3", 6)).toEqual([3, 3]);
    expect(parseGroups("2-2-2", 6)).toEqual([2, 2, 2]);
  });

  it("falls back when groups don't sum to the length", () => {
    expect(parseGroups("3-4", 6)).toEqual([6]);
    expect(parseGroups("junk", 6)).toEqual([6]);
    expect(parseGroups("0-6", 6)).toEqual([6]);
  });
});

describe("sanitizeOtp", () => {
  it("strips non-digits for numeric", () => {
    expect(sanitizeOtp("1a2b3c", "numeric", 6)).toBe("123");
  });

  it("strips digits for alpha", () => {
    expect(sanitizeOtp("a1b2", "alpha", 6)).toBe("ab");
  });

  it("keeps letters and digits for alphanumeric", () => {
    expect(sanitizeOtp("a1-b2!", "alphanumeric", 6)).toBe("a1b2");
  });

  it("only strips whitespace for none", () => {
    expect(sanitizeOtp("a 1-b", "none", 6)).toBe("a1-b");
  });

  it("clamps pasted overflow to the length", () => {
    expect(sanitizeOtp("123 456 789", "numeric", 6)).toBe("123456");
  });
});

describe("resolveSlots", () => {
  it("mirrors characters and the caret cell", () => {
    const slots = resolveSlots("12", 4, 2, true, false);
    expect(slots.map((slot) => slot.char)).toEqual(["1", "2", "", ""]);
    expect(slots.map((slot) => slot.filled)).toEqual([true, true, false, false]);
    expect(slots.map((slot) => slot.active)).toEqual([false, false, true, false]);
  });

  it("keeps the last cell active when the code is full", () => {
    const slots = resolveSlots("1234", 4, 4, true, false);
    expect(slots[3].active).toBe(true);
  });

  it("has no active cell without focus", () => {
    expect(resolveSlots("12", 4, 2, false, false).every((slot) => !slot.active)).toBe(true);
  });

  it("masks filled cells only", () => {
    const slots = resolveSlots("12", 4, 2, true, true);
    expect(slots.map((slot) => slot.char)).toEqual(["•", "•", "", ""]);
  });
});

describe("isComplete", () => {
  it("requires every cell filled", () => {
    expect(isComplete("123456", 6)).toBe(true);
    expect(isComplete("12345", 6)).toBe(false);
    expect(isComplete("", 0)).toBe(false);
  });
});
