import { ZazzElement } from "../../base/zazz-element.ts";
declare class UiCarouselElement extends ZazzElement {
  protected setup(signal: AbortSignal): void;
  protected teardown(): void;
  /**
   * @description Initializes the carousel. Idempotent — already-initialized
   * roots and roots inside closed dialogs are skipped by `initRoot`.
   */
  init(): void;
  /**
   * @returns The Embla API, or null before initialization.
   */
  get api(): EmblaCarouselType | null;
}
export { UiCarouselElement };
//# sourceMappingURL=carousel.d.ts.map
