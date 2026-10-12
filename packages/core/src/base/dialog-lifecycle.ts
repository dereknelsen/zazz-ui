"use strict";

/**
 * @fileoverview Single owner of `<dialog>` visibility for the kit.
 * @description Watches every dialog on the page and re-emits its lifecycle as
 * two **bubbling** events dispatched on the dialog itself:
 *
 * - `zazz:dialog-open`: the `open` attribute was added (works for both
 *   `showModal()` and `show()`, and for invoker commands).
 * - `zazz:dialog-close`: the dialog fired its native `close` event, which
 *   does not bubble; this one does.
 *
 * Components subscribe instead of running their own observers: a carousel
 * inside a closed dialog listens on the dialog it found via `closest("dialog")`;
 * `<ui-lightbox>` listens on itself (its dialog is a descendant, so the events
 * bubble through it); embla.js listens on `document` for class-form roots.
 * Dispatch order is the DOM order: dialog listeners, then ancestors, then
 * document, so init-on-open (dialog level) always precedes scroll/focus
 * choreography (ancestor and document level).
 *
 * No `detail` payload: the dialog is the event target.
 *
 * It also fills in light dismiss where the browser lacks it. `closedby="any"`
 * (Chrome 134, Firefox 141) lets a tap on the backdrop close a modal dialog;
 * Safari 26 knows `closedby` but only its `none` and `closerequest` values, so
 * `any` falls back to `closerequest` and the backdrop does nothing there. Where
 * `any` is not supported, a backdrop tap on a `closedby="any"` dialog closes it
 * here, with native semantics: the press and the release both land on the
 * backdrop, and the dialog gets a `cancel` through `requestClose()` where that
 * exists.
 */

/** Dispatches a bubbling lifecycle event on a dialog. */
function emit(dialog: HTMLDialogElement, type: "zazz:dialog-open" | "zazz:dialog-close"): void {
  dialog.dispatchEvent(new Event(type, { bubbles: true }));
}

/**
 * @description True when the browser dismisses `closedby="any"` dialogs itself.
 * The property alone is not proof: Safari 26 has `closedBy` with `none` and
 * `closerequest` but not `any`, so `any` must round-trip through the reflected
 * property, which keeps only the keywords the engine knows.
 */
function hasNativeLightDismiss(): boolean {
  if (typeof HTMLDialogElement === "undefined" || !("closedBy" in HTMLDialogElement.prototype)) {
    return false;
  }
  const probe = document.createElement("dialog");
  probe.setAttribute("closedby", "any");
  return probe.closedBy === "any";
}

/**
 * @description The open `closedby="any"` dialog whose backdrop `event` hit, or
 * null. A backdrop hit targets the dialog element itself at a point outside
 * its box; a hit inside the box targets a descendant, or the dialog's own
 * padding, which must not dismiss.
 *
 * @param event - A pointer or mouse event, read for its target and position.
 * @private
 */
function backdropHit(event: Event): HTMLDialogElement | null {
  const dialog = event.target;
  if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return null;
  if (dialog.getAttribute("closedby") !== "any") return null;
  const { clientX: x, clientY: y } = event as MouseEvent;
  const box = dialog.getBoundingClientRect();
  const outside = x < box.left || x > box.right || y < box.top || y > box.bottom;
  return outside ? dialog : null;
}

/**
 * @description Binds the backdrop-tap fallback for browsers without
 * `closedby="any"`. The press and the release must both land on the backdrop,
 * as in the native algorithm, so a drag from inside the dialog out to the
 * backdrop does not dismiss. Pointer events, not `click`: iOS Safari does not
 * deliver a delegated `click` from a non-interactive element such as a dialog's
 * backdrop, but it does deliver `pointerup`.
 *
 * @private
 */
function bindLightDismissFallback(): void {
  let pressed: HTMLDialogElement | null = null;
  document.addEventListener(
    "pointerdown",
    (event) => {
      pressed = backdropHit(event);
    },
    true,
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      const dialog = backdropHit(event);
      if (dialog && dialog === pressed) {
        if (typeof dialog.requestClose === "function") dialog.requestClose();
        else dialog.close();
      }
      pressed = null;
    },
    true,
  );
}

interface InitDialogLifecycleFn {
  (): void;
  _bound?: boolean;
}

/**
 * @description Starts the page-wide dialog watcher. Idempotent and safe to call
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

  // Native `close` does not bubble: capture it once and re-emit as a bubbling event.
  document.addEventListener(
    "close",
    function (e) {
      if (e.target instanceof HTMLDialogElement) emit(e.target, "zazz:dialog-close");
    },
    true,
  );

  if (!hasNativeLightDismiss()) bindLightDismissFallback();
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
export { backdropHit, hasNativeLightDismiss, initDialogLifecycle };
