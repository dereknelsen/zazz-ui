"use strict";

/**
 * @fileoverview Drift guard for `migrations/0.5.0.json`, the rename rules the
 * `zazz-ui migrate` command reads out of this package's tarball. Checks the
 * document against the CLI's own loader (`packages/cli/src/migrate.ts`), the
 * invariants that keep the rules safe as one simultaneous map (no self-maps,
 * the class-prefix map a bijection with prefix-free `from` names, the
 * idempotent token families disjoint), and the `## 0.5.0` block of
 * `CHANGELOG.md`: every non-manual rule must be a `| \`from\` | \`to\` |`
 * table row there, and every rule-shaped row there must be a rule here, so
 * the changelog and the codemod share one source (SPEC.md Phase 6).
 *
 * Changelog contract (ticket 26 writes the block): a *rename row* is a table
 * row whose first two cells are each one code span; the reverse check only
 * considers rename rows whose first cell is rule-shaped (`--name`, `@prefix:`
 * or `attr=value`), so band line names and the like may still be tabulated.
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

  it("rename the flags, shift the breakpoint lengths, and fold --gap-* into --space-*", () => {
    expect(tokens).toEqual([
      ...OLD_SIZES.map((old, index): [string, string] => [
        `--is-breakpoint-${old}`,
        `--bp-${NEW_SIZES[index] as string}`,
      ]),
      ...shifted((size) => `--breakpoint-${size}`),
      ...OLD_SIZES.map((size): [string, string] => [`--gap-${size}`, `--space-${size}`]),
    ]);
  });

  it("keep the idempotent families disjoint from their targets", () => {
    // These two families may be re-run safely; only --breakpoint-* is a chain.
    for (const prefix of ["--is-breakpoint-", "--gap-"]) {
      const family = tokens.filter(([from]) => from.startsWith(prefix));
      const froms = new Set(family.map(([from]) => from));
      for (const [, to] of family) expect(froms).not.toContain(to);
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
 * to the next `## ` header (or end of file).
 *
 * @param version - The version whose block to slice.
 * @returns The block's lines, or null when the changelog has no such block.
 * @private
 */
function versionBlock(version: string): string[] | null {
  const lines = CHANGELOG.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^## ${version.replace(/\./g, "\\.")}\\b`).test(line),
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
  return text.startsWith("--") || /^@[\w-]+:$/.test(text) || /^[\w:-]+=.+$/.test(text);
}

describe("CHANGELOG.md ## 0.5.0", () => {
  const block = versionBlock(VERSION);
  const rows = block === null ? [] : renameRows(block);
  const rowKeys = new Set(rows.map(({ from, to }) => `${from} → ${to}`));
  const ruleKeys = new Set(
    RULES.rules.filter((rule) => rule.kind !== "manual").map((rule) => `${rule.from} → ${rule.to}`),
  );

  it("exists", () => {
    expect(block).not.toBeNull();
  });

  // Enable after ticket 26 writes the 0.5.0 block's rename tables.
  it.skip("lists every non-manual rule as a | `from` | `to` | row", () => {
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
      "| `dist/zazz.css` raw bytes | 304,258 | tbd |",
    ];
    const parsed = renameRows(sample);
    expect(parsed).toEqual([
      { from: "--gap-xs", to: "--space-xs" },
      { from: "@max-xl:", to: "@max-2xl:" },
      { from: "data-container=xs", to: "data-container=sm" },
      { from: "container-xs-start", to: "container-sm-start" },
    ]);
    expect(parsed.filter(({ from }) => isRuleShaped(from))).toHaveLength(3);
  });

  it("parses the measurements table without mistaking it for rename rows", () => {
    // The preamble's measurements rows have prose or numbers in their cells,
    // so no rename row can come from them; whatever rows exist must be
    // rule-shaped renames (ticket 26's tables), never measurements.
    for (const { from } of rows) expect(from).not.toMatch(/bytes|count|Coverage/);
  });
});
