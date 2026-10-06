import { describe, expect, it } from "vite-plus/test";
import { utilityRows } from "./utilities.ts";

describe("utilityRows", () => {
  it("describes a dual-mode spacing utility with breakpoint tiers", () => {
    const [px] = utilityRows(["px"]);
    expect(px).toMatchObject({
      name: "px",
      properties: "padding-inline",
      value: "scale number or length",
      tiers: ["breakpoints"],
      pseudo: true, // --before-px / --after-px
    });
  });

  it("describes a color utility with states and breakpoints and a pseudo form", () => {
    const [bg] = utilityRows(["bg"]);
    expect(bg.tiers).toEqual(["breakpoints", "states"]);
    expect(bg.pseudo).toBe(true);
  });

  it("names what a composite utility feeds and lists keyword shorthands", () => {
    const [shadow, fontWeight, w] = utilityRows(["shadow", "font-weight", "w"]);
    expect(shadow.properties).toBe("box-shadow");
    expect(shadow.keywords).toEqual(["2xs", "xs", "sm", "md", "lg", "xl", "2xl"]);
    expect(fontWeight.keywords).toEqual(expect.arrayContaining(["strong", "heading", "body"]));
    expect(w.keywords).toEqual(["auto", "fit-content", "min-content", "max-content"]);
  });

  it("flags tier-only utilities and rejects unknown names", () => {
    const [opacity, p, shadow, rounded] = utilityRows(["opacity", "p", "shadow", "rounded"]);
    expect(opacity.tierOnly).toBe(true);
    expect(p.tierOnly).toBe(false);
    expect(shadow.tierOnly).toBe(true);
    expect(rounded.tierOnly).toBe(false); // no tiers at all
    expect(() => utilityRows(["nope"])).toThrow(/not in the kit/);
  });
});
