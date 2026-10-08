/**
 * @fileoverview Template holes: masking a templating language's expressions
 * out of an HTML document so the html parser and the audit see plain markup
 * at the same offsets.
 */

import { describe, expect, it } from "vite-plus/test";
import { HOLE_LANGUAGES, maskTemplateHoles, overlapsHole } from "./holes.ts";
import { parseHtml } from "./parse.ts";

/** Masking never moves a character: same length, newlines where they were. */
function expectShapePreserved(source: string, masked: string): void {
  expect(masked.length).toBe(source.length);
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") expect(masked[i]).toBe("\n");
  }
}

describe("maskTemplateHoles", () => {
  it("leaves plain html alone", () => {
    const text = `<button data-ui="button" style="--px: 4">Go</button>`;
    expect(maskTemplateHoles(text, "html")).toEqual({ text, holes: [] });
    expect(maskTemplateHoles(text, "unknown-language")).toEqual({ text, holes: [] });
  });

  it("astro: masks the frontmatter and {expressions}, strings and nesting included", () => {
    const source = `---\nconst a = { b: 1 };\n---\n<p data-ui="text-sm" class={cond ? "a}" : \`b\${x}\`}>{items.map((i) => <b>{i}</b>)}</p>`;
    const { text, holes } = maskTemplateHoles(source, "astro");
    expectShapePreserved(source, text);
    expect(text.startsWith("   \n")).toBe(true);
    expect(text).toContain(`<p data-ui="text-sm" class=`);
    expect(text).not.toContain("cond");
    expect(text).not.toContain("items.map");
    expect(holes.length).toBeGreaterThanOrEqual(3);
  });

  it("astro: a hole inside a style attribute hides the whole declaration", () => {
    const source = `<div style={\`--px: \${n}\`}></div>`;
    const { text } = maskTemplateHoles(source, "astro");
    expect(text).toBe(`<div style=${" ".repeat(14)}></div>`);
  });

  it("razor: masks comments, code blocks, explicit and implicit expressions, and block heads", () => {
    const source = [
      `@page "/x"`,
      `@model Thing`,
      `@* a comment *@`,
      `@{ var n = 4; }`,
      `@if (Model.Ok) {`,
      `  <p data-ui="text-sm">@Model.Name.ToUpper() and @(n + 1) and user@example.com</p>`,
      `}`,
      `<a href="mailto:a@@b">@@</a>`,
    ].join("\n");
    const { text } = maskTemplateHoles(source, "razor");
    expectShapePreserved(source, text);
    expect(text).not.toMatch(/@page|@model|comment|var n|@if|Model\.Name|\(n \+ 1\)/);
    expect(text).toContain(`<p data-ui="text-sm">`);
    expect(text).toContain(" and ");
    expect(text).toContain("user@example.com"); // an email is not an expression
    expect(text.split("\n")[6]).toBe(" "); // the block's closing brace
    expect(text).toContain(`href="mailto:a  b"`); // @@ is a literal @, masked as a hole
  });

  it("asp, erb, php: masks the delimited blocks", () => {
    for (const [language, source] of [
      ["asp", `<%@ Page %><p style="--px: 4"><%= name %></p><%-- c --%>`],
      ["erb", `<p style="--px: 4"><%= @name %></p><%# c %>`],
      ["php", `<?php echo 1; ?><p style="--px: 4"><?= $x ?></p>`],
    ] as const) {
      const { text, holes } = maskTemplateHoles(source, language);
      expectShapePreserved(source, text);
      expect(text, language).toContain(`<p style="--px: 4">`);
      expect(text, language).not.toMatch(/name|echo|\$x|Page/);
      expect(holes.length, language).toBeGreaterThan(0);
    }
  });

  it("heex: masks <%= %> and {} and makes component and slot tags parseable", () => {
    const source = `<.button phx-click={@on} data-ui="button" style="--px: 4"><:icon><%= @x %></:icon></.button>`;
    const { text } = maskTemplateHoles(source, "phoenix-heex");
    expectShapePreserved(source, text);
    expect(text).toContain(`<xbutton phx-click=`);
    expect(text).toContain(`<xicon>`);
    expect(text).toContain(`</xbutton>`);
    expect(text).not.toContain("@on");
    expect(text).toContain(`style="--px: 4"`);
  });

  it("elixir: only ~H sigils are markup", () => {
    const source = `defmodule A do\n  def r(assigns) do\n    ~H"""\n    <p data-ui="text-sm">{@name}</p>\n    """\n  end\nend\n`;
    const { text } = maskTemplateHoles(source, "elixir");
    expectShapePreserved(source, text);
    expect(text).not.toContain("defmodule");
    expect(text).toContain(`<p data-ui="text-sm">`);
    expect(text).not.toContain("@name");
  });

  it("mustache-style languages: masks {{ }}, {% %}, and {# #}", () => {
    const source = `{% if x %}<p style="--px: {{ n }}">{{ name }}</p>{# c #}{% endif %}`;
    for (const language of [
      "handlebars",
      "twig",
      "jinja-html",
      "nunjucks",
      "liquid",
      "django-html",
      "vue",
    ]) {
      const { text } = maskTemplateHoles(source, language);
      expectShapePreserved(source, text);
      expect(text, language).not.toMatch(/name|if x|endif/);
      expect(text, language).toContain(`<p style="--px: `);
    }
    expect(maskTemplateHoles(`<p>{x}</p>`, "svelte").text).toBe(`<p>   </p>`);
    expect(maskTemplateHoles(`{#if a}<p>{x}</p>{/if}`, "svelte").text).toMatch(
      /^\s+<p>   <\/p>\s+$/,
    );
  });

  it("parses the masked document with the right tags and attributes", () => {
    const source = `---\nconst x = 1;\n---\n<ui-tabs style="--w: 100%">{list.map((i) => <button data-ui="button" data-button-variant={i.v}>{i.label}</button>)}</ui-tabs>`;
    const masked = maskTemplateHoles(source, "astro");
    const parsed = parseHtml(masked.text);
    expect(parsed.tags.map((t) => t.name)).toEqual(["ui-tabs", "button"]);
    const button = parsed.tags[1];
    expect(button.attributes.map((a) => a.key?.value)).toEqual(["data-ui", "data-button-variant"]);
  });

  it("keeps UTF-16 offsets when the markup has astral characters", () => {
    const source = `<p title="😀">{x}</p>`;
    const { text, holes } = maskTemplateHoles(source, "astro");
    expect(text.length).toBe(source.length);
    expect(holes).toEqual([[source.indexOf("{"), source.indexOf("}") + 1]]);
    expect(text).toBe(`<p title="😀">   </p>`);
  });

  it("lists the languages it understands", () => {
    expect(HOLE_LANGUAGES).toEqual(
      expect.arrayContaining([
        "astro",
        "vue",
        "svelte",
        "razor",
        "aspnetcorerazor",
        "asp",
        "erb",
        "php",
        "phoenix-heex",
        "html-eex",
        "elixir",
        "handlebars",
        "twig",
        "liquid",
      ]),
    );
    expect(HOLE_LANGUAGES).not.toContain("html");
  });
});

describe("overlapsHole", () => {
  it("is true when a range touches any hole", () => {
    const holes: [number, number][] = [
      [5, 10],
      [20, 25],
    ];
    expect(overlapsHole(holes, [0, 5])).toBe(false);
    expect(overlapsHole(holes, [9, 12])).toBe(true);
    expect(overlapsHole(holes, [10, 20])).toBe(false);
    expect(overlapsHole(holes, [22, 23])).toBe(true);
    expect(overlapsHole([], [0, 100])).toBe(false);
  });
});

describe("parseHtml with a language id", () => {
  it("audits the markup, not the template code, and never formats a value with a hole", async () => {
    const { diagnose } = await import("../service/diagnostics.ts");
    const { styleEdits } = await import("../service/format.ts");
    const parsed = parseHtml(
      `@if (ok) {\n<p style="--foo: 4"></p>\n<p style="--px: @n; --py:4"></p>\n}`,
      "razor",
    );
    expect(parsed.holes.length).toBeGreaterThan(0);
    const findings = diagnose(parsed);
    // the real mistake (`--foo`) is reported; nothing is reported inside a hole
    expect(findings.some((f) => f.rule === "unknown-utility")).toBe(true);
    for (const f of findings) expect(overlapsHole(parsed.holes, f.range)).toBe(false);
    // the second style holds a hole: its formatting edit touches the hole, so the server drops it
    const edits = styleEdits(parsed);
    const second = edits.find((e) => e.range[0] > parsed.text.indexOf("--py"));
    expect(second === undefined || overlapsHole(parsed.holes, second.range)).toBe(true);
    expect(parseHtml("<p>x</p>").holes).toEqual([]);
  });
});
