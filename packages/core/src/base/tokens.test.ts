"use strict";

/**
 * @fileoverview The design-token contract in `_variables.css`: one spacing
 * scale (`--space-2xs … --space-2xl`, each a multiple of `--spacing`), every
 * sized family spans 2xs–2xl, and retired names are gone from the kit.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const variables = readFileSync(join(SRC, "base/_variables.css"), "utf8");
const declared = new Set([...variables.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));
const SIZES = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];

function kitFiles(dir = SRC): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.(css|ts|html)$/.test(path) && !/\.d\.ts$|\.test\.ts$/.test(path))
    .map((path) => join(dir, path));
}

describe("design tokens", () => {
  it.each([
    "space",
    "font-size",
    "leading",
    "tracking",
    "paragraph-spacing",
    "radius",
    "shadow",
    "article",
  ])("--%s-* spans 2xs to 2xl", (family) => {
    for (const size of SIZES)
      expect(declared, `--${family}-${size}`).toContain(`--${family}-${size}`);
  });

  it("has one spacing scale: each --space-* is a multiple of --spacing", () => {
    for (const size of SIZES) {
      expect(variables, size).toMatch(
        new RegExp(`--space-${size}:\\s*calc\\(var\\(--spacing\\) \\* [\\d.]+\\);`),
      );
    }
  });

  it("declares theme roles as --color-* directly: no bare shadcn role, no alias block", () => {
    expect(variables).toMatch(/--color-background:\s*light-dark\(/);
    expect(variables).toMatch(/--color-primary:\s*light-dark\(/);
    expect(variables).not.toMatch(/^\s*--(?:background|foreground|primary|card|muted|border):/m);
    expect(variables).not.toMatch(/--color-[\w-]+:\s*var\(--(?!color-)[a-z]/);
  });

  it("themes the focus ring through --color-ring; --ring is only a utility", () => {
    expect(variables).toMatch(/--color-ring:\s*var\(--color-primary\)/);
    expect(variables).not.toMatch(/^\s*--ring:/m);
    expect(variables).not.toMatch(/var\(--ring[,)]/);
  });

  it("drops tokens nothing reads: --default-transition-property, --font-weight-mono", () => {
    expect(declared).not.toContain("--default-transition-property");
    expect(declared).not.toContain("--font-weight-mono");
  });

  it("has no per-state decoration tokens: a primitive's state rule sets the base variable", () => {
    const stateTokens = [...declared].filter((name) => /^--decoration-[\w-]+--/.test(name));
    expect(stateTokens).toEqual([]);
    for (const path of kitFiles()) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/--decoration-[\w-]+--(?:hover|active)/);
    }
  });

  it("names directional utilities l/t/r/b: no start/end letters (--ps, --ms, --start, --border-s-*)", () => {
    const logical =
      /(?<![\w-])--_?(?:group-|before-|after-)?(?:ps|pe|ms|me|start|end|border-[se]-(?:width|color))(?=$|[^\w-]|--)|(?<![\w-])--_(?:ps|pe|ms|me|start|end|border-[se]-(?:width|color))-[\w-]+|--ui-[a-z-]+-(?:ps|pe|ms|me)(?![\w]|-[a-z0-9])/g;
    const offenders: string[] = [];
    for (const path of kitFiles()) {
      for (const m of readFileSync(path, "utf8").matchAll(logical)) {
        offenders.push(`${path.slice(SRC.length + 1)}: ${m[0]}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("retires --step-*, --gap-<size>, the spacing interval, --font-body/heading/mono, and --is-breakpoint-* everywhere in the kit", () => {
    const retired =
      /--step-\w+|--gap-(?:2xs|xs|sm|md|lg|xl|2xl)(?![\w-])|--_?spacing-interval|(?<!family)--font-(?:body|heading|mono)(?![\w-])|--is-breakpoint-/g;
    const offenders: string[] = [];
    for (const path of kitFiles()) {
      for (const m of readFileSync(path, "utf8").matchAll(retired)) {
        offenders.push(`${path.slice(SRC.length + 1)}: ${m[0]}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
