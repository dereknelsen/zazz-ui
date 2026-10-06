/**
 * @fileoverview The injection grammar: committed file is fresh, and its
 * patterns scope utility names, tiers, prefixes, hooks, and identities.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { GRAMMAR_PATH, generateGrammar, grammarText } from "./generate-grammar.ts";

interface Pattern {
  match: string;
  captures: Record<string, { name: string }>;
}

const repository = (generateGrammar() as { repository: Record<string, { patterns: Pattern[] }> })
  .repository;

/** The capture scopes the first matching style pattern assigns in `text`. */
function scopes(text: string, patterns: Pattern[]): Record<string, string> {
  for (const pattern of patterns) {
    const m = new RegExp(pattern.match).exec(text);
    if (!m) continue;
    const out: Record<string, string> = {};
    for (const [index, { name }] of Object.entries(pattern.captures)) {
      if (m[Number(index)]) out[m[Number(index)]!] = name;
    }
    return out;
  }
  return {};
}

describe("injection grammar", () => {
  it("matches the committed file", () => {
    expect(readFileSync(GRAMMAR_PATH, "utf8")).toBe(grammarText());
  });

  it("scopes a utility's name by family, its tier, and its prefixes", () => {
    const style = repository.style!.patterns;
    expect(scopes("--px--md: 4", style)).toMatchObject({
      px: "support.type.property-name.css.zazz.utility.spacing",
      md: "entity.other.attribute-name.pseudo-class.css.zazz.tier",
    });
    expect(scopes("--group-bg--hover: red", style)).toMatchObject({
      "group-": "storage.modifier.group.zazz",
      bg: "support.type.property-name.css.zazz.utility.color",
      hover: "entity.other.attribute-name.pseudo-class.css.zazz.tier",
    });
    expect(scopes("--before-content: ''", style)).toMatchObject({
      "before-": "entity.other.attribute-name.pseudo-element.css.zazz",
    });
    expect(scopes("--ui-button-bg: red", style)).toEqual({
      "--ui-button-bg": "variable.other.constant.zazz.hook",
    });
  });

  it("prefers the longest name (--px, not --p) and leaves unknown names alone", () => {
    const style = repository.style!.patterns;
    expect(Object.keys(scopes("--px: 4", style))).toContain("px");
    expect(scopes("--foo: 1", style)).toEqual({});
  });

  it("scopes known identities in data-ui", () => {
    const identities = repository.identities!.patterns;
    expect(scopes(`"card group"`, identities)).toEqual({ card: "support.class.zazz.identity" });
    expect(scopes(`"nope"`, identities)).toEqual({});
  });
});
