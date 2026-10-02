"use strict";

/**
 * @fileoverview The component runtime: a thin base element + the refresh registry.
 * @description Two small pieces every behavioral component shares:
 *
 * **`ZazzElement`** owns the lifecycle envelope of an HTML web component: the
 * `AbortController`, the reconnect guard, teardown-on-disconnect.
 * Subclasses implement `setup(signal)` (bind everything with `{ signal }`) and,
 * only when they hold resources an abort can't release, `teardown()`.
 * Deliberately thin: anything beyond the envelope belongs in the component.
 *
 * **`defineZazzElement(tag, cls)`** is the registration guard (safe under
 * double script loads). Only behavioral components register; the CSS-only
 * tag forms (`ui-tooltip`, `ui-accordion`, `ui-button-group`,
 * `ui-toggle-group`) stay unregistered.
 *
 * **The refresh registry** lets navigation.ts re-scan swapped content without
 * naming components: a module whose work is scoped to page content (reveal observer, class-form
 * carousel init) registers a refresh hook, and after a navigation swap the
 * navigation module calls `refreshAll(newMain)`.
 * Custom elements do not need hooks: their lifecycle rides the swap natively.
 */

/** Base class for Zazz HTML web components: lifecycle envelope only. */
abstract class ZazzElement extends HTMLElement {
  #controller: AbortController | null = null;

  connectedCallback(): void {
    if (this.#controller) return;
    this.#controller = new AbortController();
    this.setup(this.#controller.signal);
  }

  /**
   * A `moveBefore()` move (a `data-ui-persist` element riding a navigation swap)
   * keeps the element connected: without this, the browser would fire
   * disconnect + connect and the element would tear down and set up again.
   */
  connectedMoveCallback(): void {}

  disconnectedCallback(): void {
    this.#controller?.abort();
    this.#controller = null;
    this.teardown?.();
  }

  /** Bind listeners, observers, and effects here: always with `{ signal }`. */
  protected abstract setup(signal: AbortSignal): void;

  /** Release what an abort can't (third-party instances, stamped attributes). */
  protected teardown?(): void;
}

/** Registers a custom element, guarded against double script loads. */
function defineZazzElement(tag: string, cls: CustomElementConstructor): void {
  if (typeof window === "undefined") return;
  if (!customElements.get(tag)) customElements.define(tag, cls);
}

// --- Refresh registry ---

type RefreshHook = (scope: Element) => void;
const refreshHooks: RefreshHook[] = [];

/**
 * @description Registers a hook to re-scan swapped-in content (in-page navigation
 * replacement). Hooks must be idempotent: already-initialized nodes are the
 * hook's own job to skip.
 */
function registerRefresh(hook: RefreshHook): void {
  refreshHooks.push(hook);
}

/** @description Runs every registered refresh hook against a swapped-in scope. */
function refreshAll(scope: Element): void {
  for (const hook of refreshHooks) hook(scope);
}

export { ZazzElement, defineZazzElement, registerRefresh, refreshAll };
