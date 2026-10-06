/**
 * @description Parses a space-separated `data-carousel-plugins` value into
 * plugin slug tokens. Empty / null / whitespace-only values yield `[]`.
 *
 * @param value - Raw attribute value (or `null` when absent).
 * @returns Plugin slug tokens in authoring order.
 */
declare function parseCarouselPlugins(value: string | null): string[];
/**
 * @description Toggles `.is-active` on the node at `selected` and clears it
 * from every other node — the shared "which one is current" marker used by
 * both dot pagination and thumb navigation.
 *
 * @param nodes - Candidate nodes, in slide order.
 * @param selected - The active index.
 * @param options - Set `ariaCurrent` to also toggle `aria-current` (thumb
 * navigation exposes the active thumb to assistive tech; dots don't need it —
 * their `.is-active` state is purely visual pagination).
 * @private
 */
declare function setActiveIndex(
  nodes: readonly HTMLElement[],
  selected: number,
  options?: {
    ariaCurrent?: boolean;
  },
): void;
/**
 * @description Adds dot navigation buttons and click handlers for an Embla carousel.
 *
 * @param emblaApi - The Embla carousel API instance.
 * @param dotsNode - Container element for dot navigation.
 * @param signal - Aborts the dot click listeners on teardown.
 * @returns Cleanup function to remove dots.
 */
declare const addDotBtnsAndClickHandlers: (
  emblaApi: EmblaCarouselType,
  dotsNode: Element,
  signal?: AbortSignal,
) => (() => void) | undefined;
/**
 * @description Adds click handlers on thumb slides to scroll the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 * @param signal - Aborts the thumb click listeners on teardown.
 */
declare const addThumbClickHandlers: (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
  signal?: AbortSignal,
) => void;
/**
 * @description Keeps the thumb carousel and active state in sync with the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 */
declare const addTogglethumbsActive: (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
) => void;
/**
 * @description Initializes a single Embla carousel root.
 *
 * Configures the carousel from its `data-carousel-*` attributes, wires navigation
 * (prev/next, dots, thumbs), and stores the API on `root._emblaApi`. Idempotent:
 * skips roots that are already initialized or inside a closed dialog (no
 * measurable viewport until open).
 *
 * Called by `initEmblaCarousels()` for class-form (`.ui-carousel`) markup and by
 * the `<ui-carousel>` web component (zazz/scripts/carousel.js) on connect.
 *
 * @param emblaNode - The carousel root element.
 */
declare function initEmblaRoot(emblaNode: Element): void;
/**
 * @description Initializes all Embla carousels within a scope.
 *
 * Discovers carousel elements via `:is(ui-carousel, .ui-carousel)` and configures them
 * based on their data attributes. Roots managed by the `<ui-carousel>` web
 * component are skipped — they initialize themselves via `connectedCallback()`.
 *
 * @param scope - Root element to search within. Defaults to `document`.
 */
declare function initEmblaCarousels(scope?: Document | Element): void;
/**
 * @namespace EmblaInit
 * @description Public API for Embla carousel initialization and helpers.
 *
 * @property init - Initializes all carousels within a scope.
 * @property initRoot - Initializes a single carousel root (used by `<ui-carousel>`).
 * @property addDotBtnsAndClickHandlers - Wires dot pagination.
 * @property addThumbClickHandlers - Wires thumb click handlers.
 * @property addTogglethumbsActive - Syncs thumb active state.
 */
declare const EmblaInit: {
  init: typeof initEmblaCarousels;
  initRoot: typeof initEmblaRoot;
  addDotBtnsAndClickHandlers: typeof addDotBtnsAndClickHandlers;
  addThumbClickHandlers: typeof addThumbClickHandlers;
  addTogglethumbsActive: typeof addTogglethumbsActive;
};
export { EmblaInit, setActiveIndex, parseCarouselPlugins };
//# sourceMappingURL=embla.d.ts.map
