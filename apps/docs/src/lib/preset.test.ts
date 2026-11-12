import { describe, expect, it } from "vite-plus/test";
import { decodePreset, encodePreset, fontHash } from "./preset.ts";

/** Every control at the kit's default, as the form reports it. */
const DEFAULTS: Record<string, string> = {
  "primary-hex": "#0a0a0a",
  "neutral-hex": "#8b8b95",
  "bg-light": "white",
  "bg-dark": "900",
  "font-heading": "",
  "font-body": "",
  "scale-min": "1.125",
  "scale-max": "1.25",
  spacing: "0.25",
  radius: "1",
  "corner-shape": "1.3",
  "card-elevation": "1.5",
  "shadow-angle": "0",
  "shadow-intensity": "1",
  "shadow-blur": "1",
  "shadow-distance": "1",
  "shadow-color": "#000000",
};

const THEME: Record<string, string> = {
  ...DEFAULTS,
  "primary-hex": "#9a6420",
  "neutral-hex": "#b08850",
  "bg-light": "50",
  "bg-dark": "black",
  "font-heading": "Playfair Display",
  "font-body": "local:Georgia",
  "scale-min": "1.067",
  "scale-max": "1.414",
  spacing: "0.27",
  radius: "2.25",
  "corner-shape": "-1.5",
  "card-elevation": "4",
  "shadow-angle": "345",
  "shadow-intensity": "2.9",
  "shadow-blur": "0.1",
  "shadow-distance": "3",
  "shadow-color": "#00242c",
};

const FONTS = ["Inter", "Playfair Display", "local:Georgia"];

describe("encodePreset / decodePreset", () => {
  it("round-trips every control", () => {
    expect(decodePreset(encodePreset(THEME), FONTS)).toEqual(THEME);
    expect(decodePreset(encodePreset(DEFAULTS), FONTS)).toEqual(DEFAULTS);
  });

  it("is a short, URL-safe code", () => {
    const code = encodePreset(THEME);
    expect(code).toMatch(/^[0-9A-Za-z]+$/);
    expect(code.length).toBeLessThanOrEqual(28);
  });

  it("spells the same theme the same way", () => {
    expect(encodePreset({ ...THEME })).toBe(encodePreset(THEME));
    expect(encodePreset({ ...THEME, radius: "2" })).not.toBe(encodePreset(THEME));
  });

  it("keeps hex colors exact, in any spelling", () => {
    const code = encodePreset({ ...THEME, "primary-hex": "ABC" });
    expect(decodePreset(code, FONTS)?.["primary-hex"]).toBe("#aabbcc");
  });

  it("clamps a slider value outside its range to the nearest end", () => {
    const decoded = decodePreset(encodePreset({ ...THEME, spacing: "9" }), FONTS);
    expect(decoded?.spacing).toBe("2");
  });

  it("gives the default font when the family is not on offer any more", () => {
    const decoded = decodePreset(encodePreset(THEME), ["Inter"]);
    expect(decoded?.["font-heading"]).toBe("");
    expect(decoded?.["font-body"]).toBe("");
  });

  it("rejects codes it cannot read", () => {
    const code = encodePreset(THEME);
    expect(decodePreset("", FONTS)).toBeNull();
    expect(decodePreset(`${code}!`, FONTS)).toBeNull();
    expect(decodePreset(`z${code.slice(1)}`, FONTS)).toBeNull();
    expect(decodePreset(`${code}zzzzzzzzzz`, FONTS)).toBeNull();
  });
});

describe("fontHash", () => {
  it("is a non-zero 16-bit number, stable per family", () => {
    for (const family of FONTS) {
      const hash = fontHash(family);
      expect(hash).toBeGreaterThan(0);
      expect(hash).toBeLessThan(2 ** 16);
      expect(fontHash(family)).toBe(hash);
    }
    expect(fontHash("Inter")).not.toBe(fontHash("Lora"));
  });
});
