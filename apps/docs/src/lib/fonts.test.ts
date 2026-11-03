import { describe, expect, it } from "vite-plus/test";
import { LOCAL_FONTS, SCALE_STEPS, fontStack, googleFontsHref, pickGoogleFonts } from "./fonts.ts";

const item = (family: string, category: string, variants = ["regular", "700"]) => ({
  family,
  category,
  variants,
});

describe("SCALE_STEPS", () => {
  it("runs from the minor second to the octave in order", () => {
    const values = SCALE_STEPS.map((s) => s.value);
    expect(values[0]).toBe(1.067);
    expect(values.at(-1)).toBe(2);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it("includes the kit's defaults", () => {
    const values = SCALE_STEPS.map((s) => s.value);
    expect(values).toContain(1.125);
    expect(values).toContain(1.25);
  });
});

describe("LOCAL_FONTS", () => {
  it("offers every category with unique values", () => {
    const categories = new Set(LOCAL_FONTS.map((f) => f.category));
    expect(categories).toEqual(new Set(["sans-serif", "serif", "monospace"]));
    expect(new Set(LOCAL_FONTS.map((f) => f.value)).size).toBe(LOCAL_FONTS.length);
    expect(LOCAL_FONTS.every((f) => !f.google)).toBe(true);
  });
});

describe("pickGoogleFonts", () => {
  it("takes the first N of each kit category and skips the rest", () => {
    const items = [
      item("Roboto", "sans-serif"),
      item("Lobster", "display"),
      item("Lora", "serif"),
      item("Pacifico", "handwriting"),
      item("Inter", "sans-serif"),
      item("Fira Code", "monospace"),
      item("Open Sans", "sans-serif"),
    ];
    const picked = pickGoogleFonts(items, 2);
    expect(picked.map((f) => f.google)).toEqual(["Roboto", "Lora", "Inter", "Fira Code"]);
    expect(picked[0]).toMatchObject({
      value: "Roboto",
      label: "Roboto",
      category: "sans-serif",
      google: "Roboto",
      stack: '"Roboto", var(--font-sans-fallback)',
    });
  });

  it("requests only the kit's weights the family ships, with regular as 400", () => {
    const [font] = pickGoogleFonts([
      item("Inter", "sans-serif", ["regular", "500", "italic", "900"]),
    ]);
    expect(font.weights).toEqual([400, 500]);
  });

  it("skips icon fonts that the API files under monospace", () => {
    const picked = pickGoogleFonts([
      item("Material Icons", "monospace"),
      item("Material Symbols Outlined", "monospace"),
      item("Roboto Mono", "monospace"),
    ]);
    expect(picked.map((f) => f.google)).toEqual(["Roboto Mono"]);
  });

  it("drops a family that ships none of the wanted weights", () => {
    expect(pickGoogleFonts([item("Thin", "serif", ["100", "italic"])])).toEqual([]);
  });
});

describe("fontStack", () => {
  it("quotes the family ahead of the category's fallback", () => {
    expect(fontStack("Fira Code", "monospace")).toBe('"Fira Code", var(--font-mono-fallback)');
    expect(fontStack("Lora", "serif")).toBe('"Lora", var(--font-serif-fallback)');
  });
});

describe("googleFontsHref", () => {
  it("is null when no Google font is chosen", () => {
    expect(googleFontsHref([])).toBeNull();
    expect(googleFontsHref([{ weights: [400] }])).toBeNull();
  });

  it("builds one css2 URL with sorted, deduped families and merged weights", () => {
    const href = googleFontsHref([
      { google: "Open Sans", weights: [400, 600] },
      { google: "Fira Code", weights: [400] },
      { google: "Open Sans", weights: [700] },
    ]);
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400&family=Open+Sans:wght@400;600;700&display=swap",
    );
  });
});
