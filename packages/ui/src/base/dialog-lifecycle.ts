"use strict";

/**
 * @fileoverview Single owner of `<dialog>` visibility for the kit.
 * @description Watches every dialog on the page and re-emits its lifecycle as
 * two **bubbling** events dispatched on the dialog itself (ADR-0003):
 *
 * - `zazz:dialog-open` — the `open` attribute was added (works for both
 *   `showModal()` and `show()`, and for invoker commands).
 * - `zazz:dialog-close` — the dialog fired its native `close` event, which
 *   does not bubble; this one does.
 *
 * Components subscribe instead of running their own observers: a carousel
 * inside a closed dialog listens on the dialog it found via `closest("dialog")`;
 * `<ui-lightbox>` listens on itself (its dialog is a descendant, so the events
 * bubble through it); embla.js listens on `document` for class-form roots.
 * Dispatch order is the DOM's — dialog listeners, then ancestors, then
 * document — so init-on-open (dialog level) always precedes scroll/focus
 * choreography (ancestor and document level).
 *
 * No `detail` payload: the dialog is the event target.
 */

/** Dispatches a bubbling lifecycle event on a dialog. */
function emit(dialog: HTMLDialogElement, type: "zazz:dialog-open" | "zazz:dialog-close"): void {
  dialog.dispatchEvent(new Event(type, { bubbles: true }));
}

interface InitDialogLifecycleFn {
  (): void;
  _bound?: boolean;
}

/**
 * @description Starts the page-wide dialog watcher. Idempotent — safe to call
 * from double script loads.
 */
const initDialogLifecycle: InitDialogLifecycleFn = function () {
  if (initDialogLifecycle._bound) return;
  initDialogLifecycle._bound = true;

  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "open" &&
        mutation.target instanceof HTMLDialogElement &&
        mutation.target.hasAttribute("open")
      ) {
        emit(mutation.target, "zazz:dialog-open");
      }
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["open"],
    subtree: true,
  });

  // Native `close` does not bubble — capture it once and re-emit as a bubbling event.
  document.addEventListener(
    "close",
    function (e) {
      if (e.target instanceof HTMLDialogElement) emit(e.target, "zazz:dialog-close");
    },
    true,
  );
};

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDialogLifecycle);
  } else {
    initDialogLifecycle();
  }
}

// Exported for tests and manual bootstrapping; the events are the public API.
export { initDialogLifecycle };
