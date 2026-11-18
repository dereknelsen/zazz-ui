"use strict";

/**
 * @fileoverview navigation.ts: in-page navigation is
 * opt-in with `data-ui-navigation="swap"` on <html>, swaps the whole body, and
 * keeps only elements marked `data-ui-persist` in both pages.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";

type Handler = () => Promise<void>;
type FakeNavigate = Event & {
  intercept: ReturnType<typeof vi.fn>;
  scroll: ReturnType<typeof vi.fn>;
  handler?: Handler;
  abort: () => void;
};

/** The fake Navigation: an event target with the entry the page is on. */
const navigation = Object.assign(new EventTarget(), { currentEntry: { key: "initial" } });
let keys = 0;

function navigate(
  navigationType: "push" | "replace" | "reload" | "traverse",
  url = new URL("/next", location.href).href,
  sameDocument = false,
  { key = "", sourceElement = null as Element | null } = {},
): FakeNavigate {
  const controller = new AbortController();
  const event = Object.assign(new Event("navigate"), {
    signal: controller.signal,
    abort: () => controller.abort(),
    navigationType,
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    formData: null,
    destination: { url, sameDocument, key },
    sourceElement,
    scroll: vi.fn(),
  }) as unknown as FakeNavigate;
  // Intercepting commits the navigation: the destination becomes the current
  // entry before the handler runs. A traversal lands on its own key and a push
  // gets a fresh one (so does a replace here, which in a browser keeps its key;
  // no test depends on it).
  event.intercept = vi.fn((options: { handler: Handler }) => {
    navigation.currentEntry = { key: key || `entry-${++keys}` };
    event.handler = options.handler;
  });
  return event;
}

/** Serves `html` for the next fetch. */
function serve(html: string, type = "text/html"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(html, { status: 200, headers: { "content-type": type } })),
  );
}

/** Waits `n` animation frames. */
async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
}

const page = (body: string, { swap = true, title = "Next" } = {}) =>
  `<!doctype html><html${swap ? ' data-ui-navigation="swap"' : ""}><head><title>${title}</title></head><body>${body}</body></html>`;

describe("navigation", () => {
  let assign: ReturnType<typeof vi.fn<(url: string | URL) => void>>;

  beforeAll(async () => {
    Object.defineProperty(window, "navigation", { value: navigation, configurable: true });
    await import("./navigation.ts");
  });

  beforeEach(() => {
    assign = vi.fn<(url: string | URL) => void>();
    vi.spyOn(window.location, "replace").mockImplementation(assign);
    document.documentElement.setAttribute("data-ui-navigation", "swap");
    navigation.currentEntry = { key: "initial" };
    document.title = "Current";
    document.body.innerHTML = `<header>old header</header><main><h1>old</h1></main>`;
  });

  afterEach(async () => {
    await frames(2); // let a swap's instant-scroll release run
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-ui-navigation");
  });

  it("leaves every navigation to the browser without the opt-in", () => {
    document.documentElement.removeAttribute("data-ui-navigation");
    const event = navigate("push");
    navigation.dispatchEvent(event);
    expect(event.intercept).not.toHaveBeenCalled();
  });

  it("leaves a reload to the browser even with the opt-in", () => {
    const event = navigate("reload");
    navigation.dispatchEvent(event);
    expect(event.intercept).not.toHaveBeenCalled();
  });

  it("leaves history.pushState and replaceState to the page, which is updating its own URL", () => {
    const url = new URL("?preset=1abc", location.href).href;
    for (const type of ["push", "replace"] as const) {
      const event = navigate(type, url, true);
      navigation.dispatchEvent(event);
      expect(event.intercept).not.toHaveBeenCalled();
    }
  });

  it("still swaps Back and Forward between swapped pages, which share the document", async () => {
    // "initial" is the entry the module loaded into; the push swap makes the second.
    serve(page(`<main><h1>new</h1></main>`));
    const push = navigate("push");
    navigation.dispatchEvent(push);
    await push.handler!();
    const back = navigate("traverse", location.href, true, { key: "initial" });
    navigation.dispatchEvent(back);
    expect(back.intercept).toHaveBeenCalledOnce();
  });

  it("still swaps Back and Forward between swapped pages after a reload", () => {
    // A reload keeps the older entries same-document with the reloaded page, so
    // the entries a previous document swapped into are still ours.
    sessionStorage.setItem("zazz:navigation-entries", JSON.stringify(["before-a", "before-b"]));
    navigation.currentEntry = { key: "before-b" };
    const back = navigate("traverse", location.href, true, { key: "before-a" });
    navigation.dispatchEvent(back);
    expect(back.intercept).toHaveBeenCalledOnce();
    sessionStorage.removeItem("zazz:navigation-entries");
  });

  it("leaves Back and Forward into or out of an entry the page pushed itself to the page", () => {
    // htmx's hx-push-url: history.pushState() made the entry, and htmx restores it on popstate.
    const into = navigate("traverse", location.href, true, { key: "pushed-by-page" });
    navigation.dispatchEvent(into);
    expect(into.intercept).not.toHaveBeenCalled();

    navigation.currentEntry = { key: "pushed-by-page" };
    const outOf = navigate("traverse", location.href, true, { key: "initial" });
    navigation.dispatchEvent(outOf);
    expect(outOf.intercept).not.toHaveBeenCalled();
  });

  it("leaves Back and Forward to an entry a script stamped with history state to that script", async () => {
    // htmx stamps the entry it first swaps on with replaceState({ htmx: true })
    // and restores it from its own navigate handler; a second swap would race it.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const back = navigate("traverse", location.href, true, { key: "initial" });
    navigation.dispatchEvent(back);
    history.replaceState({ htmx: true }, "");
    try {
      await back.handler?.();
    } finally {
      history.replaceState(null, "");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.querySelector("header")!.textContent).toBe("old header");
  });

  it('leaves a navigation from inside data-ui-navigation="off" to the browser', () => {
    document.body.innerHTML = `<div data-ui-navigation="off"><a href="/next">next</a></div><a href="/next">swap</a>`;
    const [off, on] = document.querySelectorAll("a");
    const skipped = navigate("push", undefined, false, { sourceElement: off });
    navigation.dispatchEvent(skipped);
    expect(skipped.intercept).not.toHaveBeenCalled();

    const swapped = navigate("push", undefined, false, { sourceElement: on });
    navigation.dispatchEvent(swapped);
    expect(swapped.intercept).toHaveBeenCalledOnce();
  });

  it('swaps again inside data-ui-navigation="swap" nested in an opted-out region', () => {
    document.body.innerHTML = `<div data-ui-navigation="off"><form data-ui-navigation="swap"><button>go</button></form></div>`;
    const event = navigate("push", undefined, false, {
      sourceElement: document.querySelector("button"),
    });
    navigation.dispatchEvent(event);
    expect(event.intercept).toHaveBeenCalledOnce();
  });

  it("swaps the whole body and the title, so the header updates too", async () => {
    serve(page(`<header>new header</header><main><h1>new</h1></main>`));
    const event = navigate("push");
    navigation.dispatchEvent(event);
    expect(event.intercept).toHaveBeenCalledOnce();
    await event.handler!();
    expect(document.querySelector("header")!.textContent).toBe("new header");
    expect(document.querySelector("h1")!.textContent).toBe("new");
    expect(document.title).toBe("Next");
    expect(document.activeElement).toBe(document.querySelector("h1"));
  });

  it("brings the destination's head styles along, once each, before the swap", async () => {
    const shared = document.createElement("style");
    shared.textContent = ".shared{}";
    document.head.append(shared);
    try {
      serve(
        `<!doctype html><html data-ui-navigation="swap"><head><title>Next</title>` +
          `<style>.shared{}</style>` +
          `<style>.fc-clip{color:red}</style></head><body><main><h1>new</h1></main></body></html>`,
      );
      const event = navigate("push");
      navigation.dispatchEvent(event);
      await event.handler!();
      const styles = [...document.head.querySelectorAll("style")].map((el) => el.textContent);
      expect(styles.filter((text) => text === ".fc-clip{color:red}")).toHaveLength(1);
      expect(styles.filter((text) => text === ".shared{}")).toHaveLength(1);
    } finally {
      for (const el of document.head.querySelectorAll("style")) el.remove();
    }
  });

  it("scrolls the window instantly, even under scroll-behavior: smooth, then restores it", async () => {
    document.documentElement.style.scrollBehavior = "smooth";
    serve(page(`<main><h1>new</h1></main>`));
    const event = navigate("push");
    let during = "";
    event.scroll.mockImplementation(() => {
      during = document.documentElement.style.scrollBehavior;
    });
    navigation.dispatchEvent(event);
    await event.handler!();
    expect(event.scroll).toHaveBeenCalledOnce();
    expect(during).toBe("auto");
    await frames(2);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
    document.documentElement.style.removeProperty("scroll-behavior");
  });

  it("restores scroll-behavior once when navigations overlap", async () => {
    document.documentElement.style.scrollBehavior = "smooth";
    serve(page(`<main><h1>new</h1></main>`));
    const first = navigate("push");
    const second = navigate("push");
    navigation.dispatchEvent(first);
    navigation.dispatchEvent(second);
    await Promise.all([first.handler!(), second.handler!()]);
    await frames(4);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
    document.documentElement.style.removeProperty("scroll-behavior");
  });

  it("drops a navigation aborted while its page loads, without a full load", async () => {
    serve(page(`<header>late</header><main><h1>late</h1></main>`));
    const event = navigate("push");
    navigation.dispatchEvent(event);
    event.abort();
    await event.handler!().catch(() => {});
    expect(document.querySelector("header")!.textContent).toBe("old header");
    expect(assign).not.toHaveBeenCalled();
  });

  it("keeps a persisted element's live node where the new page places it", async () => {
    document.body.innerHTML = `<header><div data-ui-persist="cart">3 items</div></header><main></main><aside data-ui-persist="gone">x</aside>`;
    const live = document.querySelector('[data-ui-persist="cart"]')!;
    serve(
      page(`<main><h1>new</h1></main><footer><div data-ui-persist="cart">0 items</div></footer>`),
    );
    const event = navigate("push");
    navigation.dispatchEvent(event);
    await event.handler!();
    const cart = document.querySelector('[data-ui-persist="cart"]')!;
    expect(cart).toBe(live);
    expect(cart.textContent).toBe("3 items");
    expect(cart.parentElement!.tagName).toBe("FOOTER");
    expect(document.querySelectorAll('[data-ui-persist="cart"]')).toHaveLength(1);
    expect(document.querySelector('[data-ui-persist="gone"]')).toBeNull();
  });

  it("hands a destination without the opt-in back to the browser for a full load", async () => {
    const url = new URL("/plain", location.href).href;
    serve(page(`<main>plain</main>`, { swap: false }));
    const event = navigate("push", url);
    navigation.dispatchEvent(event);
    await event.handler!();
    expect(assign).toHaveBeenCalledWith(url);
    expect(document.querySelector("header")!.textContent).toBe("old header");
  });

  it("leaves a link to a non-page file to the browser, so history stays clean", () => {
    const event = navigate("push", new URL("/llms.txt", location.href).href);
    navigation.dispatchEvent(event);
    expect(event.intercept).not.toHaveBeenCalled();
  });

  it("replaces the intercepted entry when the response is not HTML", async () => {
    const url = new URL("/notes", location.href).href;
    serve("# plain", "text/markdown");
    const event = navigate("push", url);
    navigation.dispatchEvent(event);
    await event.handler!();
    expect(assign).toHaveBeenCalledWith(url);
    expect(document.querySelector("header")!.textContent).toBe("old header");
  });
});
