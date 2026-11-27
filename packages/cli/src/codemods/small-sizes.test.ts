"use strict";

/**
 * @fileoverview The `small-sizes` codemod's pure parts: removing the small
 * control sizes from markup, listing what it can't rewrite, and the stylesheet
 * that keeps them for a project that wants them back.
 */

import { describe, expect, it } from "vite-plus/test";
import { hasRestoredSmallSizes, removeSmallSizes, smallSizesCss } from "./small-sizes.ts";

const out = (source: string) => removeSmallSizes(source).output;

describe("removeSmallSizes", () => {
  it("drops sm, and icon-sm becomes icon, on buttons and toggles", () => {
    expect(out(`<button data-ui="button" data-button-size="sm">a</button>`)).toBe(
      `<button data-ui="button">a</button>`,
    );
    expect(
      out(`<button data-ui="button" data-button-size="icon-sm" aria-label="x"></button>`),
    ).toBe(`<button data-ui="button" data-button-size="icon" aria-label="x"></button>`);
    expect(out(`<label data-ui="toggle" data-toggle-size="sm">a</label>`)).toBe(
      `<label data-ui="toggle">a</label>`,
    );
    expect(out(`<label data-ui="toggle" data-toggle-size="icon-sm">a</label>`)).toBe(
      `<label data-ui="toggle" data-toggle-size="icon">a</label>`,
    );
  });

  it("handles single, escaped, and own-line attributes, and counts each place", () => {
    expect(out(`<a data-ui='button' data-button-size='sm'>a</a>`)).toBe(
      `<a data-ui='button'>a</a>`,
    );
    expect(out(`const html = "<b data-button-size=\\"sm\\"></b>";`)).toBe(
      `const html = "<b></b>";`,
    );
    const source = `<button\n  data-ui="button"\n  data-button-size="sm"\n  type="button"\n>a</button>\n<button data-button-size="icon-sm"></button>`;
    const result = removeSmallSizes(source);
    expect(result.output).toBe(
      `<button\n  data-ui="button"\n  type="button"\n>a</button>\n<button data-button-size="icon"></button>`,
    );
    expect(result.count).toBe(2);
  });

  it("rewrites unquoted values, spaces around the equals sign, and any case", () => {
    expect(out(`<button data-button-size=sm>a</button>`)).toBe(`<button>a</button>`);
    expect(out(`<button data-button-size = "icon-sm">a</button>`)).toBe(
      `<button data-button-size="icon">a</button>`,
    );
    expect(out(`<BUTTON DATA-BUTTON-SIZE="sm">a</BUTTON>`)).toBe(`<BUTTON>a</BUTTON>`);
  });

  it("lists object-literal props and Vue bindings once each", () => {
    const source = [
      `h("button", { "data-button-size": "sm" });`,
      `<button :data-button-size="small ? 'sm' : undefined"></button>`,
      `<button v-bind:data-toggle-size="'icon-sm'"></button>`,
    ].join("\n");
    const result = removeSmallSizes(source);
    expect(result.output).toBe(source);
    expect(result.review.map((item) => item.line)).toEqual([1, 2, 3]);
  });

  it("leaves other sizes, other attributes, and the data-font role alone", () => {
    const source = `<dialog data-dialog-size="sm"></dialog><table data-table-size="sm"></table><p data-font="sm"></p><button data-button-size="icon"></button>`;
    expect(out(source)).toBe(source);
  });

  it("lists what it can't rewrite: selectors, script, and template values", () => {
    const source = [
      `[data-button-size="sm"] { color: red }`,
      `button.dataset.buttonSize = "sm";`,
      `el.setAttribute("data-toggle-size", "icon-sm");`,
      `<button data-button-size={small ? "sm" : undefined}></button>`,
    ].join("\n");
    const result = removeSmallSizes(source);
    expect(result.output).toBe(source);
    expect(result.review.map((item) => item.line)).toEqual([1, 2, 3, 4]);
  });
});

describe("smallSizesCss", () => {
  it("restores sm and icon-sm for the button and the toggle, in the components layer", () => {
    for (const primitive of ["button", "toggle"] as const) {
      const css = smallSizesCss(primitive);
      expect(css).toContain("@layer ui.components {");
      expect(css).toContain(`[data-${primitive}-size="sm"]`);
      expect(css).toContain(`[data-${primitive}-size="icon-sm"]`);
      expect(css).toContain("::after");
      expect(hasRestoredSmallSizes(css)).toBe(true);
    }
    // the button group's outer corners follow the small buttons through its hook
    expect(smallSizesCss("button")).toContain("--ui-button-group-radius: var(--radius-sm)");
  });

  it("knows its own restored rules from the kit's (an old kit still ships the sizes)", () => {
    expect(hasRestoredSmallSizes(smallSizesCss("button"))).toBe(true);
    expect(
      hasRestoredSmallSizes(
        `:where([data-ui~="button"][data-button-size="sm"]) { --_button-min-h: 6; }`,
      ),
    ).toBe(false);
  });
});
