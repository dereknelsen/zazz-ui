interface RevealConfig {
  /** Margin around the root (viewport) for IntersectionObserver. */
  margin: string;
  /** Visibility threshold (0–1) to trigger animations. */
  threshold: number;
  /** Default animation duration (ms number or CSS time string). */
  duration: number | string;
  /** Default animation timing function. */
  ease: string;
  /** Default base animation delay in milliseconds. */
  wait: number;
  /** Default translation distance for slide animations. */
  distance: string;
  /** Default delay between staggered elements in milliseconds. */
  step: number;
  /** Scale factor for grow animations (< 1). */
  grow: number;
  /** Scale factor for shrink animations (> 1). */
  shrink: number;
}
interface RevealOptions {
  /** Configuration options for the animation system. */
  config?: Partial<RevealConfig>;
}
/**
 * @class
 * @description Initializes viewport entry animations.
 *
 * @example
 * const reveal = new Reveal();
 *
 * @example
 * const reveal = new Reveal({
 *   config: {
 *     duration: 400,
 *     ease: "ease-in-out",
 *     threshold: 0.3,
 *     margin: "100px",
 *     step: 40,
 *   },
 * });
 */
declare class Reveal {
  #private;
  /**
   * @description Prevents automatic initialization on DOM ready.
   * Assigned below (browser environments only).
   */
  static disableAutoInit: () => void;
  /**
   * @description Returns the auto-initialized Reveal instance, if any.
   * Assigned below (browser environments only).
   */
  static getAutoInstance: () => Reveal | null;
  static get defaultConfig(): RevealConfig;
  config: RevealConfig;
  /**
   * @description Creates a new Reveal instance.
   *
   * @param options - Configuration options.
   */
  constructor(options?: RevealOptions);
  /**
   * @description Initializes the animation system by setting global CSS variables
   * and configuring all animated elements.
   */
  init(): void;
  /**
   * @description Reinitializes the animation system after dynamically adding elements.
   *
   * Disconnects old observers and rescans the document.
   *
   * @example
   * container.innerHTML = newContent;
   * reveal.refresh();
   */
  refresh(): void;
}
export { Reveal };
//# sourceMappingURL=reveal.d.ts.map
