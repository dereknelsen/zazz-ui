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
      "pile",
      "truncate",
      "not-prose",
      "spin",
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

  it("harvests dataset reads written as destructuring", () => {
    expect(attribute("data-toaster-duration")).toBeDefined();
    expect(attribute("data-toaster-close-button")).toBeDefined();
  });

  it("lists slots that only a script looks up", () => {
    const slots = attribute("data-carousel-slot")?.values.map((v) => v.name);
    expect(slots).toEqual(expect.arrayContaining(["dots", "dot"]));
  });

  it("offers values after the colon: design tokens for token utilities, keywords for keyword utilities", () => {
    const values = (name: string) =>
      css.properties.find((property) => property.name === name)?.values?.map((v) => v.name) ?? [];
    expect(values("--px")).toEqual(expect.arrayContaining(["2", "4", "6"]));
    expect(values("--px")).not.toContain("var(--space-md)");
    expect(values("--px--md")).toContain("6");
    expect(values("--basis")).not.toContain("6");
    expect(values("--m")).toContain("auto");
    expect(values("--w")).toEqual(expect.arrayContaining(["fit-content", "6"]));
    expect(values("--bg")).toContain("var(--color-primary)");
    expect(values("--bg--hover")).toContain("var(--color-primary)");
    expect(values("--rounded")).toContain("var(--radius-md)");
    expect(values("--text")).toContain("var(--color-primary)");
    expect(values("--font-size")).toContain("var(--font-size-lg)");
    expect(values("--shadow")).toContain("var(--shadow-md)");
    expect(values("--border-b")).toEqual(expect.arrayContaining(["var(--color-primary)"]));
    expect(values("--display")).toEqual(expect.arrayContaining(["grid", "flex", "none"]));
    expect(values("--items")).toEqual(expect.arrayContaining(["center", "start"]));
    expect(values("--band")).toEqual(expect.arrayContaining(["layout-lg", "layout-bleed"]));
  });

  it("harvests config the scripts read through the typeahead engine and dataset", () => {
    const names = html.globalAttributes.map((a) => a.name);
    for (const name of [
      // typeahead engine keys, crossed with each subclass's slot prefix
      "data-command-filter",
      "data-command-sort",
      "data-command-min-length",
      "data-command-value",
      "data-combobox-sort",
      "data-combobox-filter",
      "data-combobox-min-length",
      "data-combobox-keywords",
      "data-autocomplete-filter",
      "data-autocomplete-min-length",
      // reveal's camelCase dataset reads
      "data-reveal-step",
      "data-reveal-duration",
      "data-reveal-ease",
      "data-reveal-wait",
      "data-reveal-distance",
      "data-reveal-scale",
      "data-reveal-margin",
      "data-reveal-threshold",
    ]) {
      expect(names, name).toContain(name);
    }
    // a subclass's own config key stays with that subclass
    expect(names).toContain("data-combobox-variant");
    expect(names).not.toContain("data-command-variant");
  });

  it("lists the pseudo-only utilities on both sides", () => {
    expect(cssNames).toContain("--before-content");
    expect(cssNames).toContain("--after-content");
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

  it("gives the linter the identities and state hooks <ui-debug> reads from the stylesheets", () => {
    const { lint } = generateEditorData();
    expect(lint.identities).toEqual(expect.arrayContaining(["button", "field-group", "dialog"]));
    expect(lint.hooks.button).toEqual(expect.arrayContaining(["bg--hover", "text--active"]));
  });

  it("gives the language server identity owners, headers, hooks, and resolved tokens", () => {
    const { language } = generateEditorData();
    expect(language.identities["dialog"]).toEqual({
      primitive: "dialog",
      file: "primitives/dialog/dialog.css",
    });
    expect(language.identities["radio-group"]?.primitive).toBe("radio");
    expect(language.identities["field"]?.primitive).toBe("fields");
    expect(language.identities["prose"]?.primitive).toBeNull();
    expect(language.tags["ui-carousel"]).toBe("carousel");
    expect(language.primitives["primitives/dialog/dialog.css"]?.tags["presets"]).toEqual([
      'data-dialog-size="article | container | screen"',
    ]);
    expect(language.hooks["--ui-button-bg"]).toEqual({
      value: "var(--color-background)",
      file: "primitives/button/button.css",
    });
    expect(language.tokens["--space-md"]).toMatchObject({ min: "1.35rem", max: "1.5rem" });
    expect(language.tokens["--color-primary"]?.light).toMatch(/^oklch\(/);
  });

  it("matches the committed files", () => {
    for (const [path, text] of Object.entries(EDITOR_FILES(generateEditorData()))) {
      expect(readFileSync(join(ROOT, path), "utf8"), path).toBe(text);
    }
  });
});
