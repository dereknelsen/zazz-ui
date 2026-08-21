"use strict";

/**
 * @fileoverview `<embla-carousel>` — HTML web component for Embla carousels.
 * @description Light-DOM custom element that wraps standard carousel markup
 * and owns the Embla lifecycle: it initializes on connect (via
 * `EmblaInit.initRoot`) and destroys its instances on disconnect, so
 * dynamically inserted or SPA-swapped carousels need no manual wiring.
 *
 * The element *is* the carousel root — it applies `data-embla="root"` to
 * itself on connect, so all existing CSS hooks and `data-embla-*`
 * configuration attributes work unchanged (see embla.js for the full
 * attribute reference). No shadow DOM; children are regular markup.
 *
 * Carousels inside a closed `<dialog>` defer initialization until the dialog
 * first opens (a closed dialog is `display: none`, so Embla cannot measure
 * the viewport).
 *
 * Load order: Embla CDN bundles → utils.js → embla.js → carousel.js.
 *
 * @example
 * <embla-carousel data-embla-loop="true">
 *   <div data-embla="viewport">
 *     <div data-embla="container">
 *       <div data-embla="slide">Slide 1</div>
 *       <div data-embla="slide">Slide 2</div>
 *     </div>
 *   </div>
 *   <button type="button" data-embla="prev">Prev</button>
 *   <button type="button" data-embla="next">Next</button>
 * </embla-carousel>
 */

import { EmblaInit } from "../../base/embla.ts";

class EmblaCarouselElement extends HTMLElement {
  #dialogObserver: MutationObserver | null = null;

  connectedCallback() {
    // The element is the carousel root — expose the CSS/config hook.
    this.setAttribute("data-embla", "root");

    const dialog = this.closest("dialog");
    if (dialog && !dialog.open) {
      // Closed dialogs are display:none — Embla can't measure the viewport.
      // Initialize on the dialog's first open instead.
      this.#dialogObserver = new MutationObserver(() => {
        if (dialog.open) this.init();
      });
      this.#dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
      return;
    }

    this.init();
  }

  disconnectedCallback() {
    this.#dialogObserver?.disconnect();
    this.#dialogObserver = null;

    // Abort first so the per-carousel DOM listeners (prev/next, dots, thumbs,
    // drag-click suppression) are removed before the Embla instances are torn down.
    this._emblaController?.abort();
    delete this._emblaController;

    this._emblaApi?.destroy();
    this._emblaApiThumb?.destroy();
    delete this._emblaApi;
    delete this._emblaApiThumb;

    // Allow re-initialization if the element is re-inserted.
    this.removeAttribute("data-embla-init");
  }

  /**
   * @description Initializes the carousel. Idempotent — already-initialized
   * roots and roots inside closed dialogs are skipped by `initRoot`.
   */
  init(): void {
    EmblaInit.initRoot(this);
  }

  /**
   * @returns The Embla API, or null before initialization.
   */
  get api(): EmblaCarouselType | null {
    return this._emblaApi ?? null;
  }
}

// Register the element (guarded against double script loads)
if (typeof window !== "undefined" && !customElements.get("embla-carousel")) {
  customElements.define("embla-carousel", EmblaCarouselElement);
}

// Attach to window so embla.js's lightbox sync can feature-detect the element type,
// and export for module consumers (lightbox.js imports it via the main.js bundle).
if (typeof window !== "undefined") {
  window.EmblaCarouselElement = EmblaCarouselElement;
}

export { EmblaCarouselElement };
