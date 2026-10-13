import { describe, expect, it } from "vite-plus/test";
import { plainValue, scanDeclarations, splitDeclarations } from "./declarations.ts";

describe("scanDeclarations", () => {
  it("splits on top-level semicolons only", () => {
    expect(splitDeclarations(`--p: 4; --bg: url("a;b"); --w: var(--x, calc(1px; 2px))`)).toEqual([
      "--p: 4",
      '--bg: url("a;b")',
      "--w: var(--x, calc(1px; 2px))",
    ]);
  });

  it("reads !important as the priority and strips it from the plain value", () => {
    const [bg, p] = scanDeclarations("--bg: red !important; --p: 4");
    expect(bg).toMatchObject({ name: "--bg", value: "red !important", priority: "important" });
    expect(plainValue(bg!)).toBe("red");
    expect(p).toMatchObject({ name: "--p", value: "4", priority: "" });
    expect(plainValue(p!)).toBe("4");
  });
});
