"use strict";

/**
 * @fileoverview `<media-lightbox>` — HTML web component for lightbox galleries.
 * @description Light-DOM custom element that coordinates the two carousels in
 * a lightbox: the inline gallery and the fullscreen `<dialog>` slideshow.
 *
 * Responsibilities:
 * - On dialog open: initializes the dialog's `<slide-carousel>` (deferred
 *   while the dialog was closed), jumps it to the gallery's current slide,
 *   and focuses the viewport so keyboard navigation works immediately.
 * - On dialog close: scrolls the inline gallery to the last viewed slide.
 *
 * Opening and closing the dialog itself needs no JavaScript — slides carry
 * `command="show-modal"` / `command="close"` (Invoker Commands). Drag-aware
 * click suppression on the stage and thumbs is wired by `initRoot` in
 * embla.js (keyed on `.lightbox__stage` / thumbs markup).
 *
 * Load order: the module graph resolves it — `index.js` imports embla.js and
 * carousel.js before this file; Embla itself resolves via the page's import map.
 *
 * @example
 * <media-lightbox class="lightbox">
 *   <div class="lightbox__gallery">
 *     <slide-carousel class="lightbox__stage" data-carousel-loop="true">…</slide-carousel>
 *   </div>
 *   <dialog class="lightbox__dialog dialog" closedby="any">
 *     <slide-carousel data-carousel-loop="true">…</slide-carousel>
 *   </dialog>
 * </media-lightbox>
 */

import { SlideCarouselElement } from "../carousel/carousel.ts";

class MediaLightbox extends HTMLElement {
  #controller: AbortController | null = null;

  #dialogObserver: MutationObserver | null = null;

  connectedCallback() {
    if (this.#controller) return;

    const dialog = this.querySelector("dialog");
    if (!(dialog instanceof HTMLDialogElement)) return;

    this.#controller = new AbortController();

    dialog.addEventListener("close", () => this.#syncGalleryToDialog(dialog), {
      signal: this.#controller.signal,
    });

    this.#dialogObserver = new MutationObserver(() => {
      if (dialog.open) this.#onDialogOpen(dialog);
    });
    this.#dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
    this.#dialogObserver?.disconnect();
    this.#dialogObserver = null;
  }

  /**
   * @returns The inline gallery's carousel root.
   */
  #galleryRoot(): Element | null {
    return this.querySelector('.lightbox__gallery [data-carousel="root"]');
  }

  /**
   * @description Initializes the dialog carousel, opens it at the gallery's
   * current slide, and moves focus to the slideshow viewport.
   *
   * @param dialog - The lightbox dialog.
   */
  #onDialogOpen(dialog: HTMLDialogElement): void {
    const dialogRoot = dialog.querySelector('[data-carousel="root"]');
    if (!dialogRoot) return;

    // <slide-carousel> defers init while its dialog is closed — init now.
    // (This element connects before its children, so its observer fires first.)
    if (dialogRoot instanceof SlideCarouselElement) {
      dialogRoot.init();
    }

    const galleryApi = this.#galleryRoot()?._emblaApi;
    if (dialogRoot._emblaApi && galleryApi) {
      dialogRoot._emblaApi.scrollTo(galleryApi.selectedScrollSnap(), true);
    }

    const viewport = dialogRoot.querySelector('[data-carousel="viewport"]');
    if (viewport instanceof HTMLElement) {
      viewport.focus({ preventScroll: true });
    }
  }

  /**
   * @description Scrolls the inline gallery to the slide last viewed in the dialog.
   *
   * @param dialog - The lightbox dialog.
   */
  #syncGalleryToDialog(dialog: HTMLDialogElement): void {
    const dialogApi = dialog.querySelector('[data-carousel="root"]')?._emblaApi;
    const galleryApi = this.#galleryRoot()?._emblaApi;
    if (dialogApi && galleryApi) {
      galleryApi.scrollTo(dialogApi.selectedScrollSnap());
    }
  }
}

// Register the element (guarded against double script loads)
if (typeof window !== "undefined" && !customElements.get("media-lightbox")) {
  customElements.define("media-lightbox", MediaLightbox);
}

// Attach to window for parity with the other component scripts, and export for
// module consumers (loaded for its side effect — the custom-element registration).
if (typeof window !== "undefined") {
  window.MediaLightbox = MediaLightbox;
}

export { MediaLightbox };
