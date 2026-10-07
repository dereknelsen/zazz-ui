"use strict";

import { refreshAll } from "./zazz-element.ts";

/**
 * @fileoverview Opt-in in-page navigation via the Navigation API.
 * @description With `<html data-ui-navigation="swap">` on both the current and
 * the destination page, a same-origin navigation fetches the destination and
 * swaps the whole `<body>` in place instead of loading a new document. The
 * browser still owns the URL and history; one `navigate` listener covers link
 * clicks, back/forward, and programmatic navigations.
 *
 * Nothing persists implicitly. An element survives a swap only when it carries
 * `data-ui-persist="<id>"` and the destination has an element with the same id:
 * the live element takes the new one's place, keeping its DOM and state (a toast
 * stack, a playing video, an open mini-cart). Everything else comes from the new
 * page, so headers, footers and current-page links are never stale. A carried
 * element keeps its scroll offsets, and its links take `aria-current` from the
 * destination's copy, so a kept header still marks the current page.
 *
 * An element whose content depends on the page (a section sidebar, a table of
 * contents) should not persist; `data-ui-persist-scroll="<id>"` renders it from
 * the destination and carries only its scroll offset. The window itself
 * scrolls as the browser decides: to the top or the target for a new entry,
 * restored on back/forward.
 *
 * Without the opt-in the browser navigates normally, animated by the CSS
 * cross-document view transitions in `_view-transitions.css`. Reloads, hash
 * changes, downloads and form posts are never intercepted.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/scroll
 */

/** The opt-in, on `<html>` of both pages. */
const SWAP = "swap";

/** True when `doc` opted in to in-page navigation. */
function optedIn(doc: Document): boolean {
  return doc.documentElement.getAttribute("data-ui-navigation") === SWAP;
}

/** `Element.moveBefore` keeps iframes, media and custom elements live; not in every browser yet. */
type Movable = Element & { moveBefore?: (node: Node, child: Node | null) => void };

/**
 * @description Records the scroll offsets of `root` and its scrolled
 * descendants. A plain move (no `moveBefore()`) resets them to zero.
 *
 * @param root - A persisted element, still connected.
 * @returns Each scrolled element with its `scrollTop` and `scrollLeft`.
 * @private
 */
function scrollOffsets(root: Element): [Element, number, number][] {
  const offsets: [Element, number, number][] = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.scrollTop || el.scrollLeft) offsets.push([el, el.scrollTop, el.scrollLeft]);
  }
  return offsets;
}

/**
 * @description Gives the links in a persisted element the `aria-current` of
 * their twins in the destination's copy, so a kept header or sidebar marks the
 * new page. Links pair by `href`, in document order; a link with no twin is not
 * current.
 *
 * @param keep - The live persisted element.
 * @param slot - The destination's element with the same id.
 * @private
 */
function adoptCurrent(keep: Element, slot: Element): void {
  const twins = new Map<string, Element[]>();
  for (const link of slot.querySelectorAll("a[href], area[href]")) {
    const href = link.getAttribute("href")!;
    twins.set(href, [...(twins.get(href) ?? []), link]);
  }
  for (const link of keep.querySelectorAll("a[href], area[href]")) {
    const twin = twins.get(link.getAttribute("href")!)?.shift();
    const current = twin?.getAttribute("aria-current");
    if (current == null) link.removeAttribute("aria-current");
    else link.setAttribute("aria-current", current);
  }
}

/**
 * @description Replaces the current body with `next`, carrying over every
 * `data-ui-persist` element whose id appears in both, scroll offsets included;
 * links in a carried element take `aria-current` from the destination. A
 * `data-ui-persist-scroll` element comes from `next` and takes the scroll
 * offset of the current element with the same id. Returns the new body.
 *
 * @param next - The destination's parsed `<body>`.
 * @private
 */
function swapBody(next: HTMLElement): HTMLElement {
  const current = document.body;
  // Read every scroll offset now, while the layout holds one body: a read once
  // both bodies are connected would lay out the doubled document.
  const live = new Map<string, Element>();
  const offsets: [Element, number, number][] = [];
  for (const el of current.querySelectorAll("[data-ui-persist]")) {
    const id = el.getAttribute("data-ui-persist");
    if (id && !live.has(id)) live.set(id, el);
  }
  for (const keep of live.values()) offsets.push(...scrollOffsets(keep));
  const scrolled = new Map<string, [number, number]>();
  for (const el of current.querySelectorAll("[data-ui-persist-scroll]")) {
    const id = el.getAttribute("data-ui-persist-scroll");
    if (id && !scrolled.has(id)) scrolled.set(id, [el.scrollTop, el.scrollLeft]);
  }

  const body = document.importNode(next, true);
  const placeholders: [Element, Element][] = [];
  for (const slot of body.querySelectorAll("[data-ui-persist]")) {
    const keep = live.get(slot.getAttribute("data-ui-persist") ?? "");
    if (keep) placeholders.push([slot, keep]);
  }
  for (const el of body.querySelectorAll("[data-ui-persist-scroll]")) {
    const id = el.getAttribute("data-ui-persist-scroll") ?? "";
    const offset = scrolled.get(id);
    scrolled.delete(id);
    if (offset) offsets.push([el, ...offset]);
  }

  // Connect the new body beside the old one, move each live element into its
  // slot while both are connected (moveBefore requires that, and then keeps the
  // element's state: no disconnect, no iframe or media reset), then drop the old
  // body. `document.body` is the first body, so it is the new one throughout.
  // Scroll offsets are restored in the same task, before the view transition
  // captures the new state, so a plain move never shows a jump.
  current.before(body);
  for (const [slot, keep] of placeholders) {
    const parent = slot.parentNode as Movable | null;
    if (!parent) continue;
    adoptCurrent(keep, slot);
    if (typeof parent.moveBefore === "function") parent.moveBefore(keep, slot);
    else parent.insertBefore(keep, slot);
    slot.remove();
  }
  current.remove();
  for (const [el, top, left] of offsets) el.scrollTo({ top, left, behavior: "instant" });
  return body;
}

/**
 * @description Moves focus to the new page's primary heading so screen readers
 * announce the navigation.
 *
 * @param body - The swapped-in body.
 * @private
 */
function routeFocus(body: HTMLElement): void {
  const main = body.querySelector("main");
  const target = main?.querySelector("h1") ?? main ?? body;
  if (!(target instanceof HTMLElement)) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

/** Navigations holding the instant-scroll override, and the value it replaced. */
let instantHolds = 0;
let savedScrollBehavior = "";

/**
 * @description Makes window scrolls instant until the returned release runs.
 * Overlapping navigations share one override: the first saves `<html>`'s
 * inline `scroll-behavior`, the last to release restores it.
 *
 * @returns The release; calling it again does nothing.
 * @private
 */
function holdInstantScroll(): () => void {
  const root = document.documentElement.style;
  if (instantHolds++ === 0) {
    savedScrollBehavior = root.scrollBehavior;
    root.scrollBehavior = "auto";
  }
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    if (--instantHolds === 0) root.scrollBehavior = savedScrollBehavior;
  };
}

function isSameOrigin(url: string): boolean {
  return new URL(url, location.href).origin === location.origin;
}

if ("navigation" in window) {
  /**
   * URL handed back to the browser for a full load. The `navigate` listener
   * skips it once, so `location.assign()` from inside the handler does not
   * re-enter the interception and loop.
   */
  let bypassUrl: string | null = null;

  function fullLoad(url: string): void {
    bypassUrl = url;
    location.assign(url);
  }

  window.navigation.addEventListener("navigate", (e) => {
    if (bypassUrl !== null && e.destination.url === bypassUrl) {
      bypassUrl = null;
      return;
    }

    // A reload re-renders the whole document; it is never a swap.
    if (
      !optedIn(document) ||
      !e.canIntercept ||
      e.navigationType === "reload" ||
      e.hashChange ||
      e.downloadRequest !== null ||
      e.formData !== null ||
      !isSameOrigin(e.destination.url)
    ) {
      return;
    }

    e.intercept({
      async handler() {
        let doc: Document;
        try {
          const res = await fetch(e.destination.url, { signal: e.signal });
          if (!res.ok) throw new Error(res.statusText);
          doc = new DOMParser().parseFromString(await res.text(), "text/html");
        } catch {
          // A newer navigation aborted this one; it must not swap in late.
          if (e.signal.aborted) return;
          fullLoad(e.destination.url); // network or HTTP failure
          return;
        }
        if (e.signal.aborted) return;

        // The destination must opt in too; otherwise it gets a normal load.
        if (!optedIn(doc) || !(doc.body instanceof HTMLElement)) {
          fullLoad(e.destination.url);
          return;
        }

        let body = document.body;
        const update = () => {
          body = swapBody(doc.body);
          document.title = doc.title;
          // Restore scroll while the new snapshot is captured so the transition
          // animates from the right position instead of jumping afterwards.
          e.scroll();
        };

        // The jumps are instant: under the reset's `scroll-behavior: smooth` the
        // window would scroll in view of the live new snapshot. The browser may
        // apply the scroll at the next layout, so the override holds until the
        // transition is done (two frames without one).
        const release = holdInstantScroll();
        if (document.startViewTransition) {
          try {
            await document.startViewTransition(update).finished;
          } finally {
            release();
          }
        } else {
          try {
            update();
          } finally {
            requestAnimationFrame(() => requestAnimationFrame(release));
          }
        }

        // Page-scoped modules (reveal, class-form carousels, …) registered
        // refresh hooks; custom elements ride the swap on their own callbacks.
        refreshAll(body);
        routeFocus(body);
      },
    });
  });
} else if (optedIn(document)) {
  console.warn("Navigation API not supported: data-ui-navigation falls back to full page loads.");
}

export { swapBody };
