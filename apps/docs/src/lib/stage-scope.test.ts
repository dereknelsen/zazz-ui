import languageData from "@zazz-ui/core/editor/zazz.language-data.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { declaredProperties, stageScope } from "./stage-scope.ts";

const kit = {
  "--multiplier": { value: "1" },
  "--radius-md": { value: "calc(0.5rem * var(--multiplier))" },
  "--ui-card-radius": { value: "var( --radius-md )" },
  "--multiplier-other": { value: "2" },
  "--ui-button-gap": { value: "var(--multiplier-other)" },
};

describe("declaredProperties", () => {
  it("lists each declared property once and skips comments", () => {
    const css = ":root { /* --not-this: 1; */ --a: 1; --b: var(--c); } .x { --a: 2 }";
    expect(declaredProperties(css)).toEqual(["--a", "--b"]);
  });
});

describe("stageScope", () => {
  it("restores the property and everything that reads it, however indirectly", () => {
    expect(stageScope(":root { --multiplier: 0.3 }", kit)).toBe(
      "@layer zazz.variables { [data-preview-stage] { " +
        "--multiplier: 1; --radius-md: calc(0.5rem * var(--multiplier)); " +
        "--ui-card-radius: var( --radius-md ); } }",
    );
  });

  it("targets another selector when given one", () => {
    expect(stageScope(":root { --multiplier-other: 3 }", kit, ".preview")).toBe(
      "@layer zazz.variables { .preview { --multiplier-other: 2; --ui-button-gap: var(--multiplier-other); } }",
    );
  });

  it("takes property names in place of a stylesheet", () => {
    expect(stageScope(["--multiplier-other"], kit, ".preview")).toBe(
      stageScope(":root { --multiplier-other: 3 }", kit, ".preview"),
    );
  });

  it("leaves out properties the kit does not define", () => {
    expect(stageScope(":root { --site-own: 1 }", kit)).toBe(
      "@layer zazz.variables { [data-preview-stage] {  } }",
    );
  });

  it("covers the site's look with the real kit data", () => {
    const look = readFileSync(new URL("../styles/site-look.css", import.meta.url), "utf8");
    const kitData: Record<string, { value: string }> = {
      ...languageData.tokens,
      ...languageData.hooks,
    };
    const rule = stageScope(look, kitData);
    // A property of the site's own (not a kit token) has no default to restore.
    for (const name of declaredProperties(look)) {
      if (name in kitData) expect(rule).toContain(`${name}: ${kitData[name]!.value};`);
    }
    expect(rule).toContain("--radius-md: ");
    expect(rule).toContain("--tracking-h1: ");
    expect(rule).toContain("--ui-card-corner-shape: var(--radius-corner-shape);");
    // Nothing the look sets feeds the spacing unit.
    expect(rule).not.toContain("--spacing: ");
  });
});
