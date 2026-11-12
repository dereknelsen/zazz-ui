import { describe, expect, it } from "vite-plus/test";
import {
  FONT_CATEGORIES,
  LOCAL_FONTS,
  SCALE_STEPS,
  fontStack,
  googleFontsHref,
  CURATED_FONTS,
  FONT_PAIRINGS,
  pairFont,
  pickGoogleFonts,
  randomPairing,
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

describe("CURATED_FONTS", () => {
  it("offers seven unique families in each category", () => {
    for (const category of FONT_CATEGORIES) {
      expect(new Set(CURATED_FONTS[category]).size).toBe(7);
    }
  });

  it("pairs every curated family it recommends from the same list", () => {
    const all = FONT_CATEGORIES.flatMap((c) => CURATED_FONTS[c]);
    for (const [heading, body] of FONT_PAIRINGS) {
      expect(all).toContain(heading);
      expect(all).toContain(body);
    }
  });

  it("puts every sans and serif in at least one recommended pairing", () => {
    const paired = new Set(FONT_PAIRINGS.flat());
    for (const family of [...CURATED_FONTS["sans-serif"], ...CURATED_FONTS.serif]) {
      expect(paired).toContain(family);
    }
  });
});

describe("pickGoogleFonts", () => {
  const curated = {
    "sans-serif": ["Inter", "Roboto"],
    serif: ["Lora"],
    monospace: ["Fira Code"],
  };

  it("takes only the curated families, in curated order, with the curated category", () => {
    const items = [
      item("Roboto", "sans-serif"),
      item("Lobster", "display"),
      item("Lora", "serif"),
      item("Inter", "sans-serif"),
      item("Fira Code", "display"),
      item("Open Sans", "sans-serif"),
    ];
    const picked = pickGoogleFonts(items, curated);
    expect(picked.map((f) => f.google)).toEqual(["Inter", "Roboto", "Lora", "Fira Code"]);
    expect(picked[0]).toMatchObject({
      value: "Inter",
      label: "Inter",
      category: "sans-serif",
      google: "Inter",
      stack: '"Inter", var(--font-sans-fallback)',
    });
    expect(picked.at(-1)?.category).toBe("monospace");
  });

  it("leaves out a curated family the API does not list", () => {
    expect(pickGoogleFonts([item("Lora", "serif")], curated).map((f) => f.google)).toEqual([
      "Lora",
    ]);
  });

  it("requests only the kit's weights the family ships, with regular as 400", () => {
    const [font] = pickGoogleFonts(
      [item("Inter", "sans-serif", ["regular", "500", "italic", "900"])],
      curated,
    );
    expect(font.weights).toEqual([400, 500]);
  });

  it("drops a family that ships none of the wanted weights", () => {
    expect(pickGoogleFonts([item("Lora", "serif", ["100", "italic"])], curated)).toEqual([]);
  });

  it("defaults to CURATED_FONTS", () => {
    const items = FONT_CATEGORIES.flatMap((c) => CURATED_FONTS[c].map((f) => item(f, c)));
    expect(pickGoogleFonts(items)).toHaveLength(21);
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
    font("Fira Code", "monospace"),
    font("Outfit", "sans-serif"),
    font("Castoro", "serif"),
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

  it("never gives body text a monospace face over a sans or serif heading", () => {
    for (const heading of [...options.filter((f) => f.category !== "monospace"), null]) {
      expect(reachable("body", heading).has("Fira Code")).toBe(false);
    }
  });

  it("contrasts the classification: a serif heading gets a sans body", () => {
    const bodies = reachable("body", byName("Castoro"));
    expect(bodies.has("Inter")).toBe(true);
    expect(bodies.has("Castoro")).toBe(false);
  });

  it("puts a serif over the default sans body, never a monospace", () => {
    const headings = reachable("heading", null);
    expect(headings.has("Lora")).toBe(true);
    expect(headings.has("Fira Code")).toBe(false);
  });

  it("favors the recommended pairings, in both directions", () => {
    const tally = (role: "heading" | "body", other: string) => {
      const counts = new Map<string, number>();
      for (let i = 0; i < 400; i++) {
        const pick = pairFont(role, byName(other), options, undefined, () => i / 400)!;
        counts.set(pick.value, (counts.get(pick.value) ?? 0) + 1);
      }
      return counts;
    };
    // Lora + Outfit and Castoro + Inter are recommended.
    const underLora = tally("body", "Lora");
    expect(underLora.get("Outfit")!).toBeGreaterThan(200);
    const overInter = tally("heading", "Inter");
    expect(overInter.get("Castoro")!).toBeGreaterThan(200);
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
      const pick = pairFont("body", font("Redaction 35", "serif"), cuts, undefined, () => i / 200);
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
    expect(pairFont("body", null, [font("Fira Code", "monospace")], undefined)).toBeNull();
  });
});

describe("randomPairing", () => {
  const font = (family: string, category: FontOption["category"]): FontOption => ({
    value: family,
    label: family,
    category,
    stack: fontStack(family, category),
    google: family,
  });
  const options = [
    font("Lora", "serif"),
    font("Outfit", "sans-serif"),
    font("Inter", "sans-serif"),
    font("Fira Code", "monospace"),
  ];
  /** A random source that hands out `values` in turn. */
  const sequence = (...values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  it("takes a recommended pairing most of the time", () => {
    let recommended = 0;
    for (let i = 0; i < 100; i++) {
      const pick = randomPairing(options, sequence(i / 100, 0.5, 0.5));
      if (pick?.heading.value === "Lora" && pick.body?.value === "Outfit") recommended++;
    }
    expect(recommended).toBeGreaterThanOrEqual(75);
  });

  it("otherwise pairs a random heading", () => {
    const pick = randomPairing(options, sequence(0.9, 0.99, 0.5));
    expect(pick?.heading.value).toBe("Fira Code");
    expect(pick?.body?.category).toBe("sans-serif");
  });

  it("skips pairings whose fonts are not on offer", () => {
    const pick = randomPairing([font("Inter", "sans-serif"), font("Lora", "serif")], () => 0);
    expect(pick?.heading.value).toBe("Inter");
  });

  it("is null with nothing on offer", () => {
    expect(randomPairing([])).toBeNull();
  });
});
