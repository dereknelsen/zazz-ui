/**
 * Ambient types for Zazz runtime scripts.
 * Cross-script globals (Utils, element classes) are declared here so
 * checkJs can validate files that reference them across module boundaries.
 */

// Embla loads as real ES modules (see base/embla.ts imports); these aliases
// keep the shared names other scripts reference pointing at the real types.
type EmblaCarouselType = import("embla-carousel").EmblaCarouselType;
type EmblaPlugin = import("embla-carousel").EmblaPluginType;

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
  downloadRequest: unknown;
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
  /** Dialog lifecycle events emitted by base/dialog-lifecycle.ts (ADR-0003). */
  "zazz:dialog-open": Event;
  "zazz:dialog-close": Event;
}

interface DocumentEventMap {
  "zazz:dialog-open": Event;
  "zazz:dialog-close": Event;
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

interface ToasterNamespace {
  toast(options?: ToastOptions | string): string | null;
  success(message: string, options?: ToastOptions): string | null;
  info(message: string, options?: ToastOptions): string | null;
  warning(message: string, options?: ToastOptions): string | null;
  error(message: string, options?: ToastOptions): string | null;
  dismiss(id?: string): void;
}

/** Reactive-state API (see signals.js for the authoritative JSDoc). */
interface SignalsNamespace {
  state<T>(
    initialValue: T,
    options?: import("signal-polyfill").Signal.Options<T>,
  ): import("signal-polyfill").Signal.State<T>;
  computed<T>(
    computation: () => T,
    options?: import("signal-polyfill").Signal.Options<T>,
  ): import("signal-polyfill").Signal.Computed<T>;
  effect(callback: () => void | (() => void), options?: { signal?: AbortSignal }): () => void;
}

interface Window {
  navigation: Navigation;
  Utils: UtilsNamespace;
  /** Set by signals.js — the TC39 signals wrapper (state/computed/effect). */
  Signals: SignalsNamespace;
  Reveal: RevealConstructor;
  /** Set by toaster.js — the imperative toast API. */
  Toaster: ToasterNamespace;
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
