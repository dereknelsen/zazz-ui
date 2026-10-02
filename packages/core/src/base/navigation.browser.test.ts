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
