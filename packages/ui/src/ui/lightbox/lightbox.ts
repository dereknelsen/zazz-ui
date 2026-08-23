"use strict";

/**
 * @fileoverview `<ui-lightbox>` — HTML web component for lightbox galleries.
 * @description Light-DOM custom element that coordinates the two carousels in
 * a lightbox: the inline gallery and the fullscreen `<dialog>` slideshow.
 *
 * Responsibilities (subscribing to `zazz:dialog-open` / `zazz:dialog-close`
 * from base/dialog-lifecycle.ts — ADR-0003):
 * - On dialog open: initializes the dialog's `<ui-carousel>` (deferred
 *   while the dialog was closed), jumps it to the gallery's current slide,
 *   and focuses the viewport so keyboard navigation works immediately.
 * - On dialog close: scrolls the inline gallery to the last viewed slide.
 *
 * Opening and closing the dialog itself needs no JavaScript — slides carry
 * `command="show-modal"` / `command="close"` (Invoker Commands). Drag-aware
 * click suppression on the stage and thumbs is wired by `initRoot` in
 * embla.js (keyed generically on command-bearing `carousel-slide` slots).
 *
 * Load order: the module graph resolves it — `index.js` imports embla.js and
 * carousel.js before this file; Embla itself resolves via the page's import map.
 *
 * @example
 * <ui-lightbox>
 *   <div data-slot="lightbox-gallery">
 *     <ui-carousel data-slot="lightbox-stage" data-carousel-loop="true">…</ui-carousel>
 *   </div>
 *   <dialog class="dialog" data-slot="lightbox-dialog" closedby="any">
 *     <ui-carousel data-carousel-loop="true">…</ui-carousel>
 *   </dialog>
 * </ui-lightbox>
 */

import { UiCarouselElement } from "../carousel/carousel.ts";
import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";

class UiLightbox extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const dialog = this.querySelector("dialog");
    if (!(dialog instanceof HTMLDialogElement)) return;

    // The dialog is a descendant, so its lifecycle events (ADR-0003) bubble
    // through this element — subscribe here instead of observing attributes.
    this.addEventListener(
      "zazz:dialog-open",
      (e) => {
        if (e.target === dialog) this.#onDialogOpen(dialog);
      },
      { signal },
    );

    this.addEventListener(
      "zazz:dialog-close",
      (e) => {
        if (e.target === dialog) this.#syncGalleryToDialog(dialog);
      },
      { signal },
    );
  }

  /**
   * @returns The inline gallery's carousel root.
   */
  #galleryRoot(): Element | null {
    return this.querySelector('[data-slot~="lightbox-gallery"] :is(ui-carousel, .ui-carousel)');
  }

  /**
   * @description Initializes the dialog carousel, opens it at the gallery's
   * current slide, and moves focus to the slideshow viewport.
   *
   * @param dialog - The lightbox dialog.
   */
  #onDialogOpen(dialog: HTMLDialogElement): void {
    const dialogRoot = dialog.querySelector(":is(ui-carousel, .ui-carousel)");
    if (!dialogRoot) return;

    // <ui-carousel> defers init while its dialog is closed. Its own
    // zazz:dialog-open listener (on the dialog) fires before this one (on the
    // ancestor) by DOM dispatch order, but init here too — idempotent — so the
    // jump below never races a class-form root.
    if (dialogRoot instanceof UiCarouselElement) {
      dialogRoot.init();
    }

    const galleryApi = this.#galleryRoot()?._emblaApi;
    if (dialogRoot._emblaApi && galleryApi) {
      dialogRoot._emblaApi.scrollTo(galleryApi.selectedScrollSnap(), true);
    }

    const viewport = dialogRoot.querySelector('[data-slot~="carousel-viewport"]');
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
    const dialogApi = dialog.querySelector(":is(ui-carousel, .ui-carousel)")?._emblaApi;
    const galleryApi = this.#galleryRoot()?._emblaApi;
    if (dialogApi && galleryApi) {
      galleryApi.scrollTo(dialogApi.selectedScrollSnap());
    }
  }
}

defineZazzElement("ui-lightbox", UiLightbox);

export { UiLightbox };
