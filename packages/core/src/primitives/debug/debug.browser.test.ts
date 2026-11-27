"use strict";

/**
 * @fileoverview `<ui-debug>` reading the page's own stylesheets, which only a
 * real browser loads: the roles in an `@import`ed sheet count, as on a page
 * that loads `index.css` unbundled.
 */

import { afterEach, describe, expect, it } from "vite-plus/test";
import { audit } from "./debug.ts";

/** Adds a `<style>` and waits for the sheets it imports to load. */
async function addStyle(css: string): Promise<HTMLStyleElement> {
  const el = document.createElement("style");
  const loaded = new Promise((resolve) => el.addEventListener("load", resolve, { once: true }));
  el.textContent = css;
  document.head.append(el);
  await loaded;
  return el;
}

const fontRole = (html: string): string[] => {
  document.body.innerHTML = html;
  return audit(document.body.firstElementChild!)
    .filter((warning) => warning.rule === "font-role")
    .map((warning) => warning.message);
};

describe("ui-debug stylesheet reading", () => {
  const added: Element[] = [];
  const urls: string[] = [];
  afterEach(() => {
    for (const el of added.splice(0)) el.remove();
    for (const url of urls.splice(0)) URL.revokeObjectURL(url);
    document.body.innerHTML = "";
  });

  it("reports a data-font role when no readable sheet styles it", () => {
    expect(fontRole(`<p data-font="sm">a</p>`)).toHaveLength(1);
  });

  it("finds the roles in an @imported sheet", async () => {
    // a blob: URL is same-origin; WebKit treats a data: sheet as cross-origin and won't let it be read
    const url = URL.createObjectURL(
      new Blob([`:where([data-font="sm"]) { font-size: 0.8rem; }`], { type: "text/css" }),
    );
    urls.push(url);
    added.push(await addStyle(`@import url("${url}");`));
    expect(fontRole(`<p data-font="sm">a</p>`)).toEqual([]);
    expect(fontRole(`<p data-font="huge">a</p>`), "a role the import lacks").toHaveLength(1);
  });
});
