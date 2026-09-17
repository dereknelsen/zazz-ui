"use strict";

/**
 * @fileoverview Drift guard for the style prop registry (`props.ts`) and the
 * generated `_properties.css` — the frozen 44-name contract, the 264
 * registrations it expands to, the `syntax: "*"` / `inherits: false` shape of
 * every registration, and the rule that no prop name collides with a token
 * `_variables.css` already declares (a registered name would re-scope that
 * token to `inherits: false` and break every `var()` read on a descendant).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { BREAKPOINTS, PROPS, propNames, propertiesCss } from "./props.ts";

const SRC = dirname(fileURLToPath(import.meta.url));
const PROPERTIES_CSS = readFileSync(join(SRC, "base", "_properties.css"), "utf8");
const VARIABLES_CSS = readFileSync(join(SRC, "base", "_variables.css"), "utf8");

/** The frozen list (.scratch/style-props/spec.md), by family, in order. */
const FROZEN: Record<string, string[]> = {
  spacing: "p px py ps pe pt pb m mx my ms me mt mb gap gap-x gap-y".split(" "),
  sizing: "w h min-w max-w min-h max-h size".split(" "),
  grid: "grid-cols grid-rows col-span row-span".split(" "),
  flex: "basis grow shrink order".split(" "),
  color: "bg text border-color".split(" "),
  typography: "text-size line-height letter-spacing".split(" "),
  position: "top right bottom left inset z".split(" "),
};

/** Every `@property` block in the generated file: name → descriptor body. */
function registrations(css: string): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const match of css.matchAll(/@property\s+(--[a-z0-9-]+)\s*\{([^}]*)\}/g)) {
    blocks.set(match[1], match[2]);
  }
  return blocks;
}

describe("registry", () => {
  it("is the frozen 44-name list, by family and in order", () => {
    const byFamily: Record<string, string[]> = {};
    for (const prop of PROPS) (byFamily[prop.family] ??= []).push(prop.name);
    expect(byFamily).toEqual(FROZEN);
    expect(PROPS).toHaveLength(44);
  });

  it("uses unique, unprefixed Tailwind roots", () => {
    const names = PROPS.map((prop) => prop.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(name).not.toMatch(/^(ui-|_)/);
      // A breakpoint is the only suffix a prop takes; a root can't end in one.
      expect(name).not.toMatch(/-(sm|md|lg|xl|2xl)$/);
    }
  });

  it("multiplies spacing by the interval and passes everything else through", () => {
    for (const prop of PROPS) {
      expect(prop.kind, prop.name).toBe(prop.family === "spacing" ? "step" : "raw");
    }
  });

  it("drives a property on every entry", () => {
    for (const prop of PROPS) {
      expect(prop.property, prop.name).toMatch(/^[a-z-]+(, [a-z-]+)*$/);
    }
  });

  it("suffixes the sm…2xl breakpoint scale", () => {
    expect(BREAKPOINTS).toEqual(["sm", "md", "lg", "xl", "2xl"]);
  });

  it("propNames() yields base + one per breakpoint = 264, in registry order", () => {
    const names = [...propNames()];
    expect(names).toHaveLength(264);
    expect(new Set(names).size).toBe(264);
    expect(names.slice(0, 6)).toEqual(["--p", "--p-sm", "--p-md", "--p-lg", "--p-xl", "--p-2xl"]);
    expect(names.at(-1)).toBe("--z-2xl");
  });
});

describe("_properties.css", () => {
  it("equals the generator output (regenerate with `vp run properties`)", () => {
    expect(PROPERTIES_CSS).toBe(propertiesCss());
  });

  it("registers exactly the 264 prop names", () => {
    const registered = registrations(PROPERTIES_CSS);
    expect(registered.size).toBe(264);
    expect([...registered.keys()]).toEqual([...propNames()]);
  });

  it('registers every prop as syntax "*", inherits: false, no initial-value', () => {
    for (const [name, body] of registrations(PROPERTIES_CSS)) {
      const descriptors = body
        .split(";")
        .map((line) => line.trim())
        .filter(Boolean);
      expect(descriptors, name).toEqual(['syntax: "*"', "inherits: false"]);
    }
  });

  it("opens with a CSSDoc header that declares @layer none", () => {
    expect(PROPERTIES_CSS.startsWith("/**\n * _properties.css")).toBe(true);
    expect(PROPERTIES_CSS).toMatch(/^ \* @layer\s+none/m);
    expect(PROPERTIES_CSS).toContain("GENERATED");
  });

  it("groups registrations under one comment per family", () => {
    for (const family of Object.keys(FROZEN)) {
      expect(PROPERTIES_CSS).toContain(`/* ${family} — `);
    }
  });
});

describe("collisions", () => {
  it("never registers a --ui-* or --_* name", () => {
    for (const name of propNames()) {
      expect(name).not.toMatch(/^--(ui-|_)/);
    }
  });

  it("never registers a name _variables.css already declares", () => {
    // A token declared in _variables.css (`--x:` on :root, or a typed
    // `@property --x`) must keep its default inheritance; registering the same
    // name here as `inherits: false` would make `var(--x)` guaranteed-invalid
    // on every element below :root.
    const declared = new Set<string>();
    for (const match of VARIABLES_CSS.matchAll(/(?:^|[\s{;])(--[a-z0-9-]+)\s*:/gm)) {
      declared.add(match[1]);
    }
    for (const match of VARIABLES_CSS.matchAll(/@property\s+(--[a-z0-9-]+)/g)) {
      declared.add(match[1]);
    }
    const collisions = [...propNames()].filter((name) => declared.has(name));
    expect(collisions, `declared in _variables.css: ${collisions.join(", ")}`).toEqual([]);
  });
});
