"use strict";

/**
 * @fileoverview Style guard: utilities survive a `style` rewrite; a single
 * removeProperty stays removed; `data-ui-guard="off"` opts out; a per-frame
 * writer never loops the guard.
 */

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { StyleGuard } from "./style-guard.ts";

/** A macrotask: MutationObserver callbacks have flushed by then. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe("style guard", () => {
  beforeEach(() => {
    StyleGuard.start(document.body);
  });
  afterEach(() => {
    StyleGuard.stop();
    document.body.innerHTML = "";
  });

  it("restores utilities after setAttribute('style', …) drops them all", async () => {
    const el = mount(`<div style="--p: 4; --display: grid">x</div>`);
    await flush();
    el.setAttribute("style", "display: none");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("4");
    expect(el.style.getPropertyValue("--display")).toBe("grid");
    expect(el.style.display).toBe("none");
  });

  it("restores utilities after style.cssText drops them all", async () => {
    const el = mount(`<div style="--p: 4">x</div>`);
    await flush();
    el.style.cssText = "color: red";
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("4");
    expect(el.style.color).toBe("red");
  });

  it("leaves a single removeProperty alone", async () => {
    const el = mount(`<div style="--p: 4; --display: grid">x</div>`);
    await flush();
    el.style.removeProperty("--p");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("");
    expect(el.style.getPropertyValue("--display")).toBe("grid");
  });

  it('skips an element with data-ui-guard="off"', async () => {
    const el = mount(`<div data-ui-guard="off" style="--p: 4">x</div>`);
    await flush();
    el.setAttribute("style", "display: none");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("");
  });

  it("leaves a single removeProperty alone even when it was the only utility", async () => {
    const el = mount(`<div style="color: red; --p: 4">x</div>`);
    await flush();
    el.style.removeProperty("--p");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("");
    expect(el.style.color).toBe("red");
  });

  it("snapshots an element added after start from the write's old value, with !important", async () => {
    await flush();
    const el = document.createElement("div");
    el.setAttribute("style", "--p: 4 !important; --gap: 2");
    document.body.append(el);
    await flush();
    el.setAttribute("style", "display: none");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("4");
    expect(el.style.getPropertyPriority("--p")).toBe("important");
    expect(el.style.getPropertyValue("--gap")).toBe("2");
  });

  it("treats a rewrite that sets new utilities as the new snapshot", async () => {
    const el = mount(`<div style="--p: 4">x</div>`);
    await flush();
    el.setAttribute("style", "--m: 2");
    await flush();
    expect(el.style.getPropertyValue("--p")).toBe("");
    expect(el.style.getPropertyValue("--m")).toBe("2");
  });

  it("restore() re-applies the snapshot by hand and start() re-roots", async () => {
    const el = mount(`<div><span style="--p: 4">x</span></div>`);
    const span = el.firstElementChild as HTMLElement;
    StyleGuard.start(el); // re-roots onto the mounted tree and snapshots it
    await flush();
    StyleGuard.stop();
    span.setAttribute("style", "display: none");
    await flush();
    expect(span.style.getPropertyValue("--p")).toBe("");
    StyleGuard.restore(span);
    expect(span.style.getPropertyValue("--p")).toBe("4");
    StyleGuard.start(el);
    span.setAttribute("style", "color: red");
    await flush();
    expect(span.style.getPropertyValue("--p")).toBe("4");
  });

  it("does not loop with a per-frame writer", async () => {
    const el = mount(`<div style="--p: 4">x</div>`);
    await flush();
    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
    for (let frame = 0; frame < 5; frame++) {
      el.style.cssText = `opacity: ${frame / 10}`;
      await flush();
    }
    observer.disconnect();
    expect(el.style.getPropertyValue("--p")).toBe("4");
    // one write per frame from the writer, at most one restore each
    expect(writes).toBeLessThanOrEqual(10);
  });
});
