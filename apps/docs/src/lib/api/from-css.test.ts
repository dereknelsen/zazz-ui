import { UTILITIES } from "@zazz-ui/core/base/utilities.ts";
import { describe, expect, it } from "vite-plus/test";
import { fromCssRows } from "./from-css.ts";

describe("fromCssRows", () => {
  const rows = fromCssRows();
  const byProperty = new Map(rows.map((row) => [row.property, row]));

  it("lists every property a utility writes exactly once, with that utility", () => {
    for (const utility of UTILITIES) {
      for (const property of utility.properties) {
        const row = byProperty.get(property);
        expect(row, property).toBeDefined();
        expect(row!.utilities, property).toContain(`--${utility.name}`);
      }
    }
    expect(new Set(rows.map((row) => row.property)).size).toBe(rows.length);
  });

  it("finds the Tailwind name from the CSS one", () => {
    expect(byProperty.get("justify-content")?.utilities).toEqual(["--justify"]);
    expect(byProperty.get("align-items")?.utilities).toEqual(["--items"]);
    expect(byProperty.get("border-radius")?.utilities).toEqual(["--rounded"]);
    expect(byProperty.get("color")?.utilities).toEqual(["--text"]);
    expect(byProperty.get("line-height")?.utilities).toEqual(["--leading"]);
  });

  it("maps physical names to the logical property the kit writes", () => {
    expect(byProperty.get("width")?.utilities).toEqual(byProperty.get("inline-size")?.utilities);
    expect(byProperty.get("padding-left")?.utilities).toEqual(["--pl"]);
    expect(byProperty.get("border-bottom")?.utilities).toEqual(["--border-b"]);
    expect(byProperty.get("width")?.note).toContain("inline-size");
  });

  it("covers the composites that write no property of their own", () => {
    expect(byProperty.get("box-shadow")?.utilities).toContain("--shadow");
    expect(byProperty.get("flex-direction")?.utilities).toContain("--display: flex-col");
    expect(byProperty.get("background-image")?.utilities).toContain("--bg-stops");
  });

  it("is sorted by property", () => {
    const names = rows.map((row) => row.property);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
