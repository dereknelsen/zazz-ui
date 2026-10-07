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

function navigate(
  navigationType: "push" | "replace" | "reload" | "traverse",
  url = new URL("/next", location.href).href,
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
    destination: { url },
    scroll: vi.fn(),
  }) as unknown as FakeNavigate;
  event.intercept = vi.fn((options: { handler: Handler }) => {
    event.handler = options.handler;
  });
  return event;
}

/** Serves `html` for the next fetch. */
function serve(html: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    ),
  );
}

/** Waits `n` animation frames. */
async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
}

const page = (body: string, { swap = true, title = "Next" } = {}) =>
  `<!doctype html><html${swap ? ' data-ui-navigation="swap"' : ""}><head><title>${title}</title></head><body>${body}</body></html>`;

describe("navigation", () => {
  const navigation = new EventTarget();
  let assign: ReturnType<typeof vi.fn<(url: string | URL) => void>>;

  beforeAll(async () => {
    Object.defineProperty(window, "navigation", { value: navigation, configurable: true });
    await import("./navigation.ts");
  });

  beforeEach(() => {
    assign = vi.fn<(url: string | URL) => void>();
    vi.spyOn(window.location, "assign").mockImplementation(assign);
    document.documentElement.setAttribute("data-ui-navigation", "swap");
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
});
