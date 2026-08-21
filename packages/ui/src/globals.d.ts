/**
 * Ambient types for Zazz runtime scripts.
 * CDN globals (Embla) and cross-script globals (Utils) are declared here so
 * checkJs can validate files that depend on prior `<script>` tags.
 */

interface EmblaCarouselType {
  scrollSnapList(): number[];
  selectedScrollSnap(): number;
  scrollTo(index: number, jump?: boolean): void;
  scrollPrev(): void;
  scrollNext(): void;
  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  slideNodes(): HTMLElement[];
  on(event: string, callback: () => void): EmblaCarouselType;
  destroy(): void;
}

type EmblaPlugin = unknown;

declare const EmblaCarousel: (
  node: Element,
  options?: Record<string, unknown>,
  plugins?: EmblaPlugin[],
) => EmblaCarouselType;

declare const EmblaCarouselAutoplay: (options?: Record<string, unknown>) => EmblaPlugin;
declare const EmblaCarouselAutoScroll: (options?: Record<string, unknown>) => EmblaPlugin;
declare const EmblaCarouselClassNames: (options?: Record<string, unknown>) => EmblaPlugin;

interface UtilsNamespace {
  parseValue(value: string): boolean | number | unknown[] | string;
  parseDataAttributes(node: Element, prefix: string): Record<string, unknown>;
}

declare const Utils: UtilsNamespace;

interface Element {
  /** @internal Set by embla.js on carousel root elements. */
  _emblaApi?: EmblaCarouselType;
  /** @internal Set by embla.js when a thumb carousel is linked. */
  _emblaApiThumb?: EmblaCarouselType;
  /** @internal Set by embla.js; aborts all per-carousel listeners on teardown. */
  _emblaController?: AbortController;
}

interface InitEmblaKeyboardNavFn {
  (): void;
  _bound?: boolean;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API */
interface NavigationDestination {
  url: string;
}

interface NavigateEvent extends Event {
  canIntercept: boolean;
  hashChange: boolean;
  downloadRequest: unknown | null;
  formData: FormData | null;
  destination: NavigationDestination;
  intercept(options: { handler: () => Promise<void> }): void;
  scroll(): void;
}

interface Navigation extends EventTarget {
  addEventListener(type: "navigate", listener: (event: NavigateEvent) => void): void;
}

/**
 * Invoker Commands API (command/commandfor). Native in Chromium 135+; the
 * invokers polyfill dispatches a compatible event. Declared here (as interface
 * merges) until lib.dom ships it.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CommandEvent
 */
interface CommandEvent extends Event {
  readonly command: string;
  readonly source: Element | null;
}

interface HTMLElementEventMap {
  command: CommandEvent;
}

interface RevealInstance {
  init(): void;
  refresh(): void;
  config: object;
}

interface RevealConstructor {
  new (options?: object): RevealInstance;
  disableAutoInit(): void;
  getAutoInstance(): RevealInstance | null;
  defaultConfig: object;
}

/** Shape of the `<embla-carousel>` element class (defined in carousel.js). */
declare class EmblaCarouselHostElement extends HTMLElement {
  init(): void;
  readonly api: EmblaCarouselType | null;
}

/** Toast content and behavior (see toaster.js for the authoritative JSDoc). */
interface ToastAction {
  label: string;
  onClick?: (event: MouseEvent) => void;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "success" | "info" | "warning" | "destructive";
  duration?: number;
  action?: ToastAction;
  closeButton?: boolean;
  region?: string | Element;
}

/** Shape of the `<toast-region>` element class (defined in toaster.js). */
declare class ToastRegionElement extends HTMLElement {
  addToast(options?: ToastOptions): string;
  dismiss(id?: string): void;
  dismissAll(): void;
}

interface ToasterNamespace {
  toast(options?: ToastOptions | string): string | null;
  success(message: string, options?: ToastOptions): string | null;
  info(message: string, options?: ToastOptions): string | null;
  warning(message: string, options?: ToastOptions): string | null;
  error(message: string, options?: ToastOptions): string | null;
  dismiss(id?: string): void;
}

interface Window {
  navigation: Navigation;
  Utils: UtilsNamespace;
  Reveal: RevealConstructor;
  /** Set by carousel.js — the `<embla-carousel>` element class. */
  EmblaCarouselElement?: typeof EmblaCarouselHostElement;
  /** Set by lightbox.js — the `<media-lightbox>` element class. */
  MediaLightbox?: CustomElementConstructor;
  /** Set by password.js — the `<input-password>` element class. */
  InputPassword?: CustomElementConstructor;
  /** Set by tabs.js — the `<tab-group>` element class. */
  TabGroup?: CustomElementConstructor;
  /** Set by toaster.js — the imperative toast API. */
  Toaster: ToasterNamespace;
  /** Set by toaster.js — the `<toast-region>` element class. */
  ToastRegion?: typeof ToastRegionElement;
  EmblaInit: {
    init: (scope?: Document | Element) => void;
    initRoot: (emblaNode: Element) => void;
    addDotBtnsAndClickHandlers: (
      emblaApi: EmblaCarouselType,
      dotsNode: Element,
    ) => (() => void) | undefined;
    addThumbClickHandlers: (
      emblaApiMain: EmblaCarouselType,
      emblaApiThumb: EmblaCarouselType,
    ) => void;
    addTogglethumbsActive: (
      emblaApiMain: EmblaCarouselType,
      emblaApiThumb: EmblaCarouselType,
    ) => void;
  };
}
