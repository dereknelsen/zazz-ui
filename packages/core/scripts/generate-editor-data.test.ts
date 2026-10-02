/**
 * @fileoverview Editor custom data: the generated HTML and
 * CSS custom-data files enumerate every utility, tier form, `data-ui` token, and
 * `data-<name>-<key>` attribute with its values, and the committed files are fresh.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { UTILITIES, tiersOf } from "../src/base/utilities.ts";
import { generateEditorData, EDITOR_FILES } from "./generate-editor-data.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("editor custom data", () => {
  const { html, css } = generateEditorData();
  const cssNames = new Set(css.properties.map((property) => property.name));
  const attribute = (name: string) => html.globalAttributes.find((a) => a.name === name);
  const uiTokens = new Set((attribute("data-ui")?.values ?? []).map((v) => v.name));

  it("lists every utility and each of its tier forms as a CSS property", () => {
    for (const utility of UTILITIES) {
      expect(cssNames, utility.name).toContain(`--${utility.name}`);
      for (const tier of tiersOf(utility))
        expect(cssNames, utility.name).toContain(`--${utility.name}--${tier}`);
      if (utility.pseudo) expect(cssNames, utility.name).toContain(`--before-${utility.name}`);
      if (tiersOf(utility).includes("hover"))
        expect(cssNames, utility.name).toContain(`--group-${utility.name}--hover`);
    }
  });

  it("lists every data-ui token the kit declares or its fragments use", () => {
    for (const token of [
      "button",
      "layout",
      "prose",
      "text-h2",
      "sr-only",
      "grid-pile",
      "scroll-fade",
      "card",
    ]) {
      expect(uiTokens).toContain(token);
    }
  });

  it("lists presets with their values, slots, states, and the globals", () => {
    expect(attribute("data-button-variant")?.values.map((v) => v.name)).toContain("primary");
    expect(attribute("data-layout-size")?.values.map((v) => v.name)).toContain("xl");
    expect(attribute("data-dialog-slot")?.values.map((v) => v.name)).toContain("header");
    expect(attribute("data-carousel-state")?.values.map((v) => v.name)).toContain("active");
    expect(attribute("data-ui-theme")?.values.map((v) => v.name)).toEqual(["dark", "light"]);
    expect(attribute("data-ui-guard")?.values.map((v) => v.name)).toEqual(["off"]);
    expect(html.tags.map((tag) => tag.name)).toContain("ui-carousel");
  });

  it("offers values after the colon: design tokens for token utilities, keywords for keyword utilities", () => {
    const values = (name: string) =>
      css.properties.find((property) => property.name === name)?.values?.map((v) => v.name) ?? [];
    expect(values("--px")).toContain("var(--space-md)");
    expect(values("--px--md")).toContain("var(--space-md)");
    expect(values("--m")).toContain("auto");
    expect(values("--w")).toEqual(expect.arrayContaining(["fit-content", "var(--space-md)"]));
    expect(values("--bg")).toContain("var(--color-primary)");
    expect(values("--bg--hover")).toContain("var(--color-primary)");
    expect(values("--rounded")).toContain("var(--radius-md)");
    expect(values("--text")).toContain("var(--color-primary)");
    expect(values("--font-size")).toContain("var(--font-size-lg)");
    expect(values("--shadow")).toContain("var(--shadow-md)");
    expect(values("--border-b")).toEqual(
      expect.arrayContaining(["var(--color-primary)", "var(--space-2xs)"]),
    );
    expect(values("--display")).toEqual(expect.arrayContaining(["grid", "flex", "none"]));
    expect(values("--items")).toEqual(expect.arrayContaining(["center", "start"]));
    expect(values("--col")).toEqual(expect.arrayContaining(["layout-lg", "layout-bleed"]));
  });

  it("harvests no free-text values and no 0.4 names from prose", () => {
    const names = html.globalAttributes.map((a) => a.name);
    for (const stale of [
      "data-title",
      "data-description",
      "data-slot",
      "data-orientation",
      "data-stay-open",
      "data-label-hide",
      "data-gjs-type",
    ]) {
      expect(names, stale).not.toContain(stale);
    }
    expect(attribute("data-autocomplete-value")?.values ?? []).toEqual([]);
    expect(attribute("data-multiselect-placeholder")?.values ?? []).toEqual([]);
  });

  it("matches the committed files", () => {
    for (const [path, text] of Object.entries(EDITOR_FILES(generateEditorData()))) {
      expect(readFileSync(join(ROOT, path), "utf8"), path).toBe(text);
    }
  });
});
