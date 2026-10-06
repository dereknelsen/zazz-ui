/**
 * @fileoverview `formatStyleValue()`: utilities in cascade order (family, then
 * emission order, tiers after their base), then pseudo forms, hooks, and raw
 * CSS, one per line.
 */

import { describe, expect, it } from "vite-plus/test";
import { formatStyleValue, orderDeclarations, scanDeclarations } from "./style-format.ts";

const order = (...declarations: string[]) => orderDeclarations(declarations);

describe("style format", () => {
  it("orders utilities by family: flow, grid, spacing, margin, sizing, typography, color, effects, box", () => {
    expect(
      order(
        "--z: 1",
        "--shadow: md",
        "--bg: red",
        "--text-transform: uppercase",
        "--w: 4",
        "--mx: auto",
        "--p: 4",
        "--grid-cols: 3",
        "--display: grid",
      ),
    ).toEqual([
      "--display: grid",
      "--grid-cols: 3",
      "--p: 4",
      "--mx: auto",
      "--w: 4",
      "--text-transform: uppercase",
      "--bg: red",
      "--shadow: md",
      "--z: 1",
    ]);
  });

  it("puts shorthands first within a family, and tiers right after their base", () => {
    expect(
      order("--py: 2", "--px--lg: 6", "--p: 4", "--px: 4", "--px--md: 5", "--px--sm: 1"),
    ).toEqual(["--p: 4", "--px: 4", "--px--sm: 1", "--px--md: 5", "--px--lg: 6", "--py: 2"]);
  });

  it("orders states as the cascade does, then group forms", () => {
    expect(order("--group-bg--hover: c", "--bg--hover: b", "--bg--active: a", "--bg: red")).toEqual(
      ["--bg: red", "--bg--active: a", "--bg--hover: b", "--group-bg--hover: c"],
    );
  });

  it("leads each utility with its starting tier, ahead of the base", () => {
    expect(
      order(
        "--translate: 0",
        "--opacity--hover: 0.8",
        "--opacity: 1",
        "--translate--starting: 0 1rem",
        "--opacity--starting: 0",
      ),
    ).toEqual([
      "--opacity--starting: 0",
      "--opacity: 1",
      "--opacity--hover: 0.8",
      "--translate--starting: 0 1rem",
      "--translate: 0",
    ]);
  });

  it("puts pseudo forms after the element's utilities, then hooks, then raw CSS in source order", () => {
    expect(
      order(
        "padding-left: 2px",
        "--after-bg: red",
        "--ui-button-bg: blue",
        "--before-content: 'x'",
        "padding: 0",
        "--w: 4",
        "--before-w: 2",
      ),
    ).toEqual([
      "--w: 4",
      "--before-w: 2",
      "--before-content: 'x'",
      "--after-bg: red",
      "--ui-button-bg: blue",
      "padding-left: 2px",
      "padding: 0",
    ]);
  });

  it("keeps a repeated name's last declaration last", () => {
    expect(order("--w: 1", "--p: 2", "--w: 3")).toEqual(["--p: 2", "--w: 1", "--w: 3"]);
  });

  it("lays out, normalizes, and orders in one pass", () => {
    expect(formatStyleValue("--text:red;--display : flex", "  ")).toBe(
      "\n    --display: flex;\n    --text: red;\n  ",
    );
    expect(formatStyleValue(" --px:6 ; ", "")).toBe("--px: 6");
  });

  it("does not split on semicolons inside parentheses or quotes", () => {
    expect(formatStyleValue(`--before-content: ";"; --bg: url("a;b")`, "")).toBe(
      `\n  --bg: url("a;b");\n  --before-content: ";";\n`,
    );
  });

  it("formats an already formatted style to the same text", () => {
    const once = formatStyleValue("--gap: var(--space-md); --p: 4", "  ");
    expect(formatStyleValue(once, "  ")).toBe(once);
  });

  it("scans declarations with the offsets of their name, colon, and value", () => {
    const text = ` --p : 4 ; --bg: url("a;b") ;--w`;
    const scanned = scanDeclarations(text);
    expect(scanned.map((d) => [d.name, d.value, text.slice(...d.span)])).toEqual([
      ["--p", "4", "--p : 4"],
      ["--bg", `url("a;b")`, `--bg: url("a;b")`],
      ["--w", "", "--w"],
    ]);
    expect(text.slice(...scanned[0]!.nameSpan)).toBe("--p");
    expect(text[scanned[0]!.colon]).toBe(":");
    expect(text.slice(...scanned[1]!.valueSpan)).toBe(`url("a;b")`);
    expect(scanned[2]!.colon).toBe(-1);
    expect(scanned[2]!.valueSpan).toEqual([text.length, text.length]);
  });
});
