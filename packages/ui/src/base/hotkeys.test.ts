// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for hotkey parsing and matching (`base/hotkeys.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { isBareKey, matchesHotkey, parseHotkey } from "./hotkeys.ts";

/**
 * @description Builds a KeyboardEvent with the given key and modifier state.
 *
 * @param key - The event key.
 * @param mods - Modifier flags to set.
 * @returns The synthetic event.
 */
function keyEvent(key: string, mods: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...mods });
}

describe("parseHotkey", () => {
  it("parses a bare key", () => {
    expect(parseHotkey("k")).toEqual({
      key: "k",
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
      mod: false,
    });
  });

  it("parses modifiers case-insensitively", () => {
    expect(parseHotkey("Mod+Shift+P")).toEqual({
      key: "p",
      ctrl: false,
      alt: false,
      shift: true,
      meta: false,
      mod: true,
    });
  });

  it("accepts modifier aliases", () => {
    expect(parseHotkey("cmd+option+x")).toMatchObject({ meta: true, alt: true, key: "x" });
    expect(parseHotkey("control+k")).toMatchObject({ ctrl: true, key: "k" });
  });

  it("rejects unknown modifiers and empty specs", () => {
    expect(parseHotkey("hyper+k")).toBeNull();
    expect(parseHotkey("")).toBeNull();
    expect(parseHotkey(" + ")).toBeNull();
  });

  it("parses named keys", () => {
    expect(parseHotkey("mod+enter")).toMatchObject({ key: "enter", mod: true });
  });
});

describe("matchesHotkey", () => {
  const modK = parseHotkey("mod+k");
  if (!modK) throw new Error("fixture failed to parse");

  it("resolves mod to Meta on Apple platforms", () => {
    expect(matchesHotkey(keyEvent("k", { metaKey: true }), modK, true)).toBe(true);
    expect(matchesHotkey(keyEvent("k", { ctrlKey: true }), modK, true)).toBe(false);
  });

  it("resolves mod to Control elsewhere", () => {
    expect(matchesHotkey(keyEvent("k", { ctrlKey: true }), modK, false)).toBe(true);
    expect(matchesHotkey(keyEvent("k", { metaKey: true }), modK, false)).toBe(false);
  });

  it("requires exact modifier state", () => {
    expect(matchesHotkey(keyEvent("k", { metaKey: true, shiftKey: true }), modK, true)).toBe(false);
  });

  it("matches keys case-insensitively", () => {
    expect(matchesHotkey(keyEvent("K", { metaKey: true, shiftKey: false }), modK, true)).toBe(true);
  });
});

describe("isBareKey", () => {
  it("identifies unmodified hotkeys", () => {
    const bare = parseHotkey("k");
    const modded = parseHotkey("mod+k");
    if (!bare || !modded) throw new Error("fixture failed to parse");
    expect(isBareKey(bare)).toBe(true);
    expect(isBareKey(modded)).toBe(false);
  });
});
