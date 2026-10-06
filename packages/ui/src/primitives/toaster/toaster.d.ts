import { ZazzElement } from "../../base/zazz-element.ts";
interface ToastAction {
  /** Button label. */
  label: string;
  /** Click handler. Call `event.preventDefault()` to keep the toast open. */
  onClick?: (event: MouseEvent) => void;
}
interface ToastOptions {
  /** Toast heading. */
  title?: string;
  /** Supporting copy under the title. */
  description?: string;
  /** Status accent + icon. */
  variant?: "success" | "info" | "warning" | "destructive";
  /** Lifetime in ms; `Infinity` persists until dismissed. Default `4000`. */
  duration?: number;
  /** Optional action button. */
  action?: ToastAction;
  /** Render the explicit close button. Default `true`. */
  closeButton?: boolean;
  /** Target region id or element (default: first `<ui-toaster>`). */
  region?: string | Element;
}
/** Computed placement for one toast (same index as the heights input). */
interface ToastStackLayout {
  /** 0 = front (newest); grows toward the back of the stack. */
  stackIndex: number;
  /** Sum of the heights of the toasts stacked in front, in px. */
  offsetPx: number;
  /** Paint order — front toast highest. */
  zIndex: number;
  /** Whether this is the front (newest) toast. */
  front: boolean;
  /** Whether the toast is within the visible collapsed stack. */
  visible: boolean;
}
/**
 * @description Computes the collapsed-stack placement for every toast from the
 * measured heights alone (oldest first, matching DOM order). Pure — the
 * measure step feeds it and an effect writes the results to the DOM, so this
 * is the unit-testable core of the stacking model.
 *
 * @param heights - Natural toast heights in px, oldest first.
 * @returns Per-toast layout (same order) and the front toast's height.
 */
declare function computeStackLayout(heights: number[]): {
  toasts: ToastStackLayout[];
  frontToastHeightPx: number | null;
};
/**
 * @class
 * @description Hosts the toast stack: builds toast markup, maintains the
 * collapsed-stack CSS custom properties, runs auto-dismiss timers, and shows or
 * hides the `popover="manual"` region as toasts come and go.
 */
declare class UiToaster extends ZazzElement {
  #private;
  protected setup(signal: AbortSignal): void;
  protected teardown(): void;
  /**
   * @description Adds a toast to this region and shows the region if needed.
   *
   * @param options - Toast content and behavior.
   * @returns The toast id (usable with `dismiss()`).
   */
  addToast(options?: ToastOptions): string;
  /**
   * @description Dismisses one toast by id, or every toast when omitted.
   *
   * @param id - Toast id returned by `addToast()`.
   */
  dismiss(id?: string): void;
  /**
   * @description Dismisses every toast in this region.
   */
  dismissAll(): void;
}
/**
 * @namespace Toaster
 * @description Imperative toast API. Requires a `<ui-toaster>` in the page —
 * the region is never auto-created (HTML-first, like every Zazz component).
 *
 * @property toast - Shows a toast; returns its id.
 * @property success - Success shorthand.
 * @property info - Info shorthand.
 * @property warning - Warning shorthand.
 * @property error - Destructive shorthand.
 * @property dismiss - Dismisses one toast, or all when omitted.
 */
declare const Toaster: {
  /**
   * @description Shows a toast in the target (or first) region.
   *
   * @param options - Options object or title string.
   * @returns The toast id, or `null` when no region exists.
   */
  toast(options?: ToastOptions | string): string | null;
  /**
   * @description Shows a success toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  success(message: string, options?: ToastOptions): string | null;
  /**
   * @description Shows an info toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  info(message: string, options?: ToastOptions): string | null;
  /**
   * @description Shows a warning toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  warning(message: string, options?: ToastOptions): string | null;
  /**
   * @description Shows a destructive/error toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  error(message: string, options?: ToastOptions): string | null;
  /**
   * @description Dismisses a toast by id in any region, or every toast everywhere.
   *
   * @param id - Toast id returned by `toast()`.
   */
  dismiss(id?: string): void;
};
export { Toaster, UiToaster, computeStackLayout };
//# sourceMappingURL=toaster.d.ts.map
