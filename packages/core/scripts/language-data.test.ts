/**
 * @fileoverview The language data's pieces: CSSDoc headers, token resolution
 * through var() / light-dark() / clamp() / pow(), and identity ownership.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import {
  evaluate,
  identityOwner,
  languageData,
  parseHeader,
  resolveToken,
} from "./language-data.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

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

  it("evaluates pow() inside calc()", () => {
    expect(evaluate("calc(1rem * pow(1.25, 2))")).toBe("1.5625rem");
    expect(evaluate("calc(2rem * pow(calc(1 + 0.5 * (3 - 1)), 3))")).toBe("16rem");
    expect(evaluate("pow(2rem, 2)")).toBeUndefined();
  });

  it("resolves a fluid type step to its ends through --fluid", () => {
    const defs = new Map([
      ["--fluid", "clamp(0, tan(atan2(100vi - var(--fluid-min), var(--fluid-max))), 1)"],
      ["--typeset-scale", "calc(1.125 + var(--fluid) * (1.25 - 1.125))"],
      ["--typeset-base", "calc(1rem + var(--fluid) * (1rem - 1rem))"],
    ]);
    expect(resolveToken("calc(var(--typeset-base) * pow(var(--typeset-scale), 7))", defs)).toEqual({
      min: "2.2807rem",
      max: "4.7684rem",
    });
  });

  it("resolves the kit's type scale from the global controls, not a prose preset's", () => {
    const sheets = readdirSync(SRC, { recursive: true, encoding: "utf8" })
      .filter((path) => path.endsWith(".css"))
      .map((path) => join(SRC, path));
    const { tokens, hooks } = languageData(sheets, SRC);
    expect(tokens["--font-size-h1"]).toMatchObject({ min: "2.2807rem", max: "4.7684rem" });
    expect(tokens["--font-size-md"]).toMatchObject({ min: "1rem", max: "1rem" });
    expect(tokens["--leading-md"]?.value).toBe("1.6");
    expect(hooks["--ui-prose-flow"]?.value).toBe("1");
    expect(tokens["--spacing"]).toMatchObject({ min: "0.225rem", max: "0.25rem" });
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
