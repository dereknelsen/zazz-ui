import { describe, expect, it } from "vite-plus/test";
import {
  FONT_CATEGORIES,
  LOCAL_FONTS,
  SCALE_STEPS,
  fontStack,
  googleFontsHref,
  pairFont,
  pickGoogleFonts,
  type FontOption,
} from "./fonts.ts";

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
  it("takes the first N of each offered category, in the API's order", () => {
    const items = [
      item("Roboto", "sans-serif"),
      item("Lobster", "display"),
      item("Lora", "serif"),
      item("Pacifico", "handwriting"),
      item("Inter", "sans-serif"),
      item("Fira Code", "monospace"),
      item("Open Sans", "sans-serif"),
      item("Caveat", "handwriting"),
      item("Bebas Neue", "display"),
      item("Anton", "display"),
    ];
    const picked = pickGoogleFonts(items, 2);
    expect(picked.map((f) => f.google)).toEqual([
      "Roboto",
      "Lobster",
      "Lora",
      "Inter",
      "Fira Code",
      "Bebas Neue",
    ]);
    expect(picked[0]).toMatchObject({
      value: "Roboto",
      label: "Roboto",
      category: "sans-serif",
      google: "Roboto",
      stack: '"Roboto", var(--font-sans-fallback)',
    });
  });

  it("takes seven of each category by default", () => {
    const items = FONT_CATEGORIES.flatMap((category) =>
      Array.from({ length: 9 }, (_, i) => item(`${category} ${i}`, category)),
    );
    const picked = pickGoogleFonts(items);
    for (const category of FONT_CATEGORIES) {
      expect(picked.filter((f) => f.category === category)).toHaveLength(7);
    }
  });

  it("skips handwriting and any category the builder has no group for", () => {
    expect(pickGoogleFonts([item("Caveat", "handwriting"), item("Odd", "symbols")])).toEqual([]);
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
    expect(fontStack("Lobster", "display")).toBe('"Lobster", var(--font-sans-fallback)');
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

describe("pairFont", () => {
  const font = (family: string, category: FontOption["category"]): FontOption => ({
    value: family,
    label: family,
    category,
    stack: fontStack(family, category),
    google: family,
  });
  const options = [
    font("Inter", "sans-serif"),
    font("Roboto", "sans-serif"),
    font("Lora", "serif"),
    font("Roboto Slab", "serif"),
    font("Lobster", "display"),
    font("Fira Code", "monospace"),
  ];
  const byName = (name: string) => options.find((f) => f.value === name)!;
  /** Every font `pairFont` can return across the whole random range. */
  const reachable = (role: "heading" | "body", other: FontOption | null) =>
    new Set(
      Array.from(
        { length: 200 },
        (_, i) => pairFont(role, other, options, undefined, () => i / 200)?.value,
      ),
    );

  it("never gives body text a display face", () => {
    for (const heading of [...options, null]) {
      const bodies = reachable("body", heading);
      expect(bodies.has("Lobster")).toBe(false);
    }
  });

  it("contrasts the classification: a serif heading gets a sans body", () => {
    const bodies = reachable("body", byName("Lora"));
    expect(bodies.has("Inter")).toBe(true);
    expect(bodies.has("Lora")).toBe(false);
  });

  it("puts a serif or a display face over the default sans body", () => {
    const headings = reachable("heading", null);
    expect(headings.has("Lora")).toBe(true);
    expect(headings.has("Lobster")).toBe(true);
    expect(headings.has("Fira Code")).toBe(false);
  });

  it("favors the other font's superfamily", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const pick = pairFont("heading", byName("Roboto"), options, undefined, () => i / 200);
      counts.set(pick!.value, (counts.get(pick!.value) ?? 0) + 1);
    }
    expect(counts.get("Roboto Slab")).toBeGreaterThan(counts.get("Lora") ?? 0);
  });

  it("reads numbered cuts as one superfamily", () => {
    const cuts = [font("Redaction 10", "serif"), font("Inter", "sans-serif")];
    const counts = { kin: 0, other: 0 };
    for (let i = 0; i < 200; i++) {
      const pick = pairFont(
        "body",
        font("Redaction 35", "display"),
        cuts,
        undefined,
        () => i / 200,
      );
      counts[pick!.value === "Inter" ? "other" : "kin"]++;
    }
    expect(counts.kin).toBeGreaterThan(counts.other);
  });

  it("moves off the current choice and never doubles the other font", () => {
    for (let i = 0; i < 200; i++) {
      const pick = pairFont("body", byName("Inter"), options, "Roboto", () => i / 200);
      expect(pick?.value).not.toBe("Roboto");
      expect(pick?.value).not.toBe("Inter");
    }
  });

  it("is null when nothing pairs", () => {
    expect(pairFont("body", null, [font("Lobster", "display")], undefined)).toBeNull();
  });
});
