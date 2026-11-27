/**
 * @fileoverview Per-primitive data: every hook, attribute, slot, state, identity,
 * and tag in the editor data lands in exactly one primitive's file.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { PRIMITIVES } from "../src/manifest.ts";
import { generateEditorData } from "./generate-editor-data.ts";
import { ownerOf } from "./language-data.ts";
import { hookCategory, PRIMITIVE_FILES, primitiveData } from "./primitive-data.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** A primitive's hooks without their categories. */
const flat = (hooks: Record<string, Record<string, string>>) =>
  Object.assign({}, ...Object.values(hooks)) as Record<string, string>;

describe("primitive data", () => {
  const { html, language } = generateEditorData();
  const data = primitiveData(html, language);

  it("has one entry per manifest primitive", () => {
    expect(Object.keys(data)).toEqual(Object.keys(PRIMITIVES).sort());
  });

  it("gives the typography roles to font, as the values of data-font", () => {
    const font = data["font"]!;
    expect(font.identities).toEqual([]);
    expect(font.attributes["data-font"]).toEqual(
      expect.arrayContaining(["display", "h1", "h6", "2xl", "md", "2xs", "eyebrow"]),
    );
    expect(font.attributes["data-font"]).toHaveLength(15);
    expect(font.files.css).toEqual(["primitives/font/font.css"]);
    expect(data["link"]!.identities).toEqual(["link"]);
  });

  it("gives every identity an owner, and none is a text-* role", () => {
    const owned = Object.values(data).flatMap((p) => p.identities);
    expect(owned.sort()).toEqual(Object.keys(language.identities).sort());
    expect(owned.filter((token) => token.startsWith("text-"))).toEqual([]);
  });

  it("groups hooks by the CSS property category of the utility they back", () => {
    expect(hookCategory("--ui-card-bg")).toBe("Color & Backgrounds");
    expect(hookCategory("--ui-card-p")).toBe("Box Model & Sizing");
    expect(hookCategory("--ui-card-header-w")).toBe("Box Model & Sizing");
    expect(hookCategory("--ui-card-shadow")).toBe("Visual Effects");
    expect(hookCategory("--ui-button-bg--hover")).toBe("Color & Backgrounds");
    // not a utility, but a CSS property by name
    expect(hookCategory("--ui-dialog-transition-timing-function")).toBe("Transforms & Animation");
    // a part name that happens to be a property (offset is motion path) is not one
    expect(hookCategory("--ui-slider-thumb-offset")).toBe("Layout & Positioning");
    // a hook whose name says nothing about its property is pinned to where it is applied
    expect(hookCategory("--ui-drawer-stack-lift")).toBe("Transforms & Animation");
    expect(hookCategory("--ui-layout-gutters")).toBe("Layout & Positioning");
    expect(hookCategory("--ui-layout-available")).toBe("Box Model & Sizing");
    expect(hookCategory("--ui-nope-thing")).toBe("Misc");
    // every hook the kit ships has a category
    for (const primitive of Object.values(data)) expect(primitive.hooks).not.toHaveProperty("Misc");
    // the kit's own words for a property: a duration, an ease, an accent color
    expect(hookCategory("--ui-reveal-global-duration")).toBe("Transforms & Animation");
    expect(hookCategory("--ui-carousel-settle-ease")).toBe("Transforms & Animation");
    expect(hookCategory("--ui-toaster-accent")).toBe("Color & Backgrounds");
    expect(hookCategory("--ui-tooltip-font-settings")).toBe("Typography");
    // a name that ends like a utility it does not back
    expect(hookCategory("--ui-reveal-global-shrink")).toBe("Transforms & Animation");
    expect(hookCategory("--ui-tabs-underline-width")).toBe("Borders & Outlines");
    expect(Object.keys(data["card"]!.hooks)).toEqual([
      "Layout & Positioning",
      "Box Model & Sizing",
      "Color & Backgrounds",
      "Borders & Outlines",
      "Visual Effects",
    ]);
  });

  it("describes a primitive: summary, identities, tags, hooks, attributes, slots, files", () => {
    const card = data["card"]!;
    expect(card.name).toBe("card");
    expect(card.summary).toMatch(/^card\.css: Card/);
    expect(card.identities).toEqual(["card"]);
    expect(card.tags).toEqual(["ui-card"]);
    expect(card.hooks["Color & Backgrounds"]).toMatchObject({ "--ui-card-bg": "transparent" });
    expect(card.attributes).toEqual({
      "data-card-orientation": ["horizontal", "vertical"],
      "data-card-variant": ["floating", "muted", "outline"],
    });
    expect(card.slots).toEqual({ "data-card-slot": ["body", "footer", "header"] });
    expect(card.states).toEqual({});
    expect(card.requires).toEqual(PRIMITIVES["card"]!.primitives);
    expect(card.files.css).toEqual(["primitives/card/card.css"]);
  });

  it("separates states from slots and attributes", () => {
    expect(data["carousel"]!.states["data-carousel-state"]).toContain("dragging");
    expect(data["carousel"]!.attributes).not.toHaveProperty("data-carousel-state");
    expect(data["carousel"]!.attributes).toHaveProperty("data-carousel-loop", []);
  });

  it("owns an attribute by its longest matching identity, tag, or primitive name", () => {
    expect(data["button-group"]!.attributes).toHaveProperty("data-button-group-orientation");
    expect(data["button"]!.attributes).not.toHaveProperty("data-button-group-orientation");
    expect(data["select"]!.identities).toEqual(["multiselect", "select"]);
    expect(data["select"]!.slots).toHaveProperty("data-multiselect-slot");
    expect(data["fields"]!.slots).toHaveProperty("data-field-slot");
    expect(data["drawer"]!.states).toHaveProperty("data-drawer-indent-state");
    expect(data["reveal"]!.attributes).toHaveProperty("data-reveal");
  });

  it("gives a base-layer primitive its identity and hooks", () => {
    expect(data["prose"]!.identities).toEqual(["prose"]);
    expect(flat(data["prose"]!.hooks)["--ui-prose-flow"]).toBe("1");
  });

  it("places every hook and every data-<name>-<key> attribute exactly once", () => {
    const all = Object.values(data);
    const hooks = all.flatMap((p) => Object.keys(flat(p.hooks)));
    expect(hooks.sort()).toEqual(Object.keys(language.hooks).sort());
    const attributes = all.flatMap((p) => [
      ...Object.keys(p.attributes),
      ...Object.keys(p.slots),
      ...Object.keys(p.states),
    ]);
    // page-level globals belong to no primitive; anything else unowned is a bug
    const page = [
      "data-draggable",
      "data-navigation",
      "data-navigation-persist",
      "data-navigation-persist-mode",
      "data-theme",
      "data-ui",
    ];
    const kit = html.globalAttributes.map((a) => a.name).filter((n) => !page.includes(n));
    expect(attributes.sort()).toEqual(kit.sort());
    expect(new Set(attributes).size).toBe(attributes.length);
    expect(all.flatMap((p) => p.tags).sort()).toEqual(html.tags.map((t) => t.name).sort());
  });

  it("files a hook under the primitive it is named for, with that primitive's default", () => {
    expect(flat(data["dialog"]!.hooks)["--ui-dialog-shadow"]).toBe("var(--shadow-lg)");
    expect(flat(data["alert-dialog"]!.hooks)).not.toHaveProperty("--ui-dialog-shadow");
    expect(flat(data["popover"]!.hooks)).toHaveProperty("--ui-popover-p");
    expect(flat(data["navigation-menu"]!.hooks)).not.toHaveProperty("--ui-popover-p");
    expect(flat(data["kbd"]!.hooks)).toHaveProperty("--ui-kbd-min-h");
    for (const [name, primitive] of Object.entries(data))
      for (const hook of Object.keys(flat(primitive.hooks)))
        expect(ownerOf(hook.replace(/^--ui-/, ""), language) ?? name, hook).toBe(name);
  });

  it("lists the shared scripts a primitive's behavior needs", () => {
    expect(data["reveal"]!.files.base).toEqual(PRIMITIVES["reveal"]!.base);
  });

  it("throws on a hook no primitive owns", () => {
    const orphan = { ...language, hooks: { "--ui-nope-bg": { value: "red", file: "base/x.css" } } };
    expect(() => primitiveData(html, orphan)).toThrow(/--ui-nope-bg/);
  });

  it("throws on a tag form no primitive owns", () => {
    const orphan = {
      ...html,
      tags: [...html.tags, { name: "ui-nope", description: "", attributes: [] }],
    };
    expect(() => primitiveData(orphan, language)).toThrow(/ui-nope/);
  });

  it("throws on a data attribute no primitive owns", () => {
    const orphan = {
      ...html,
      globalAttributes: [...html.globalAttributes, { name: "data-nope-size", values: [] }],
    };
    expect(() => primitiveData(orphan, language)).toThrow(/data-nope-size/);
  });

  it("throws on an identity no primitive owns", () => {
    const orphan = {
      ...language,
      identities: { ...language.identities, nope: { primitive: null, file: "base/x.css" } },
    };
    expect(() => primitiveData(html, orphan)).toThrow(/data-ui="nope"/);
  });

  it("refuses a name two primitives claim", () => {
    const clash = {
      identities: { ...language.identities, card: { primitive: "dialog", file: "x.css" } },
      tags: {},
    };
    expect(() => ownerOf("card-variant", clash)).toThrow(/card.*dialog|dialog.*card/);
    expect(ownerOf("button-group-orientation", language)).toBe("button-group");
    expect(ownerOf("nope-size", language)).toBeUndefined();
    // the same identities under other tag forms are another lookup
    const { identities } = language;
    expect(ownerOf("nope-size", { identities, tags: {} })).toBeUndefined();
    expect(ownerOf("nope-size", { identities, tags: { "ui-nope": "card" } })).toBe("card");
  });

  it("leaves no stray .json beside the primitives", () => {
    const generated = Object.keys(PRIMITIVE_FILES(data)).sort();
    const onDisk = readdirSync(join(ROOT, "src/primitives"), { recursive: true, encoding: "utf8" })
      .filter((path) => path.endsWith(".json"))
      .map((path) => `src/primitives/${path}`)
      .sort();
    expect(onDisk).toEqual(generated);
  });
});
