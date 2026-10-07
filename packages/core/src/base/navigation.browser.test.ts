"use strict";

/**
 * @fileoverview The body swap in a real browser: a persisted element
 * is moved, not re-created, and a persisted Zazz element keeps its setup (no
 * teardown and re-setup) where `moveBefore()` exists.
 */

import { describe, expect, it } from "vite-plus/test";
import { ZazzElement, defineZazzElement } from "./zazz-element.ts";
import { swapBody } from "./navigation.ts";

const calls = new WeakMap<Element, { setup: number; teardown: number }>();
class PersistProbe extends ZazzElement {
  protected setup(): void {
    const c = calls.get(this) ?? { setup: 0, teardown: 0 };
    c.setup++;
    calls.set(this, c);
  }
  protected teardown(): void {
    calls.get(this)!.teardown++;
  }
}
defineZazzElement("persist-probe", PersistProbe);

const parse = (html: string) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;

describe("swapBody", () => {
  it("moves a persisted element into the new page without re-creating it", () => {
    document.body.innerHTML = `<header>old</header><div data-ui-persist="cart">live</div>`;
    const live = document.querySelector('[data-ui-persist="cart"]')!;
    const body = swapBody(
      parse(`<header>new</header><main><div data-ui-persist="cart">fresh</div></main>`),
    );
    expect(document.body).toBe(body);
    expect(document.querySelectorAll("body")).toHaveLength(1);
    expect(document.querySelector("header")!.textContent).toBe("new");
    expect(document.querySelector('[data-ui-persist="cart"]')).toBe(live);
    expect(live.textContent).toBe("live");
    expect(live.parentElement!.tagName).toBe("MAIN");
  });

  it("keeps the scroll offsets of a persisted element and its scrollers", () => {
    const scroller = (tag: string) =>
      `<${tag} style="display: block; block-size: 100px; overflow: auto"><div style="block-size: 1000px; inline-size: 1000px"></div></${tag}>`;
    const side = (inner: string) =>
      `<aside data-ui-persist="side" style="display: block; block-size: 100px; overflow: auto"><div style="block-size: 1000px">${inner}</div></aside>`;
    document.body.innerHTML = side(scroller("nav"));
    const live = document.querySelector<HTMLElement>("aside")!;
    const inner = live.querySelector<HTMLElement>("nav")!;
    live.scrollTop = 300;
    inner.scrollTop = 120;
    inner.scrollLeft = 40;
    swapBody(parse(`<main>${side(scroller("nav"))}</main>`));
    expect(document.querySelector("aside")).toBe(live);
    expect(live.scrollTop).toBe(300);
    expect([inner.scrollTop, inner.scrollLeft]).toEqual([120, 40]);
  });

  it("renders a data-ui-persist-scroll element fresh, at the old element's scroll offset", () => {
    const side = (label: string, id = "side") =>
      `<aside data-ui-persist-scroll="${id}" style="display: block; block-size: 100px; overflow: auto"><div style="block-size: 1000px">${label}</div></aside>`;
    document.body.innerHTML = side("old") + side("other", "other");
    const [old, other] = document.querySelectorAll<HTMLElement>("aside");
    old!.scrollTop = 300;
    other!.scrollTop = 200;
    swapBody(parse(`<main>${side("new")}${side("new other", "elsewhere")}</main>`));
    const [fresh, elsewhere] = document.querySelectorAll<HTMLElement>("aside");
    expect(fresh).not.toBe(old);
    expect(fresh!.textContent).toBe("new");
    expect(fresh!.scrollTop).toBe(300);
    expect(elsewhere!.scrollTop).toBe(0);
  });

  it("takes aria-current on its links from the destination's copy", () => {
    const nav = (a: string, b: string, extra = "") =>
      `<nav data-ui-persist="nav"><a href="/" ${a}>Logo</a><a href="/">Home</a><a href="/docs/" ${b}>Docs</a>${extra}</nav>`;
    document.body.innerHTML = nav(
      'aria-current="page"',
      "",
      '<a href="/gone/" aria-current="page">Gone</a>',
    );
    const live = document.querySelector("nav")!;
    swapBody(parse(`<header>${nav("", 'aria-current="page"')}</header>`));
    expect(document.querySelector("nav")).toBe(live);
    const current = [...live.querySelectorAll("a")].map((a) => a.getAttribute("aria-current"));
    expect(current).toEqual([null, null, "page", null]);

    swapBody(
      parse(`<header>${nav("", "").replace('">Home', '" aria-current="true">Home')}</header>`),
    );
    expect([...live.querySelectorAll("a")].map((a) => a.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
      null,
    ]);
  });

  it.skipIf(!("moveBefore" in Element.prototype))(
    "keeps a persisted Zazz element set up across the swap",
    () => {
      document.body.innerHTML = `<persist-probe data-ui-persist="probe"></persist-probe>`;
      const live = document.querySelector("persist-probe")!;
      expect(calls.get(live)).toEqual({ setup: 1, teardown: 0 });
      swapBody(parse(`<main><persist-probe data-ui-persist="probe"></persist-probe></main>`));
      expect(document.querySelector("persist-probe")).toBe(live);
      expect(calls.get(live)).toEqual({ setup: 1, teardown: 0 });
    },
  );
});
