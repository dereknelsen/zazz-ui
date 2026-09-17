"use strict";

/**
 * @fileoverview Guards the 0.5.0 token contract of `_variables.css` — the
 * `--space-*` scale, the deprecated `--gap-*` aliases, the `--breakpoint-*`
 * lengths and the typed `--bp-*` / `--screen-*` breakpoint flags with their
 * width thresholds — plus the sweep invariants the rest of `src/` and
 * `examples/` must hold once the consumers migrate off the old names
 * (skipped until the owning tickets land; see each `it.skip`).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const BASE = dirname(fileURLToPath(import.meta.url));
const SRC = join(BASE, "..");
const EXAMPLES = join(SRC, "..", "examples");
const VARIABLES = readFileSync(join(BASE, "_variables.css"), "utf8");

/** One breakpoint scale, shared by `--breakpoint-*`, `--bp-*` and `--screen-*`. */
const THRESHOLDS = { sm: 40, md: 48, lg: 64, xl: 80, "2xl": 96 } as const;
const SIZES = Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[];

/** `--space-*` are step multiples (spec.md amendment), not literal rem. */
const SPACE_STEPS = {
  "2xs": 1,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 11,
  xl: 24,
  "2xl": 40,
} as const;

/** The xs…xl subset that 0.4.1 shipped as `--gap-*`; aliased until 0.6.0. */
const GAP_SIZES = ["xs", "sm", "md", "lg", "xl"];

interface SourceFile {
  /** Path relative to the tree root, for failure messages. */
  path: string;
  text: string;
}

/**
 * @description Reads every file under `root` (recursively) with one of the
 * given extensions.
 *
 * @param root - Directory to walk.
 * @param extensions - File extensions to keep, with the leading dot.
 * @returns The matching files in path order.
 * @private
 */
function readTree(root: string, extensions: string[]): SourceFile[] {
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter((path) => extensions.some((ext) => path.endsWith(ext)))
    .sort()
    .map((path) => ({ path, text: readFileSync(join(root, path), "utf8") }));
}

/**
 * @description Lists every `path:line` in `files` whose line matches `pattern`.
 *
 * @param files - Files to scan.
 * @param pattern - What must not appear.
 * @returns Offending locations, empty when the tree is clean.
 * @private
 */
function offenders(files: SourceFile[], pattern: RegExp): string[] {
  return files.flatMap(({ path, text }) =>
    text
      .split("\n")
      .map((line, index) => (pattern.test(line) ? `${path}:${index + 1}` : null))
      .filter((hit): hit is string => hit !== null),
  );
}

/**
 * @description Builds a matcher for a custom-property declaration and its value.
 *
 * @param name - The property, e.g. `--space-md`.
 * @param value - The exact declared value.
 * @returns A multiline regex for `name: value;` at the start of a line.
 * @private
 */
function declaration(name: string, value: string): RegExp {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escape(name)}:\\s*${escape(value)};`, "m");
}

/**
 * @description Builds a matcher for a boolean-flag `@property` registration.
 *
 * @param name - The property, e.g. `--bp-sm`.
 * @returns A regex for the exact typed shape style() queries rely on.
 * @private
 */
function flagRegistration(name: string): RegExp {
  return new RegExp(
    `@property ${name} \\{\\s*syntax: "true \\| false";\\s*inherits: true;\\s*initial-value: false;\\s*\\}`,
  );
}

/**
 * @description Collects the `flag → rem threshold` pairs a family of setters
 * declares, so the map can be compared whole (right flag per width, no extras).
 *
 * @param setter - Global regex whose two groups capture the rem number and the flag.
 * @returns The thresholds keyed by flag name.
 * @private
 */
function thresholds(setter: RegExp): Record<string, number> {
  return Object.fromEntries(
    [...VARIABLES.matchAll(setter)].map((match) => [match[2], Number(match[1])]),
  );
}

describe("_variables.css spacing", () => {
  it("declares --space-2xs…2xl as step multiples", () => {
    for (const [size, step] of Object.entries(SPACE_STEPS)) {
      expect(VARIABLES).toMatch(declaration(`--space-${size}`, `var(--step-${step})`));
    }
  });

  it("declares --gap-xs…xl only as var(--space-*) aliases", () => {
    const declared = [...VARIABLES.matchAll(/^\s*(--gap-[\w-]+):\s*([^;]+);/gm)].map((match) => [
      match[1],
      match[2],
    ]);
    expect(declared).toEqual(GAP_SIZES.map((size) => [`--gap-${size}`, `var(--space-${size})`]));
  });
});

describe("_variables.css breakpoints", () => {
  it("declares --breakpoint-sm…2xl on the shifted scale, without --breakpoint-xs", () => {
    for (const [size, rem] of Object.entries(THRESHOLDS)) {
      expect(VARIABLES).toMatch(declaration(`--breakpoint-${size}`, `${rem}rem`));
    }
    expect(VARIABLES).not.toContain("--breakpoint-xs");
  });

  it("registers five typed --bp-* and five --screen-* flags", () => {
    for (const size of SIZES) {
      expect(VARIABLES).toMatch(flagRegistration(`--bp-${size}`));
      expect(VARIABLES).toMatch(flagRegistration(`--screen-${size}`));
    }
    expect(VARIABLES.match(/@property --bp-/g)).toHaveLength(5);
    expect(VARIABLES.match(/@property --screen-/g)).toHaveLength(5);
  });

  it("sets each --bp-* flag from the nearest size container at its width", () => {
    // Unnamed @container query on every body descendant (not the viewport).
    const setters = thresholds(
      /@container \(width >= (\d+)rem\) \{\s*:where\(body \*\) \{\s*(--bp-[\w]+): true;/g,
    );
    expect(setters).toEqual(
      Object.fromEntries(SIZES.map((size) => [`--bp-${size}`, THRESHOLDS[size]])),
    );
  });

  it("sets each --screen-* flag from the viewport at its width", () => {
    const setters = thresholds(
      /@media \(width >= (\d+)rem\) \{\s*:root \{\s*(--screen-[\w]+): true;/g,
    );
    expect(setters).toEqual(
      Object.fromEntries(SIZES.map((size) => [`--screen-${size}`, THRESHOLDS[size]])),
    );
  });

  it("no longer mentions --is-breakpoint", () => {
    expect(VARIABLES).not.toContain("--is-breakpoint");
  });
});

describe("consumer sweep", () => {
  const otherCss = readTree(SRC, [".css"]).filter(({ path }) => !path.endsWith("_variables.css"));

  // Ticket 04 (_utilities.css) and ticket 05 (_layout.css) move the style()
  // queries onto --bp-*; flip this on once both are resolved.
  it.skip("reads no --is-breakpoint flag outside _variables.css", () => {
    expect(offenders(otherCss, /--is-breakpoint/)).toEqual([]);
  });

  // Tickets 04 (_utilities.css), 05 (_layout.css) and 06 (base + primitives)
  // rewrite --gap-* reads to --space-*; flip this on once all three are resolved.
  it.skip("reads no deprecated --gap-xs…xl alias outside _variables.css", () => {
    expect(offenders(otherCss, /var\(--gap-(xs|sm|md|lg|xl)\b/)).toEqual([]);
  });

  // Tickets 04/05 drop the @xs / @max-xs class prefixes from the CSS; ticket 27
  // (repo-wide codemod run) shifts the markup in src/ and examples/. Flip this
  // on once ticket 27 is resolved.
  it.skip("uses no @xs / @max-xs prefix anywhere in src/ or examples/", () => {
    const files = [...readTree(SRC, [".css", ".html"]), ...readTree(EXAMPLES, [".html"])];
    expect(offenders(files, /@(max-)?xs\b/)).toEqual([]);
  });
});
