/**
 * @fileoverview The lint rules raise the `<ui-debug>` audit's findings on the
 * declaration or attribute they are about, with its fixes and suggestions.
 */

import html from "@html-eslint/eslint-plugin";
import { Linter } from "eslint";
import { describe, expect, it } from "vite-plus/test";
import zazz from "./index.ts";

const linter = new Linter({ configType: "flat" });
const configWith = (rules: Linter.RulesRecord) =>
  [
    { files: ["**/*.html"], plugins: { html, zazz }, language: "html/html", rules },
  ] as Linter.Config[];
// the audit cases write styles on one line; style-format has its own config
const config = configWith({
  ...zazz.configs.recommended.rules,
  "zazz/style-format": "off",
});
const formatConfig = configWith({ "zazz/style-format": "warn" });

function lint(code: string) {
  return linter.verify(code, config, "page.html");
}

/** `[rule, underlined text]` per message. */
function findings(code: string): [string, string][] {
  const lines = code.split("\n");
  const offset = (line: number, column: number) =>
    lines.slice(0, line - 1).reduce((sum, text) => sum + text.length + 1, 0) + column - 1;
  return lint(code).map((message) => [
    message.ruleId!.replace("zazz/", ""),
    code.slice(offset(message.line, message.column), offset(message.endLine!, message.endColumn!)),
  ]);
}

describe("@zazz-ui/eslint-plugin", () => {
  it("is silent on well-formed markup", () => {
    expect(
      lint(
        `<div data-ui="button" data-button-variant="ghost" style="--w: 4; --w--md: 6rem; --bg: red; --bg--hover: blue"></div>`,
      ),
    ).toEqual([]);
  });

  it("underlines the declaration in style, across lines", () => {
    const code = `<span\n  style="\n    --text: red;\n    --font-weight: 300;\n    --grid-cols: 1fr 2fr;\n    --foo: 1\n  "\n></span>`;
    expect(findings(code)).toEqual([
      ["not-integer", "--grid-cols: 1fr 2fr"],
      ["unknown-utility", "--foo: 1"],
    ]);
    expect(lint(code)[0]).toMatchObject({ line: 5, column: 5 });
  });

  it("reports the same messages as <ui-debug>", () => {
    expect(lint(`<div style="--w--md: 4"></div>`).map((m) => m.message)).toEqual([
      "`--w--md` has no base `--w`; the tier only overrides a base.",
    ]);
  });

  it("reads identities and hooks from the generated lint data", () => {
    expect(findings(`<button data-ui="button" style="--bg: red"></button>`)).toEqual(
      expect.arrayContaining([["flattens-state", "--bg: red"]]),
    );
    expect(findings(`<button data-button-variant="primary"></button>`)).toEqual([
      ["attribute-outside-identity", `data-button-variant="primary"`],
    ]);
    expect(lint(`<div data-ui="dialog"><div><h2 data-dialog-size="sm"></h2></div></div>`)).toEqual(
      [],
    );
  });

  it("checks border colors without a browser", () => {
    expect(findings(`<div style="--border: 1px solid red; --border-b: rde"></div>`)).toEqual([
      ["border-value", "--border: 1px solid red"],
      ["border-value", "--border-b: rde"],
    ]);
    expect(lint(`<div style="--border: currentColor; --border-t: rebeccapurple"></div>`)).toEqual(
      [],
    );
  });

  it("fixes whitespace before the colon and suggests the template form", () => {
    const fixed = linter.verifyAndFix(`<div style="--w  : 4"></div>`, config, "page.html");
    expect(fixed.output).toBe(`<div style="--w: 4"></div>`);
    const [message] = lint(`<div style="--grid-cols: 1fr 1fr"></div>`);
    expect(message!.suggestions?.[0]?.desc).toBe("Write `--grid-template-cols: 1fr 1fr`.");
    expect(message!.suggestions?.[0]?.fix.text).toBe("--grid-template-cols: 1fr 1fr");
  });

  it("checks data-ui-persist on whole pages only", () => {
    expect(lint(`<div data-ui-persist="cart"></div>`)).toEqual([]);
    expect(findings(`<html><body><div data-ui-persist="cart"></div></body></html>`)).toEqual([
      ["persist", `data-ui-persist="cart"`],
    ]);
    expect(
      findings(
        `<html data-ui-navigation="swap"><body><p data-ui-persist="a"></p><p data-ui-persist="a"></p><section data-ui-persist="outer"><span data-ui-persist="inner"></span></section></body></html>`,
      ).map(([, text]) => text),
    ).toEqual([`data-ui-persist="a"`, `data-ui-persist="inner"`]);
  });

  it("skips <ui-debug>", () => {
    expect(lint(`<ui-debug data-debug-domains="localhost" style="--foo: 1"></ui-debug>`)).toEqual(
      [],
    );
  });

  describe("style-format", () => {
    const format = (code: string) => linter.verifyAndFix(code, formatConfig, "page.html");

    it("reorders into cascade order on fix", () => {
      const code = `<div\n  style="\n    --text: red;\n    --p: 4;\n    --display: flex;\n  "\n></div>`;
      expect(linter.verify(code, formatConfig, "page.html").map((m) => m.message)).toEqual([
        "Style utilities are not formatted (cascade order, one per line).",
      ]);
      expect(format(code).output).toBe(
        `<div\n  style="\n    --display: flex;\n    --p: 4;\n    --text: red;\n  "\n></div>`,
      );
    });

    it("indents from the attribute when the tag is already broken across lines", () => {
      expect(format(`<div\n  id="x"\n  style="--b: 2; --a: 1"\n>`).output).toBe(
        `<div\n  id="x"\n  style="\n    --b: 2;\n    --a: 1;\n  "\n>`,
      );
    });

    it("leaves comments, scripts, and text that only looks like an attribute alone", () => {
      const code = `<!-- <a style="--p: 1; --display: flex"> --><script>el.setAttribute("style", "--p: 1; --display: flex")</script><code>style="--p: 1; --display: flex"</code>`;
      expect(format(code).output).toBe(code);
    });

    it("expands a one-line style under the tag's indent", () => {
      expect(format(`  <p style="--py:2;--px: 4">a</p>`).output).toBe(
        `  <p style="\n      --px: 4;\n      --py: 2;\n    ">a</p>`,
      );
    });

    it("is silent on a formatted style and on a single declaration", () => {
      expect(
        linter.verify(
          `<p\n  style="\n    --px: 4;\n    --py: 2;\n  "\n>a</p><p style="--px: 4">b</p>`,
          formatConfig,
          "page.html",
        ),
      ).toEqual([]);
    });
  });
});
