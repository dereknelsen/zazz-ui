"use strict";

import { refreshAll } from "./zazz-element.ts";

/**
 * @fileoverview SPA-like navigation via the Navigation API.
 * @description Intercepts same-origin navigations and swaps `<main>` content
 * without a full page reload. The browser still manages the URL and history
 * stack; one `navigate` listener handles link clicks, back/forward, and
 * programmatic navigations.
 *
 * A same-document swap is only valid when the source and destination share the
 * same layout (retail → retail). Each layout stamps its `<main>` with
 * `data-layout` (retail | portal | utility); when those differ — e.g. a retail
 * page → the chrome-less utility login — the header/footer must change too, so
 * we hand the navigation back to the browser for a full load instead of
 * swapping `<main>` in isolation (which would leave the wrong chrome behind).
 *
 * Persistent overlays — e.g. the `<ui-toaster>` toaster — must live outside
 * `<main>` (end of `<body>`): the swap replaces `<main>` wholesale, so anything
 * inside it is destroyed mid-navigation. Placed outside, an active toast stack
 * rides through the swap untouched; its exclusion from the view-transition
 * repaint is CSS-side (`view-transition-name: toaster` in _toaster.css, frozen
 * group in _view-transitions.css).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/scroll
 */

if ("navigation" in window) {
  /**
   * URL we've decided to hand back to the browser for a full load. The
   * `navigate` listener checks this first and bails out (no intercept) so the
   * browser performs a real navigation. Without it, `location.assign()` from
   * inside the handler would re-enter this same listener, re-intercept, fail to
   * find a usable `<main>` again, and loop forever. Cleared as soon as it's seen.
   */
  let bypassUrl: string | null = null;

  window.navigation.addEventListener("navigate", (e) => {
    // A navigation we already chose to full-load: let the browser handle it.
    if (bypassUrl !== null && e.destination.url === bypassUrl) {
      bypassUrl = null;
      return;
    }

    if (
      !e.canIntercept ||
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
          fullReload(e.destination.url); // Network/HTTP failure: full load.
          return;
        }

        const newMain = doc.querySelector("main");
        const currentMain = document.querySelector("main");

        // Bail to a full load when we can't safely swap in place:
        // - either page lacks <main> (e.g. a legacy / non-Zazz page), or
        // - the layout differs (retail ↔ portal ↔ utility), so the header and
        //   footer chrome — which lives outside <main> — must change too.
        if (
          !(newMain instanceof HTMLElement) ||
          !(currentMain instanceof HTMLElement) ||
          newMain.dataset.layout !== currentMain.dataset.layout
        ) {
          fullReload(e.destination.url);
          return;
        }

        const updateDOM = () => {
          currentMain.replaceWith(newMain);
          document.title = doc.title;
          // Restore scroll while the new snapshot is captured so the transition
          // animates from the correct position instead of jumping afterwards.
          e.scroll();
        };

        if (document.startViewTransition) {
          await document.startViewTransition(updateDOM).finished;
        } else {
          updateDOM();
        }

        // Re-scan the swapped-in content: every module that owns page-scoped
        // work registered a refresh hook (reveal, class-form carousels, …) —
        // this module never names a component. Custom elements need nothing:
        // their lifecycle callbacks ride the swap natively.
        refreshAll(newMain);
        routeFocus(newMain);
      },
    });
  });

  /**
   * @description Hands a navigation back to the browser for a full page load.
   * Records the URL so the re-entrant `navigate` event skips interception
   * instead of looping.
   *
   * @param url - The destination URL to load normally.
   * @private
   */
  function fullReload(url: string): void {
    bypassUrl = url;
    location.assign(url);
  }

  /**
   * @description Routes focus to the primary heading in swapped main content.
   *
   * @param main - The newly inserted `<main>` element.
   * @private
   */
  function routeFocus(main: HTMLElement): void {
    const target = main.querySelector("h1") ?? main;
    if (!(target instanceof HTMLElement)) return;

    if (!target.hasAttribute("tabindex")) {
      target.tabIndex = -1;
    }

    target.focus({ preventScroll: true });
  }

  /**
   * @description Checks whether a URL shares the current document origin.
   *
   * @param url - The URL to compare.
   * @returns True when the URL origin matches `location.origin`.
   * @private
   */
  function isSameOrigin(url: string): boolean {
    return new URL(url, location.href).origin === location.origin;
  }
} else {
  console.warn("Navigation API not supported. That's okay, we'll just use a full page reload.");
}
