"use strict";

/**
 * @fileoverview `<ui-carousel>` — HTML web component for carousels.
 * @description Light-DOM custom element that wraps standard carousel markup
 * and owns the carousel's lifecycle: it initializes on connect (via
 * `Carousel.initRoot`) and tears down on disconnect, so dynamically inserted
 * or SPA-swapped carousels need no manual wiring.
 *
 * The element *is* the carousel root — CSS and `base/carousel.js` target
 * `:is(ui-carousel, [data-ui~="carousel"])` directly, and `data-carousel-*`
 * configuration attributes are read off the element (see base/carousel.js for
 * the full attribute reference). No shadow DOM; children are regular markup.
 *
 * Carousels inside a closed `<dialog>` defer initialization until the dialog
 * first opens (a closed dialog is `display: none`, so the viewport cannot be
 * measured).
 *
 * @example
 * <ui-carousel data-carousel-loop="true">
 *   <div data-carousel-slot="viewport">
 *     <div data-carousel-slot="container">
 *       <div data-carousel-slot="slide">Slide 1</div>
 *       <div data-carousel-slot="slide">Slide 2</div>
 *       <div data-carousel-slot="slide">Slide 3</div>
 *     </div>
 *   </div>
 *   <button type="button" data-carousel-slot="prev">Prev</button>
 *   <button type="button" data-carousel-slot="next">Next</button>
 * </ui-carousel>
 */

import { Carousel } from "../../base/carousel.ts";
import type { CarouselApi } from "../../base/carousel-scroll.ts";
import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";

class UiCarouselElement extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const dialog = this.closest("dialog");
    if (dialog && !dialog.open) {
      // Closed dialogs are display:none — the viewport can't be measured.
      // Initialize on the dialog's open instead (zazz:dialog-open).
      dialog.addEventListener("zazz:dialog-open", () => this.init(), { signal });
      return;
    }

    this.init();
  }

  protected teardown(): void {
    // Aborting removes every listener and observer the engine bound and
    // restores the markup (slide order, the template dot, state tokens).
    this._carouselController?.abort();
    delete this._carouselController;

    // Allow re-initialization if the element is re-inserted.
    this.removeAttribute("data-carousel-init");
  }

  /**
   * @description Initializes the carousel. Idempotent — already-initialized
   * roots and roots inside closed dialogs are skipped by `initRoot`.
   */
  init(): void {
    Carousel.initRoot(this);
  }

  /**
   * @returns The carousel API (`goTo`, `goToNext`, `goToPrev`, `selectedSnap`,
   * `play`, `stop`), or null before initialization.
   */
  get api(): CarouselApi | null {
    return this._carousel ?? null;
  }
}

defineZazzElement("ui-carousel", UiCarouselElement);

export { UiCarouselElement };
