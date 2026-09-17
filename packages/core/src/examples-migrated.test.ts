"use strict";

/**
 * @fileoverview Guards that the example pages and the primitive demos are
 * fully migrated to the 0.5.0 names: no `from` string of a
 * `migrations/0.5.0.json` rule that 0.5.0 retired survives in
 * `examples/*.html` or `src/primitives/** /*.html` (ticket 27 ran the codemod,
 * ticket 28 hand-converted the examples, ticket 34 checks).
 *
 * The rules are one simultaneous map, and most families are chain shifts
 * (`--breakpoint-sm → --breakpoint-md`, `@sm: → @md:`, `data-container=sm →
 * data-container=md`), so a `from` name that is also another rule's `to` is a
 * valid 0.5.0 name: seeing `data-container="sm"` in a page cannot tell a
 * migrated `xs` from an unmigrated `sm`. The sweep therefore splits the rules:
 *
 * - *retired* names (`from` of some rule, `to` of none) no longer exist in the
 *   kit and must not appear anywhere: every `--is-breakpoint-*`, every old
 *   `--gap-*` size token, the `xs` end of each shifted family;
 * - *live* names (the `to` of a sibling rule of the same kind) are skipped;
 *   the retired count is pinned so a new rule family cannot slip past the
 *   sweep unnoticed, and the retired set stays the complete list of what can
 *   be checked textually.
 *
 * Matching per rule kind: `token` as `--name` bounded by anything but a word
 * character or dash (only as a `var(--name)` read when the name is also a
 * registered style prop: `--gap-lg` is the `--gap` prop at lg, ticket 09),
 * `class` as a whole class name inside a `class="…"`
 * attribute, `class-prefix` as the prefix at the start of a class name inside
 * `class="…"`, `attr-value` as the literal `name="value"` attribute. A second,
 * looser pass reports the retired class names and prefixes anywhere in the
 * text (captions, comments, `<code>`), since ticket 27 rewrote that prose by
 * hand. Failures list `path:line`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { type Rule, loadRules } from "../../cli/src/migrate.ts";
import { propNames } from "./props.ts";

const SRC = dirname(fileURLToPath(import.meta.url));
/** Every registered style prop, base and responsive forms (`--gap`, `--gap-lg`, …). */
const STYLE_PROPS = new Set(propNames());
const PACKAGE = join(SRC, "..");
const EXAMPLES = join(PACKAGE, "examples");
const PRIMITIVES = join(SRC, "primitives");

const RULES = loadRules(
  readFileSync(join(PACKAGE, "migrations", "0.5.0.json"), "utf8"),
  "migrations/0.5.0.json",
);

/** Every rule the codemod applies mechanically (`manual` needles are advice). */
const MECHANICAL = RULES.rules.filter(
  (rule): rule is Rule & { to: string } => rule.kind !== "manual" && rule.to !== undefined,
);

interface SourceFile {
  /** Path relative to the package root, for failure messages. */
  path: string;
  text: string;
}

/**
 * @description Reads every `.html` file under `root`, recursively or not.
 *
 * @param root - Directory to read.
 * @param recursive - Whether to descend into subdirectories.
 * @returns The files in path order.
 * @private
 */
function readHtml(root: string, recursive: boolean): SourceFile[] {
  return readdirSync(root, { recursive })
    .map(String)
    .filter((path) => path.endsWith(".html"))
    .sort()
    .map((path) => ({
      path: relative(PACKAGE, join(root, path)),
      text: readFileSync(join(root, path), "utf8"),
    }));
}

/**
 * @description Escapes a literal for use inside a regex.
 *
 * @param text - The literal.
 * @returns The escaped source.
 * @private
 */
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @description Lists every `path:line` in `files` whose line matches `pattern`.
 *
 * @param files - Files to scan.
 * @param pattern - What must not appear (no `g` flag needed).
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
 * @description Lists every `path:line` where a `class="…"` attribute holds a
 * class name that `matches`. An attribute may span lines; the line reported is
 * the one the attribute starts on.
 *
 * @param files - Files to scan.
 * @param matches - Predicate over one class name.
 * @returns Offending locations, empty when the tree is clean.
 * @private
 */
function classOffenders(files: SourceFile[], matches: (name: string) => boolean): string[] {
  return files.flatMap(({ path, text }) =>
    [...text.matchAll(/\bclass="([^"]*)"/g)]
      .filter((match) => (match[1] ?? "").split(/\s+/).some(matches))
      .map((match) => `${path}:${text.slice(0, match.index).split("\n").length}`),
  );
}

/**
 * @description The regex that finds one rule's `from` in raw text, by kind.
 *
 * @param rule - A mechanical rule.
 * @returns The matcher for its `from`.
 * @private
 */
function needle(rule: Rule): RegExp {
  switch (rule.kind) {
    case "token":
      // A retired token that shares its name with a style prop (`--gap-lg` is
      // the `--gap` prop at lg) is only a leftover as a read: `--gap-lg: 3` in
      // a style attribute is the prop, `var(--gap-lg)` the old size token.
      return STYLE_PROPS.has(rule.from)
        ? new RegExp(`var\\(\\s*${escape(rule.from)}(?![\\w-])`)
        : new RegExp(`(?<![\\w-])${escape(rule.from)}(?![\\w-])`);
    case "attr-value": {
      const [name, value] = rule.from.split("=");
      return new RegExp(`\\b${escape(name ?? "")}="${escape(value ?? "")}"`);
    }
    case "class-prefix":
      return new RegExp(`(?<![\\w-])${escape(rule.from)}`);
    default:
      return new RegExp(`(?<![\\w-])${escape(rule.from)}(?![\\w-])`);
  }
}

const FILES = [...readHtml(EXAMPLES, false), ...readHtml(PRIMITIVES, true)];
const TARGETS = new Set(MECHANICAL.map((rule) => `${rule.kind}:${rule.to}`));
const retired = MECHANICAL.filter((rule) => !TARGETS.has(`${rule.kind}:${rule.from}`));
const live = MECHANICAL.filter((rule) => TARGETS.has(`${rule.kind}:${rule.from}`));
const ofKind = (kind: Rule["kind"]): Rule[] => retired.filter((rule) => rule.kind === kind);

describe("examples-migrated: the sweep's inputs", () => {
  it("scans the example pages and every primitive demo", () => {
    expect(FILES.map(({ path }) => path)).toContain("examples/layout.html");
    expect(FILES.map(({ path }) => path)).toContain("examples/responsive.html");
    expect(FILES.map(({ path }) => path)).toContain("examples/products.html");
    expect(FILES.filter(({ path }) => path.startsWith("src/primitives/")).length).toBeGreaterThan(
      0,
    );
  });

  it("splits the mechanical rules into retired and live names, nothing lost", () => {
    expect(retired.length + live.length).toBe(MECHANICAL.length);
    expect(MECHANICAL.length).toBeGreaterThan(0);
  });

  it("retires the names the kit no longer defines", () => {
    // The whole --is-breakpoint-* and --gap-* families are gone (new flag
    // vocabulary, --space-* scale); each shifted family loses its xs end.
    const names = retired.map((rule) => rule.from);
    for (const size of ["xs", "sm", "md", "lg", "xl"]) {
      expect(names).toContain(`--is-breakpoint-${size}`);
      expect(names).toContain(`--gap-${size}`);
    }
    expect(names).toContain("--breakpoint-xs");
    expect(names).toContain("--container-xs");
    expect(names).toContain("@xs:");
    expect(names).toContain("@max-xs:");
    expect(names).toContain("data-container=xs");
    expect(ofKind("class").map((rule) => rule.from)).toEqual(
      ofKind("class")
        .map((rule) => rule.from)
        .filter((name) => name.endsWith("-screen-xs")),
    );
  });

  it("retires exactly the 28 names the 0.5.0 rules leave without a producer", () => {
    // 5 --is-breakpoint-* + 5 --gap-* + --breakpoint-xs + --container-xs (12
    // tokens), @xs: + @max-xs: (2 prefixes), 13 *-screen-xs classes, and
    // data-container=xs. A different count means the JSON gained or lost a
    // family (ticket 22 / 36): re-derive the breakdown and update this pin so
    // the sweep below is known to cover the new retired name. Every other rule
    // (72 of them) maps a live name one step along its family.
    expect(retired).toHaveLength(28);
    expect(live).toHaveLength(MECHANICAL.length - 28);
  });
});

describe("examples-migrated: no retired 0.4 name in examples/ or src/primitives/", () => {
  it("reads no retired token (--is-breakpoint-*, --gap-*, --breakpoint-xs, --container-xs)", () => {
    for (const rule of ofKind("token")) {
      expect(offenders(FILES, needle(rule)), rule.from).toEqual([]);
    }
  });

  it("carries no retired data-container value", () => {
    for (const rule of ofKind("attr-value")) {
      expect(offenders(FILES, needle(rule)), rule.from).toEqual([]);
    }
  });

  it('uses no retired class name inside class="…"', () => {
    for (const rule of ofKind("class")) {
      expect(
        classOffenders(FILES, (name) => name === rule.from),
        rule.from,
      ).toEqual([]);
    }
  });

  it('uses no retired breakpoint prefix inside class="…"', () => {
    for (const rule of ofKind("class-prefix")) {
      expect(
        classOffenders(FILES, (name) => name.startsWith(rule.from)),
        rule.from,
      ).toEqual([]);
    }
  });

  it("mentions no retired class name or prefix in prose, comments or <code> either", () => {
    // Ticket 27 shifted the captions by hand; a stale mention would teach the
    // old vocabulary even though the markup is right.
    for (const rule of [...ofKind("class"), ...ofKind("class-prefix")]) {
      expect(offenders(FILES, needle(rule)), rule.from).toEqual([]);
    }
  });
});
