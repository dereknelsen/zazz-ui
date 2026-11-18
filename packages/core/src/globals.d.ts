/**
 * Ambient types for Zazz runtime scripts.
 * Cross-script globals (Utils, element classes) are declared here so
 * checkJs can validate files that reference them across module boundaries.
 */

interface UtilsNamespace {
  parseValue(value: string): boolean | number | unknown[] | string;
  parseDataAttributes(node: Element, prefix: string): Record<string, unknown>;
}

interface Element {
  /** @internal Set by carousel-scroll.js on carousel roots and thumb strips: the carousel API. */
  _carousel?: import("./base/carousel-scroll.ts").CarouselApi;
  /** @internal Set by carousel.js; aborting it tears the carousel down. */
  _carouselController?: AbortController;
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
  /** Dialog lifecycle events emitted by base/dialog-lifecycle.ts. */
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

interface ZazzNamespace {
  /** Runs every refresh hook over `scope` and its descendants (the body without one): markup inserted without a Zazz navigation. */
  refresh(scope?: Element): void;
}

interface Window {
  /** Set by zazz-element.js — the runtime API for content other libraries swap in. */
  Zazz: ZazzNamespace;
  Utils: UtilsNamespace;
  /** Set by signals.js — the TC39 signals wrapper (state/computed/effect). */
  Signals: SignalsNamespace;
  Reveal: RevealConstructor;
  /** Set by toaster.js — the imperative toast API. */
  Toaster: ToasterNamespace;
  /** Set by carousel.js — carousel initialization. */
  Carousel: {
    init: (scope?: Document | Element) => void;
    initRoot: (root: Element) => void;
  };
}
