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
 * `ui-toggle-group`, `ui-card`) stay unregistered.
 *
 * **The refresh registry** lets navigation.ts re-scan swapped content without
 * naming components: a module whose work is scoped to page content (reveal observer, class-form
 * carousel init) registers a refresh hook, and after a navigation swap the
 * navigation module calls `refreshAll(newMain)`. Content another library swaps
 * in reaches the same hooks through the public `Zazz.refresh(scope)`.
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

/**
 * @description Runs every refresh hook over `scope` and its descendants, or
 * over the whole body without one. Hooks search below the scope they get, so
 * they get the scope's parent: an element htmx swapped in whole (`outerHTML`)
 * is itself found. Hooks are idempotent, so the siblings they also see are
 * skipped.
 *
 * @param scope - The element whose markup changed.
 */
function refresh(scope?: Element): void {
  refreshAll(scope ? (scope.parentElement ?? scope) : document.body);
}

/**
 * @namespace Zazz
 * @description The runtime API for pages whose content changes without a Zazz
 * navigation. After htmx, Turbo, or any script inserts markup, pass the new
 * element to `refresh` so page-scoped behavior (reveal, attribute-form
 * carousels, select-all checkboxes, sticky states, the drawer page indent)
 * picks it up: `htmx.onLoad((el) => Zazz.refresh(el))`. A select-all group
 * counts only the boxes it can see, so when rows change under a header box,
 * pass the element that holds both.
 *
 * @property refresh - Runs every refresh hook over an element, or the body.
 */
const Zazz = { refresh };

// Attach to window for the documented public API (`window.Zazz`), and export
// for module consumers (`index.ts` re-exports it).
if (typeof window !== "undefined") {
  window.Zazz = Zazz;
}

export { Zazz, ZazzElement, defineZazzElement, registerRefresh, refreshAll };
