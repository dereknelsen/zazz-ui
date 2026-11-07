"use strict";

/**
 * @fileoverview The CSP fallback (`base/csp.ts`) in a document whose policy
 * blocks inline style attributes: a same-origin `srcdoc` iframe carrying
 * `<meta http-equiv="Content-Security-Policy" content="style-src-attr 'none'">`
 * and the kit's CSS in a `<style>`. There the attribute text is in the DOM
 * and no utility applies; the fallback copies it into the CSSOM, which the
 * policy does not govern, and the generated rules read it as usual.
 */

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { kitCss } from "../../test/browser.ts";
import { Csp } from "./csp.ts";

const css = kitCss();

let frame: HTMLIFrameElement;
let doc: Document;

function load(body: string): Promise<void> {
  frame = document.createElement("iframe");
  frame.style.width = "1000px";
  frame.srcdoc = `<!doctype html><html><head>
    <meta http-equiv="Content-Security-Policy" content="style-src-attr 'none'">
    <style>${css}</style>
  </head><body>${body}</body></html>`;
  const loaded = new Promise<void>((done) => frame.addEventListener("load", () => done()));
  document.body.append(frame);
  return loaded.then(() => {
    doc = frame.contentDocument!;
  });
}

const padding = (el: Element) =>
  parseFloat(doc.defaultView!.getComputedStyle(el).getPropertyValue("padding-inline-start"));

/** `n × --spacing` in the iframe's document, measured through the CSSOM (the attribute is blocked there). */
function scale(n: number): number {
  const probe = doc.createElement("div");
  probe.style.setProperty("padding-inline-start", `calc(var(--spacing) * ${n})`);
  doc.body.append(probe);
  const px = padding(probe);
  probe.remove();
  return px;
}

describe("CSP fallback", () => {
  beforeEach(() => load(`<div data-probe style="--px: 4; --bg: red !important">x</div>`));
  afterEach(() => {
    Csp.stop();
    frame.remove();
  });

  it("sees the blocked state: the attribute is in the DOM and nothing applies", () => {
    const probe = doc.querySelector<HTMLElement>("[data-probe]")!;
    expect(probe.getAttribute("style")).toBe("--px: 4; --bg: red !important");
    expect(probe.style.length).toBe(0);
    expect(padding(probe)).toBe(0);
    expect(Csp.blockedInlineStyles(doc)).toBe(true);
    expect(Csp.blockedInlineStyles(document)).toBe(false);
  });

  it("applies the attribute through the CSSOM, priority included", () => {
    const probe = doc.querySelector<HTMLElement>("[data-probe]")!;
    Csp.applyInlineStyles(probe);
    expect(probe.style.getPropertyValue("--px")).toBe("4");
    expect(probe.style.getPropertyPriority("--bg")).toBe("important");
    expect(padding(probe)).toBeCloseTo(scale(4), 1);
    // --bg emits a relative oklch(), so compare the resolved color to red's
    expect(doc.defaultView!.getComputedStyle(probe).backgroundColor).toMatch(/^oklch\(0\.6/);
    expect(Csp.blockedInlineStyles(doc)).toBe(false);
  });

  it("applies everything under the root, then attributes written and nodes added later", async () => {
    Csp.start(doc.body);
    const probe = doc.querySelector<HTMLElement>("[data-probe]")!;
    expect(padding(probe)).toBeCloseTo(scale(4), 1);
    // a blocked setAttribute leaves the old block behind; the observer resyncs it to the attribute
    probe.setAttribute("style", "--px: 8");
    await new Promise((done) => setTimeout(done));
    expect(padding(probe)).toBeCloseTo(scale(8), 1);
    expect(probe.style.getPropertyValue("--bg")).toBe("");
    doc.body.insertAdjacentHTML(
      "beforeend",
      `<section><p data-late style="--px: 2">y</p></section>`,
    );
    await new Promise((done) => setTimeout(done));
    expect(padding(doc.querySelector("[data-late]")!)).toBeCloseTo(scale(2), 1);
  });

  it('leaves data-ui-guard="off" alone', () => {
    doc.body.insertAdjacentHTML(
      "beforeend",
      `<p data-off data-ui-guard="off" style="--px: 2">z</p>`,
    );
    Csp.start(doc.body);
    expect(padding(doc.querySelector("[data-off]")!)).toBe(0);
  });
});

/** Before the runtime starts, or where it never loads: only rules that match the attribute's text apply. */
describe("under a blocked style attribute, with no runtime", () => {
  const computed = (selector: string, property: string) =>
    doc.defaultView!.getComputedStyle(doc.querySelector(selector)!).getPropertyValue(property);

  beforeEach(() =>
    load(`
      <div data-pile style="--display: grid-pile"><i data-kid>a</i><i>b</i></div>
      <div data-pile-md style="--display: block; --display--md: grid-pile"><i data-kid-md>a</i></div>
      <div data-pile-ended style="--display: grid-pile; --display--md: block"><i data-kid-ended>a</i></div>
      <div data-cut style="--text-wrap: truncate">long text</div>
      <div data-cut-md style="--text-wrap--md: truncate">long text</div>
      <div data-cut-ended style="--text-wrap: truncate; --text-wrap--md: none">long text</div>
      <span data-sr style="--sr: only">hidden</span>
    `),
  );
  afterEach(() => frame.remove());

  it("a pile applies at the base and at a tier, and ends at a tier", () => {
    expect(computed("[data-pile]", "display")).toBe("grid");
    expect(computed("[data-pile]", "align-items")).toBe("center");
    expect(computed("[data-kid]", "grid-row-start")).toBe("1");
    expect(computed("[data-pile-md]", "display")).toBe("grid");
    expect(computed("[data-kid-md]", "grid-row-start")).toBe("1");
    // the tier's own display is a value only the runtime can read; the pile still ends
    expect(computed("[data-pile-ended]", "display")).toBe("grid");
    expect(computed("[data-pile-ended]", "align-items")).toBe("normal");
    expect(computed("[data-kid-ended]", "grid-row-start")).toBe("auto");
  });

  it("truncate applies whole at the base and at a tier, and ends at a tier", () => {
    for (const selector of ["[data-cut]", "[data-cut-md]"]) {
      expect(computed(selector, "text-wrap-mode"), selector).toBe("nowrap");
      expect(computed(selector, "overflow-x"), selector).toBe("hidden");
      expect(computed(selector, "text-overflow"), selector).toBe("ellipsis");
    }
    expect(computed("[data-cut-ended]", "text-wrap-mode")).toBe("wrap");
    expect(computed("[data-cut-ended]", "overflow-x")).toBe("visible");
  });

  it("--sr hides", () => {
    expect(computed("[data-sr]", "position")).toBe("absolute");
    expect(computed("[data-sr]", "inline-size")).toBe("1px");
  });
});
