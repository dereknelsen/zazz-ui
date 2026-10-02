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
 * page, so headers, footers and current-page links are never stale.
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
 * @description Replaces the current body with `next`, carrying over every
 * `data-ui-persist` element whose id appears in both. Returns the new body.
 *
 * @param next - The destination's parsed `<body>`.
 * @private
 */
function swapBody(next: HTMLElement): HTMLElement {
  const current = document.body;
  const live = new Map<string, Element>();
  for (const el of current.querySelectorAll("[data-ui-persist]")) {
    const id = el.getAttribute("data-ui-persist");
    if (id && !live.has(id)) live.set(id, el);
  }

  const body = document.importNode(next, true);
  const placeholders: [Element, Element][] = [];
  for (const slot of body.querySelectorAll("[data-ui-persist]")) {
    const keep = live.get(slot.getAttribute("data-ui-persist") ?? "");
    if (keep) placeholders.push([slot, keep]);
  }

  // Connect the new body beside the old one, move each live element into its
  // slot while both are connected (moveBefore requires that, and then keeps the
  // element's state: no disconnect, no iframe or media reset), then drop the old
  // body. `document.body` is the first body, so it is the new one throughout.
  current.before(body);
  for (const [slot, keep] of placeholders) {
    const parent = slot.parentNode as Movable | null;
    if (!parent) continue;
    if (typeof parent.moveBefore === "function") parent.moveBefore(keep, slot);
    else parent.insertBefore(keep, slot);
    slot.remove();
  }
  current.remove();
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
          const res = await fetch(e.destination.url);
          if (!res.ok) throw new Error(res.statusText);
          doc = new DOMParser().parseFromString(await res.text(), "text/html");
        } catch {
          fullLoad(e.destination.url); // network or HTTP failure
          return;
        }

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

        if (document.startViewTransition) {
          await document.startViewTransition(update).finished;
        } else {
          update();
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
