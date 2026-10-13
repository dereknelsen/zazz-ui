/**
 * @fileoverview The injection grammar: committed file is fresh, and its
 * patterns scope utility names, tiers, prefixes, hooks, and identities. The
 * Razor grammar rebuilds the attribute scopes inside Razor code blocks.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import {
  GRAMMAR_PATH,
  RAZOR_GRAMMAR_PATH,
  generateGrammar,
  generateRazorGrammar,
  grammarText,
  razorGrammarText,
} from "./generate-grammar.ts";

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

interface AttributeRule {
  name: string;
  begin: string;
  patterns: { include: string }[];
}

describe("razor injection grammar", () => {
  const rules = (generateRazorGrammar() as { patterns: AttributeRule[] }).patterns;
  const rule = (name: string) => rules.find((r) => r.name === name)!;
  const opens = (r: AttributeRule, text: string) => new RegExp(r.begin).test(text);

  it("matches the committed file", () => {
    expect(readFileSync(RAZOR_GRAMMAR_PATH, "utf8")).toBe(razorGrammarText());
  });

  it("opens a style attribute but not C# or a longer name", () => {
    const style = rule("meta.attribute.style.html");
    expect(opens(style, `<li style="`)).toBe(true);
    expect(opens(style, `<li\n  style='`)).toBe(true);
    expect(opens(style, `var style = "x";`)).toBe(false);
    expect(opens(style, `<li mystyle="`)).toBe(false);
  });

  it("opens data-ui but not a longer data- name", () => {
    const dataUi = rule("meta.attribute.data-x.data-ui.html");
    expect(opens(dataUi, `<span data-ui="`)).toBe(true);
    expect(opens(dataUi, `<span data-ui-x="`)).toBe(false);
  });

  it("reuses the main grammar's patterns", () => {
    expect(rule("meta.attribute.style.html").patterns[0]).toEqual({
      include: "zazz.injection#style",
    });
    expect(rule("meta.attribute.data-x.data-ui.html").patterns[0]).toEqual({
      include: "zazz.injection#identities",
    });
  });
});
