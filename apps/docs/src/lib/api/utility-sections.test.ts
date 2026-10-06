import { describe, expect, it } from "vite-plus/test";
import { readKitFile } from "../kit.ts";
import { UTILITY_SECTIONS, allUtilityNames, sectionOf } from "./utility-sections.ts";

describe("UTILITY_SECTIONS", () => {
  const filed = UTILITY_SECTIONS.flatMap((s) => s.utilities);

  it("files every utility in the kit's table exactly once", () => {
    const names = allUtilityNames();
    const missing = names.filter((n) => !filed.includes(n));
    const unknown = filed.filter((n) => !names.includes(n));
    const dupes = filed.filter((n, i) => filed.indexOf(n) !== i);
    expect({ missing, unknown, dupes }).toEqual({ missing: [], unknown: [], dupes: [] });
  });

  it("documents only utilities the generated stylesheets actually gate", () => {
    const css = [
      "flow",
      "grid",
      "spacing",
      "margin",
      "sizing",
      "typography",
      "color",
      "effects",
      "box",
      "pseudo",
    ]
      .map((f) => readKitFile(`base/_utilities-${f}.css`) ?? "")
      .join("\n");
    const ungated = filed.filter((n) => !new RegExp(`--(before-|after-)?${n}:`).test(css));
    expect(ungated).toEqual([]);
  });

  it("has unique ids and finds a utility's section", () => {
    const ids = UTILITY_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sectionOf("px")?.id).toBe("spacing");
    expect(sectionOf("ring")?.id).toBe("borders");
    expect(sectionOf("nope")).toBeUndefined();
  });
});
