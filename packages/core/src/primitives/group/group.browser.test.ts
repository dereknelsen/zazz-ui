"use strict";

/**
 * @fileoverview Group (`<ui-group>`, `data-ui="group"`): the ancestor whose
 * state its descendants' `--group-*` utilities follow. The tag is a block; the
 * attribute form keeps its host's display.
 */

import { userEvent } from "vite-plus/test/browser";
import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../../test/browser.ts";

const CHILD = `display: block; inline-size: 40px; block-size: 40px; --opacity: 1; --group-opacity--hover: 0.5; --group-opacity--disabled: 0.25`;

describe("group", () => {
  useKit();

  it("the tag is a block; the attribute keeps its host's display", () => {
    const root = mount(
      `<div><ui-group data-tag></ui-group><a data-attr data-ui="group">x</a></div>`,
    );
    expect(style(root.querySelector("[data-tag]")!, "display")).toBe("block");
    expect(style(root.querySelector("[data-attr]")!, "display")).toBe("inline");
  });

  it.each([
    ["the tag", (inner: string) => `<ui-group>${inner}</ui-group>`],
    ["the attribute", (inner: string) => `<div data-ui="group">${inner}</div>`],
  ])("%s drives a descendant's --group-* hover", async (_, wrap) => {
    const root = mount(wrap(`<i data-child style="${CHILD}"></i>`));
    const child = root.querySelector("[data-child]")!;
    expect(style(child, "opacity")).toBe("1");
    await userEvent.hover(root);
    expect(style(child, "opacity")).toBe("0.5");
    await userEvent.unhover(root);
  });

  it("the tag has no :disabled, so aria-disabled drives the disabled form", () => {
    const root = mount(
      `<ui-group role="group" aria-disabled="true"><i data-child style="${CHILD}"></i></ui-group>`,
    );
    expect(style(root.querySelector("[data-child]")!, "opacity")).toBe("0.25");
  });

  it("a parent's own group state reaches through a plain element", async () => {
    const root = mount(`<ui-group><div><i data-child style="${CHILD}"></i></div></ui-group>`);
    await userEvent.hover(root);
    expect(style(root.querySelector("[data-child]")!, "opacity")).toBe("0.5");
    await userEvent.unhover(root);
  });
});
