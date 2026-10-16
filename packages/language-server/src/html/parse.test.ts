import { describe, expect, it } from "vite-plus/test";
import { diagnose } from "../service/diagnostics.ts";
import { parseHtml } from "./parse.ts";

// A masked attribute name (`@onclick="Save"` → `        ="Save"`) or a stray
// `="x"` parses as an attribute with a value and no key.
const NAMELESS: [string, string][] = [
  ["aspnetcorerazor", `<button data-ui="button" @onclick="Save">Go</button>`],
  ["razor", `<input data-ui="input" @bind="Name" />`],
  ["razor", `<div data-ui="card" @attributes="Extra" @ref="card" @key="item.Id"></div>`],
  ["razor", `@foreach (var i in Items) { <li @key="i"></li> }`],
  ["astro", `<b {name}="y"></b>`],
  ["erb", `<b <%= name %>="y"></b>`],
  ["handlebars", `<b {{ name }}="y"></b>`],
  ["html", `<div data-ui="card" ="x"></div>`],
];

describe("parseHtml", () => {
  it.each(NAMELESS)("drops a nameless attribute (%s: %s)", (languageId, source) => {
    const parsed = parseHtml(source, languageId);
    for (const tag of parsed.tags) {
      for (const attribute of tag.attributes) expect(attribute.key?.value).toBeTypeOf("string");
    }
    expect(() => diagnose(parsed)).not.toThrow();
  });

  it("still audits the rest of a tag with a Razor directive attribute", () => {
    const parsed = parseHtml(
      `<button data-ui="button" @onclick="Save" style="--foo: 1">Go</button>`,
      "aspnetcorerazor",
    );
    expect(diagnose(parsed).map((found) => found.rule)).toEqual(["unknown-utility"]);
  });

  it("reads a tag still being typed as no tags rather than throwing", () => {
    // `<a …` with no `>` before the next tag: the parser rejects the whole document
    const source = `<div data-ui="card">\n  <a data-ui="button" href="#"\n</div>`;
    const parsed = parseHtml(source);
    expect(parsed.tags).toEqual([]);
    expect(parsed.text).toBe(source);
    expect(() => diagnose(parsed)).not.toThrow();
  });
});
