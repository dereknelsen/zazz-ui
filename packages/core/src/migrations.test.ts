"use strict";

/**
 * @fileoverview Drift guard for `migrations/0.5.0.json`, the rename rules the
 * `zazz-ui migrate` command reads out of this package's tarball. Checks the
 * document against the CLI's own loader (`packages/cli/src/migrate.ts`), the
 * invariants that keep the rules safe as one simultaneous map (no self-maps,
 * the class-prefix map a bijection with prefix-free `from` names, the
 * idempotent token families disjoint, the chain families exactly one step,
 * the `class` rules covering exactly the `*-screen-*` names the kit
 * defines), and the `## 0.5.0` block of
 * `CHANGELOG.md`: every non-manual rule must be a `| \`from\` | \`to\` |`
 * table row there, and every rule-shaped row there must be a rule here, so
 * the changelog and the codemod share one source (SPEC.md Phase 6).
 *
 * Changelog contract (ticket 26 writes the block): a *rename row* is a table
 * row whose first two cells are each one code span; the reverse check only
 * considers rename rows whose first cell is rule-shaped (`--name`, `@prefix:`,
 * `attr=value` or a `*-screen-<size>` class), so band line names and the
 * like may still be tabulated.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { type Rule, loadRules } from "../../cli/src/migrate.ts";

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "0.5.0";
const FILE = join(PACKAGE, "migrations", `${VERSION}.json`);
const TEXT = readFileSync(FILE, "utf8");
const RULES = loadRules(TEXT, `migrations/${VERSION}.json`);

const byKind = (kind: Rule["kind"]): Rule[] => RULES.rules.filter((rule) => rule.kind === kind);
const mapped = (rules: Rule[]): [string, string][] =>
  rules.map((rule) => [rule.from, rule.to ?? ""]);

/** The five old sizes and the five they shift onto, in order. */
const OLD_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
const NEW_SIZES = ["sm", "md", "lg", "xl", "2xl"] as const;
const shifted = (template: (size: string) => string): [string, string][] =>
  OLD_SIZES.map((old, index) => [template(old), template(NEW_SIZES[index] as string)]);

/**
 * The `<family>-screen-<size>` utility families, in `_utilities.css` order:
 * width, height, and size, then the max and min forms, each with its logical
 * `inline-` / `block-` alias. Ticket 04 shifted their suffixes with the
 * breakpoints, so every name needs a `class` rule (ticket 36).
 */
const SCREEN_FAMILIES = [
  "w",
  "inline",
  "h",
  "block",
  "size",
  "max-w",
  "max-inline",
  "max-h",
  "max-block",
  "min-w",
  "min-inline",
  "min-h",
  "min-block",
] as const;

describe("migrations/0.5.0.json", () => {
  it("is accepted by the CLI loader and names its own version", () => {
    expect(RULES.from).toBe("0.4");
    expect(RULES.to).toBe(VERSION);
    expect(RULES.rules.length).toBeGreaterThan(0);
  });

  it("is shipped in the npm tarball", () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8")) as {
      files: string[];
    };
    expect(pkg.files).toContain("migrations");
    expect(existsSync(FILE)).toBe(true);
  });

  it("uses only the kinds the engine knows and maps nothing to itself", () => {
    const kinds = new Set(["token", "class-prefix", "class", "attr-value", "manual"]);
    for (const rule of RULES.rules) {
      expect(kinds).toContain(rule.kind);
      if (rule.kind === "manual") {
        expect(rule.to).toBeUndefined();
        expect(rule.note).toBeTruthy();
      } else {
        expect(rule.to).toBeTruthy();
        expect(rule.to).not.toBe(rule.from);
      }
    }
  });

  it("has no duplicate from within a kind", () => {
    const ids = RULES.rules.map((rule) => `${rule.kind}:${rule.from}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("token rules", () => {
  const tokens = mapped(byKind("token"));

  it("rename the flags, shift the breakpoint and container ranges, and fold --gap-* into --space-*", () => {
    expect(tokens).toEqual([
      ...OLD_SIZES.map((old, index): [string, string] => [
        `--is-breakpoint-${old}`,
        `--bp-${NEW_SIZES[index] as string}`,
      ]),
      ...shifted((size) => `--breakpoint-${size}`),
      ...OLD_SIZES.map((size): [string, string] => [`--gap-${size}`, `--space-${size}`]),
      ...shifted((size) => `--container-${size}`),
    ]);
  });

  it("keep the idempotent families disjoint from their targets", () => {
    // Disjoint targets mean a second run cannot chain-shift these families
    // (`--space-md` is no rule's source); --breakpoint-* and --container-*
    // are chains (next test) and rely on the zazz.json stamp. Disjointness
    // is not a licence to re-run on 0.5 markup, though: `--gap-sm…xl` live
    // on as the `--gap` style prop's responsive forms, which is what the
    // `readsOnly` flag protects (next test).
    for (const prefix of ["--is-breakpoint-", "--gap-"]) {
      const family = tokens.filter(([from]) => from.startsWith(prefix));
      const froms = new Set(family.map(([from]) => from));
      for (const [, to] of family) expect(froms).not.toContain(to);
    }
  });

  it("flag --gap-sm…xl readsOnly — they are live style props in 0.5 — and nothing else", () => {
    // In markup the engine then renames only `var(--gap-md)` reads; a
    // `style="--gap-md: 4"` declaration is the prop and must survive.
    // `--gap-xs` is no prop (the scale starts at sm), so it renames anywhere.
    const readsOnly = RULES.rules
      .filter((rule) => rule.readsOnly === true)
      .map((rule) => rule.from);
    expect(readsOnly).toEqual(["--gap-sm", "--gap-md", "--gap-lg", "--gap-xl"]);
    for (const rule of RULES.rules) {
      if (rule.readsOnly === true) expect(rule.kind).toBe("token");
    }
  });

  it("shift the chain families exactly one step: every target but the last is also a source", () => {
    for (const prefix of ["--breakpoint-", "--container-"]) {
      const family = tokens.filter(([from]) => from.startsWith(prefix));
      expect(family).toHaveLength(OLD_SIZES.length);
      const froms = new Set(family.map(([from]) => from));
      const tos = family.map(([, to]) => to);
      for (const to of tos.slice(0, -1)) expect(froms).toContain(to);
      expect(froms).not.toContain(tos.at(-1));
    }
  });

  it("leave --article-* alone", () => {
    expect(tokens.some(([from]) => from.startsWith("--article-"))).toBe(false);
  });
});

describe("class-prefix rules", () => {
  const prefixes = mapped(byKind("class-prefix"));

  it("shift @<size>: and @max-<size>: one step each", () => {
    expect(prefixes).toEqual([
      ...shifted((size) => `@${size}:`),
      ...shifted((size) => `@max-${size}:`),
    ]);
  });

  it("form a bijection: distinct froms, distinct tos, same count", () => {
    const froms = new Set(prefixes.map(([from]) => from));
    const tos = new Set(prefixes.map(([, to]) => to));
    expect(froms.size).toBe(prefixes.length);
    expect(tos.size).toBe(prefixes.length);
  });

  it("are safe as one simultaneous map: no from is a prefix of another from", () => {
    // The engine matches the longest prefix at the token start, then replaces
    // in one pass. Prefix-free froms mean every class token matches at most
    // one rule, so the @sm:→@md: / @xs:→@sm: chain never double-applies.
    for (const [a] of prefixes) {
      for (const [b] of prefixes) {
        if (a !== b) expect(b.startsWith(a)).toBe(false);
      }
    }
  });

  it("keep the min and max families apart", () => {
    for (const [from, to] of prefixes) {
      expect(to.startsWith("@max-")).toBe(from.startsWith("@max-"));
    }
  });
});

describe("class rules", () => {
  const classes = mapped(byKind("class"));

  it("shift every *-screen-<size> class one step, family by family", () => {
    expect(classes).toEqual(
      SCREEN_FAMILIES.flatMap((family) => shifted((size) => `${family}-screen-${size}`)),
    );
  });

  it("cover exactly the *-screen-* classes _utilities.css defines", () => {
    // The kit is the source of truth for the family list: a family added or
    // dropped there must show up here, and no rule may target a name the
    // kit no longer ships (the old xs names are gone, not aliased).
    const css = readFileSync(join(PACKAGE, "src", "base", "_utilities.css"), "utf8");
    const defined = new Set([...css.matchAll(/\.([\w-]+-screen-\w+)(?![\w-])/g)].map((m) => m[1]));
    const targets = new Set(classes.map(([, to]) => to));
    expect([...defined].sort()).toEqual([...targets].sort());
    for (const [from] of classes) {
      if (from.endsWith("-screen-xs")) expect(defined).not.toContain(from);
    }
  });

  it("keep each class in its family and form a bijection", () => {
    const family = (name: string): string => name.replace(/-(?:xs|sm|md|lg|xl|2xl)$/, "");
    for (const [from, to] of classes) expect(family(to)).toBe(family(from));
    expect(new Set(classes.map(([from]) => from)).size).toBe(classes.length);
    expect(new Set(classes.map(([, to]) => to)).size).toBe(classes.length);
  });
});

describe("attr-value rules", () => {
  it("shift data-container xs…xl to sm…2xl", () => {
    expect(mapped(byKind("attr-value"))).toEqual(shifted((size) => `data-container=${size}`));
  });
});

describe("manual rules", () => {
  it("flag JSX className expressions and arbitrary values", () => {
    expect(byKind("manual").map((rule) => rule.from)).toEqual(["className={", "["]);
  });
});

// --- CHANGELOG drift guard ---

const CHANGELOG = readFileSync(join(PACKAGE, "CHANGELOG.md"), "utf8");

/**
 * @description The lines of one version block: from its `## <version>` header
 * to the next `## ` header (or end of file). The version must end there
 * (whitespace or end of line follows), so `## 0.5.0-beta.1` is not `0.5.0`.
 *
 * @param changelog - The changelog text.
 * @param version - The version whose block to slice.
 * @returns The block's lines, or null when the changelog has no such block.
 * @private
 */
function versionBlock(changelog: string, version: string): string[] | null {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^## ${version.replace(/\./g, "\\.")}(?=\\s|$)`).test(line),
  );
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return rest.slice(0, end === -1 ? rest.length : end);
}

/**
 * @description The rename rows of a block: table rows whose first two cells
 * are each exactly one code span.
 *
 * @param lines - A version block.
 * @returns `{ from, to }` per rename row, in document order.
 * @private
 */
function renameRows(lines: string[]): { from: string; to: string }[] {
  const code = /^`([^`]+)`$/;
  return lines.flatMap((line) => {
    if (!/^\s*\|/.test(line)) return [];
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
    const from = code.exec(cells[0] ?? "")?.[1];
    const to = code.exec(cells[1] ?? "")?.[1];
    return from !== undefined && to !== undefined ? [{ from, to }] : [];
  });
}

/** Whether a rename-row cell looks like something the engine could rewrite. */
function isRuleShaped(text: string): boolean {
  return (
    text.startsWith("--") ||
    /^@[\w-]+:$/.test(text) ||
    /^[\w:-]+=.+$/.test(text) ||
    /^[\w-]+-screen-\w+$/.test(text)
  );
}

describe("versionBlock", () => {
  it("matches the exact version header, not a prerelease that starts the same", () => {
    const sample = ["# Changelog", "", "## 0.5.0-beta.1 (2026-08-01)", "", "- beta", ""].join("\n");
    expect(versionBlock(sample, "0.5.0")).toBeNull();
    expect(versionBlock(sample, "0.5.0-beta.1")).toEqual(["", "- beta", ""]);
    expect(versionBlock("## 0.5.0\n- a\n## 0.5.1\n- b", "0.5.0")).toEqual(["- a"]);
    expect(versionBlock("## 0.5.0", "0.5.0")).toEqual([]);
  });
});

describe("CHANGELOG.md ## 0.5.0", () => {
  const block = versionBlock(CHANGELOG, VERSION);
  const rows = block === null ? [] : renameRows(block);
  const rowKeys = new Set(rows.map(({ from, to }) => `${from} → ${to}`));
  const ruleKeys = new Set(
    RULES.rules.filter((rule) => rule.kind !== "manual").map((rule) => `${rule.from} → ${rule.to}`),
  );

  it("exists", () => {
    expect(block).not.toBeNull();
  });

  // Forward half: every rule the codemod applies is documented (ticket 26).
  it("lists every non-manual rule as a | `from` | `to` | row", () => {
    const missing = [...ruleKeys].filter((key) => !rowKeys.has(key));
    expect(missing).toEqual([]);
  });

  // Live already: the block has no rename rows yet, and every row ticket 26
  // adds must come from the rules file.
  it("tabulates no rule-shaped rename the rules file lacks", () => {
    const unknown = rows
      .filter(({ from }) => isRuleShaped(from))
      .map(({ from, to }) => `${from} → ${to}`)
      .filter((key) => !ruleKeys.has(key));
    expect(unknown).toEqual([]);
  });

  it("reads rename rows the way ticket 26 will write them", () => {
    const sample = [
      "| 0.4 | 0.5 |",
      "| --- | --- |",
      "| `--gap-xs` | `--space-xs` |",
      "|`@max-xl:`|`@max-2xl:`|",
      "| `data-container=xs` | `data-container=sm` |",
      "| — | `--space-2xs` |",
      "| `container-xs-start` | `container-sm-start` |",
      "| `max-w-screen-xs` | `max-w-screen-sm` |",
      "| `dist/zazz.css` raw bytes | 304,258 | tbd |",
    ];
    const parsed = renameRows(sample);
    expect(parsed).toEqual([
      { from: "--gap-xs", to: "--space-xs" },
      { from: "@max-xl:", to: "@max-2xl:" },
      { from: "data-container=xs", to: "data-container=sm" },
      { from: "container-xs-start", to: "container-sm-start" },
      { from: "max-w-screen-xs", to: "max-w-screen-sm" },
    ]);
    // The band line name is the one row the engine cannot rewrite.
    expect(parsed.filter(({ from }) => isRuleShaped(from))).toHaveLength(4);
  });

  it("parses the measurements table without mistaking it for rename rows", () => {
    // The preamble's measurements rows have prose or numbers in their cells,
    // so no rename row can come from them; whatever rows exist must be
    // rule-shaped renames (ticket 26's tables), never measurements.
    for (const { from } of rows) expect(from).not.toMatch(/bytes|count|Coverage/);
  });
});
