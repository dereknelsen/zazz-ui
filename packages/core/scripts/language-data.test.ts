/**
 * @fileoverview The language data's pieces: CSSDoc headers, token resolution
 * through var() / light-dark() / clamp(), and identity ownership.
 */

import { describe, expect, it } from "vite-plus/test";
import { evaluate, identityOwner, parseHeader, resolveToken } from "./language-data.ts";

describe("language data", () => {
  it("parses a CSSDoc header's summary and tags, joining continuation lines", () => {
    expect(
      parseHeader(
        `/**\n * x.css — X ([data-ui~="x"])\n *\n * @tokens     --ui-x-* (a long\n *             note)\n * @uses       a\n * @uses       b\n */`,
      ),
    ).toEqual({
      summary: 'x.css — X ([data-ui~="x"])',
      tags: { tokens: ["--ui-x-* (a long note)"], uses: ["a", "b"] },
    });
  });

  it("evaluates single-unit arithmetic and refuses mixed units", () => {
    expect(evaluate("calc(0.25rem * 6)")).toBe("1.5rem");
    expect(evaluate("calc((1rem + 2rem) / 2)")).toBe("1.5rem");
    expect(evaluate("calc(1rem + 2px)")).toBeUndefined();
    expect(evaluate("oklch(0.5 0 0)")).toBeUndefined();
  });

  it("resolves light-dark colors and clamp ranges through var()", () => {
    const defs = new Map([
      ["--white", "oklch(1 0 0)"],
      ["--black", "oklch(0 0 0)"],
      ["--spacing", "clamp(0.2rem, 1vi, 0.25rem)"],
    ]);
    expect(resolveToken("light-dark(var(--white), var(--black))", defs)).toEqual({
      light: "oklch(1 0 0)",
      dark: "oklch(0 0 0)",
    });
    expect(resolveToken("calc(var(--spacing) * 4)", defs)).toEqual({ min: "0.8rem", max: "1rem" });
  });

  it("owns an identity by manifest key, prefix, or its only stylesheet; base-only is null", () => {
    expect(identityOwner("dialog", ["primitives/dialog/dialog.css"])).toBe("dialog");
    expect(
      identityOwner("radio-group", ["primitives/fields/fields.css", "primitives/radio/radio.css"]),
    ).toBe("radio");
    expect(identityOwner("prose", ["base/_typography.css"])).toBeNull();
  });
});
