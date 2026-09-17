"use strict";

/**
 * @fileoverview Migrate engine: rules validation, simultaneous rewrites
 * (token, class-prefix, class, attr-value, escaped css selectors), the
 * boundaries that keep rewrites out of prose and neighbouring names, and
 * unmappable reporting with line numbers.
 */

import { describe, expect, it } from "vite-plus/test";
import { ZazzError } from "./errors.ts";
import { type Rules, applyToText, compile, loadRules, ruleId } from "./migrate.ts";

/** Mirrors the shape of `packages/core/migrations/0.5.0.json` (ticket 22). */
const FIXTURE: Rules = {
  from: "0.4",
  to: "0.5.0",
  rules: [
    { kind: "token", from: "--is-breakpoint-xs", to: "--bp-sm" },
    { kind: "token", from: "--is-breakpoint-sm", to: "--bp-md" },
    { kind: "token", from: "--is-breakpoint-md", to: "--bp-lg" },
    { kind: "token", from: "--is-breakpoint-lg", to: "--bp-xl" },
    { kind: "token", from: "--is-breakpoint-xl", to: "--bp-2xl" },
    { kind: "token", from: "--breakpoint-xs", to: "--breakpoint-sm" },
    { kind: "token", from: "--breakpoint-sm", to: "--breakpoint-md" },
    { kind: "token", from: "--breakpoint-md", to: "--breakpoint-lg" },
    { kind: "token", from: "--breakpoint-lg", to: "--breakpoint-xl" },
    { kind: "token", from: "--breakpoint-xl", to: "--breakpoint-2xl" },
    { kind: "token", from: "--gap-xs", to: "--space-xs" },
    { kind: "token", from: "--gap-sm", to: "--space-sm" },
    { kind: "token", from: "--gap-md", to: "--space-md" },
    { kind: "token", from: "--gap-lg", to: "--space-lg" },
    { kind: "token", from: "--gap-xl", to: "--space-xl" },
    { kind: "class-prefix", from: "@xs:", to: "@sm:" },
    { kind: "class-prefix", from: "@sm:", to: "@md:" },
    { kind: "class-prefix", from: "@md:", to: "@lg:" },
    { kind: "class-prefix", from: "@lg:", to: "@xl:" },
    { kind: "class-prefix", from: "@xl:", to: "@2xl:" },
    { kind: "class-prefix", from: "@max-xs:", to: "@max-sm:" },
    { kind: "class-prefix", from: "@max-sm:", to: "@max-md:" },
    { kind: "class-prefix", from: "@max-md:", to: "@max-lg:" },
    { kind: "class-prefix", from: "@max-lg:", to: "@max-xl:" },
    { kind: "class-prefix", from: "@max-xl:", to: "@max-2xl:" },
    { kind: "class", from: "stack-tight", to: "stack-sm", note: "renamed" },
    { kind: "attr-value", from: "data-container=xs", to: "data-container=sm" },
    { kind: "attr-value", from: "data-container=sm", to: "data-container=md" },
    { kind: "attr-value", from: "data-container=md", to: "data-container=lg" },
    { kind: "attr-value", from: "data-container=lg", to: "data-container=xl" },
    { kind: "attr-value", from: "data-container=xl", to: "data-container=2xl" },
    { kind: "manual", from: "className={", note: "JSX expression; migrate by hand" },
    { kind: "manual", from: "[", note: "arbitrary value; migrate by hand" },
  ],
};

const compiled = compile(loadRules(FIXTURE));

const run = (text: string, kind: "css" | "html" | "md" | "js" = "html") =>
  applyToText(text, compiled, { kind });

describe("loadRules", () => {
  it("accepts a JSON string or a parsed object and keeps the header", () => {
    const fromString = loadRules(JSON.stringify(FIXTURE));
    expect(fromString.from).toBe("0.4");
    expect(fromString.to).toBe("0.5.0");
    expect(fromString.rules).toEqual(FIXTURE.rules);
    expect(loadRules(FIXTURE)).toEqual(fromString);
  });

  it("rejects malformed documents with pointed messages", () => {
    const bad = (json: unknown, detail: string) => {
      expect(() => loadRules(json, "x.json")).toThrow(ZazzError);
      expect(() => loadRules(json, "x.json")).toThrow(detail);
    };
    bad("{not json", "not valid JSON");
    bad([], "not an object");
    bad({ to: "0.5.0", rules: [] }, "from missing");
    bad({ from: "0.4", rules: [] }, "to missing");
    bad({ from: "0.4", to: "0.5.0", rules: {} }, "rules must be an array");
    const doc = (rule: unknown) => ({ from: "0.4", to: "0.5.0", rules: [rule] });
    bad(doc({ kind: "slot", from: "a", to: "b" }), "rules[0].kind must be one of");
    bad(doc({ kind: "token", to: "--b" }), "rules[0].from missing");
    bad(doc({ kind: "token", from: "--a" }), "rules[0].to missing");
    bad(doc({ kind: "token", from: "--a", to: "--a" }), "maps --a to itself");
    bad(doc({ kind: "token", from: "gap", to: "--space" }), "token names start with --");
    bad(doc({ kind: "class", from: "a b", to: "c" }), "must not contain whitespace");
    bad(doc({ kind: "manual", from: "x", to: "y" }), 'manual rules take no "to"');
    bad(doc({ kind: "manual", from: "x", note: 1 }), "note must be a string");
    bad(doc({ kind: "attr-value", from: "xs", to: "sm" }), "must be attr=value");
    bad(
      doc({ kind: "attr-value", from: "data-a=xs", to: "data-b=sm" }),
      "must keep the attribute name",
    );
    bad(
      {
        from: "0.4",
        to: "0.5.0",
        rules: [
          { kind: "token", from: "--a", to: "--b" },
          { kind: "token", from: "--a", to: "--c" },
        ],
      },
      "duplicate rule token:--a",
    );
  });
});

describe("token rules", () => {
  it("shifts a chain simultaneously and respects name boundaries", () => {
    const css = [
      ":root { --breakpoint-xs: 40rem; --breakpoint-sm: 48rem; --breakpoint-xl: 80rem; }",
      ".a { gap: var(--gap-md); padding: var(--gap-md-foo) var(--x-gap-md) var(--gap-mdx); }",
      "@container style(--is-breakpoint-xs: true) { .b { --breakpoint-xs-custom: 1; } }",
    ].join("\n");
    const result = run(css, "css");
    expect(result.text).toBe(
      [
        ":root { --breakpoint-sm: 40rem; --breakpoint-md: 48rem; --breakpoint-2xl: 80rem; }",
        ".a { gap: var(--space-md); padding: var(--gap-md-foo) var(--x-gap-md) var(--gap-mdx); }",
        "@container style(--bp-sm: true) { .b { --breakpoint-xs-custom: 1; } }",
      ].join("\n"),
    );
    expect(result.counts).toEqual({
      "token:--breakpoint-xs": 1,
      "token:--breakpoint-sm": 1,
      "token:--breakpoint-xl": 1,
      "token:--gap-md": 1,
      "token:--is-breakpoint-xs": 1,
    });
    expect(result.unmappable).toEqual([]);
  });

  it("applies in every file kind", () => {
    for (const kind of ["css", "html", "md", "js"] as const) {
      expect(run('style="--gap-sm: 1" /* --is-breakpoint-md */', kind).text).toBe(
        'style="--space-sm: 1" /* --bp-lg */',
      );
    }
  });

  it("is idempotent for families whose new names are not also old names", () => {
    const text = "var(--gap-xs) var(--gap-xl) style(--is-breakpoint-lg: true)";
    const once = run(text, "css").text;
    const twice = run(once, "css").text;
    expect(once).toBe("var(--space-xs) var(--space-xl) style(--bp-xl: true)");
    expect(twice).toBe(once);
  });
});

describe("class-prefix / class rules", () => {
  it("shifts the whole chain once, nothing double-shifted", () => {
    const html = '<div class="@xs:a @sm:b @xl:c @max-xs:d @max-lg:e stack-tight plain">';
    const result = run(html);
    expect(result.text).toBe('<div class="@sm:a @md:b @2xl:c @max-sm:d @max-xl:e stack-sm plain">');
    expect(result.counts["class-prefix:@xs:"]).toBe(1);
    expect(result.counts["class-prefix:@sm:"]).toBe(1);
    expect(result.counts["class-prefix:@xl:"]).toBe(1);
    expect(result.counts["class-prefix:@max-xs:"]).toBe(1);
    expect(result.counts["class:stack-tight"]).toBe(1);
    expect(result.counts["class-prefix:@md:"]).toBeUndefined();
  });

  it("handles single quotes, className, spacing around =, and preserves whitespace", () => {
    const jsx = "<a className = '@md:flex\n   @lg:grid'>\n<b class=\"  @xs:x \">";
    expect(run(jsx, "js").text).toBe(
      "<a className = '@lg:flex\n   @xl:grid'>\n<b class=\"  @sm:x \">",
    );
  });

  it("rewrites by exact prefix at the token start only", () => {
    expect(run('<i class="hover:@xs:a x@xs:b @xsm:c stack-tight-er">').text).toBe(
      '<i class="hover:@xs:a x@xs:b @xsm:c stack-tight-er">',
    );
  });

  it("leaves prose, comments, and look-alike attributes alone", () => {
    const md = [
      "Use `@xs:grid` on the wrapper; `stack-tight` is gone.",
      '<!-- class="@xs:old" is discussed, not applied -->',
      '<div data-class="@xs:a" :class="\'@xs:b\'" x-bind:class="@xs:c">',
      "el.className = '@xs:d';",
      '<p class="@xs:e">',
    ].join("\n");
    const result = run(md, "md");
    const lines = result.text.split("\n");
    expect(lines[0]).toBe("Use `@xs:grid` on the wrapper; `stack-tight` is gone.");
    // A comment carrying a real attribute literal is rewritten: the rewrite is textual by design.
    expect(lines[1]).toBe('<!-- class="@sm:old" is discussed, not applied -->');
    expect(lines[2]).toBe('<div data-class="@xs:a" :class="\'@xs:b\'" x-bind:class="@xs:c">');
    expect(lines[3]).toBe("el.className = '@xs:d';");
    expect(lines[4]).toBe('<p class="@sm:e">');
  });

  it("rewrites escaped selectors in css via the same map, and only there", () => {
    const css = [
      ':where(.\\@xs\\:container:not([data-variant="article"])) {}',
      ".\\@max-xl\\:hidden, .\\@sm\\:flex.\\@lg\\:grid {}",
      ".stack-tight {} .stack-tight-er {} .x-stack-tight {}",
      '[class*=":container"] { content: "@xs:literal"; }',
    ].join("\n");
    expect(run(css, "css").text).toBe(
      [
        ':where(.\\@sm\\:container:not([data-variant="article"])) {}',
        ".\\@max-2xl\\:hidden, .\\@md\\:flex.\\@xl\\:grid {}",
        ".stack-sm {} .stack-tight-er {} .x-stack-tight {}",
        '[class*=":container"] { content: "@xs:literal"; }',
      ].join("\n"),
    );
    // The escaped form is css-only: the same text in html is untouched.
    expect(run(css, "html").text).toBe(css);
  });
});

describe("attr-value rules", () => {
  it("rewrites attribute values simultaneously in markup and css selectors", () => {
    const text = [
      '<section data-container="xs"><div data-container=\'xl\' data-container-x="xs">',
      '[data-container="sm"] {} .data-container { x: "md" }',
      '<div data-container="custom">',
    ].join("\n");
    const result = run(text);
    expect(result.text).toBe(
      [
        '<section data-container="sm"><div data-container=\'2xl\' data-container-x="xs">',
        '[data-container="md"] {} .data-container { x: "md" }',
        '<div data-container="custom">',
      ].join("\n"),
    );
    expect(result.counts).toEqual({
      "attr-value:data-container=xs": 1,
      "attr-value:data-container=xl": 1,
      "attr-value:data-container=sm": 1,
    });
  });
});

describe("unmappable", () => {
  it("reports JSX className expressions with line numbers, still rewriting literals", () => {
    const tsx = [
      "export function Card({ wide }: { wide: boolean }) {",
      "  return (",
      '    <div className={cn("@xs:grid", wide && "@md:flex")}>',
      '      <span className="@xs:block">x</span>',
      "    </div>",
      "  );",
      "}",
    ].join("\n");
    const result = run(tsx, "js");
    expect(result.text.split("\n")[3]).toBe('      <span className="@sm:block">x</span>');
    expect(result.text.split("\n")[2]).toBe(
      '    <div className={cn("@xs:grid", wide && "@md:flex")}>',
    );
    expect(result.unmappable).toEqual([
      {
        line: 3,
        snippet: 'className={cn("@xs:grid", wide && "@md:flex")}>',
        note: "JSX expression; migrate by hand",
      },
    ]);
    expect(result.counts["manual:className={"]).toBe(1);
  });

  it("reports template literals that carry a class prefix outside a class attribute (js only)", () => {
    const js = [
      "const a = `@xs:grid ${gap}`;",
      'const b = html`<div class="@xs:grid">${x}</div>`;',
      "const c = `plain ${y}`;",
      "const d = `stack-tight`;",
      "const e = `stack-tighter`;",
    ].join("\n");
    const result = run(js, "js");
    expect(result.text.split("\n")[1]).toBe('const b = html`<div class="@sm:grid">${x}</div>`;');
    expect(result.unmappable).toEqual([
      {
        line: 1,
        snippet: "`@xs:grid ${gap}`",
        note: "template literal contains `@xs:`; rewrite by hand",
      },
      {
        line: 4,
        snippet: "`stack-tight`",
        note: "template literal contains `stack-tight`; rewrite by hand",
      },
    ]);
    // Markdown inline code is not a template literal.
    expect(run("Use `@xs:grid` here.", "md").unmappable).toEqual([]);
  });

  it("reports arbitrary values inside class tokens, with the token as the snippet", () => {
    const html = [
      "<!doctype html>",
      '<div class="p-[4px] @xs:w-[10rem]',
      '  ok">',
      "<p>array[0] in prose is not a class</p>",
    ].join("\n");
    const result = run(html);
    expect(result.text.split("\n")[1]).toBe('<div class="p-[4px] @sm:w-[10rem]');
    expect(result.unmappable).toEqual([
      { line: 2, snippet: "p-[4px]", note: "arbitrary value; migrate by hand" },
      { line: 2, snippet: "@xs:w-[10rem]", note: "arbitrary value; migrate by hand" },
    ]);
    expect(result.counts["manual:["]).toBe(2);
    expect(result.counts["class-prefix:@xs:"]).toBe(1);
  });

  it("names the right line after an earlier rename changed a line's length", () => {
    // The `[` report is found in the token-rewritten text; three renames on
    // line 1 push every later offset by six, past the end of line 2's tail.
    const html = [":root { --gap-xs: 1; --gap-sm: 2; --gap-md: 3 }", '<i class="[x]">', "<p>"].join(
      "\n",
    );
    const result = run(html);
    expect(result.text.split("\n")[0]).toBe(
      ":root { --space-xs: 1; --space-sm: 2; --space-md: 3 }",
    );
    expect(result.unmappable).toEqual([
      { line: 2, snippet: "[x]", note: "arbitrary value; migrate by hand" },
    ]);
  });

  it("falls back to built-in manual rules when the file omits them", () => {
    const minimal = compile(
      loadRules({
        from: "0.4",
        to: "0.5.0",
        rules: [{ kind: "class-prefix", from: "@xs:", to: "@sm:" }],
      }),
    );
    expect(minimal.rules.filter((rule) => rule.kind === "manual").map(ruleId)).toEqual([
      "manual:className={",
      "manual:[",
    ]);
    const result = applyToText('<a className={x} class="w-[1px]">', minimal, { kind: "js" });
    expect(result.unmappable.map((entry) => entry.note)).toEqual([
      "JSX className expression; migrate the strings inside by hand",
      "arbitrary value; migrate by hand",
    ]);
  });

  it("caps long snippets", () => {
    const long = `<div className={${"x".repeat(200)}}>`;
    const [entry] = run(long, "js").unmappable;
    expect(entry?.snippet.length).toBe(80);
    expect(entry?.snippet.endsWith("…")).toBe(true);
  });
});

describe("applyToText", () => {
  it("returns the input untouched and empty counts when nothing matches", () => {
    const text = "body { color: red; }\n";
    expect(run(text, "css")).toEqual({ text, counts: {}, unmappable: [] });
  });

  it("never changes the line count", () => {
    const text = '<div class="@xs:a\n @sm:b" data-container="xs">\n:root{--gap-md:1}\n';
    expect(run(text).text.split("\n").length).toBe(text.split("\n").length);
  });
});
