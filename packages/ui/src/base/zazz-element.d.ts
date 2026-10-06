/**
 * @fileoverview The component runtime: a thin base element + the refresh registry.
 * @description Two small pieces every behavioral component shares:
 *
 * **`ZazzElement`** owns the lifecycle envelope each HTML web component used to
 * repeat — the `AbortController`, the reconnect guard, teardown-on-disconnect.
 * Subclasses implement `setup(signal)` (bind everything with `{ signal }`) and,
 * only when they hold resources an abort can't release, `teardown()`.
 * Deliberately thin: anything beyond the envelope belongs in the component.
 *
 * **`defineZazzElement(tag, cls)`** is the registration guard (safe under
 * double script loads). Only behavioral components register — the CSS-only
 * tag forms (`ui-tooltip`, `ui-accordion`, `ui-button-group`,
 * `ui-toggle-group`) stay unregistered by design (ADR-0001).
 *
 * **The refresh registry** replaces hand-listing components in navigation.ts:
 * a module whose work is scoped to page content (reveal's observer, class-form
 * carousel init) registers a refresh hook; after a SPA `<main>` swap the
 * navigation module calls `refreshAll(newMain)` and never names a component.
 * Custom elements don't need hooks — their lifecycle rides the swap natively.
 */
/** Base class for Zazz HTML web components: lifecycle envelope only. */
declare abstract class ZazzElement extends HTMLElement {
  #private;
  connectedCallback(): void;
  disconnectedCallback(): void;
  /** Bind listeners, observers, and effects here — always with `{ signal }`. */
  protected abstract setup(signal: AbortSignal): void;
  /** Release what an abort can't (third-party instances, stamped attributes). */
  protected teardown?(): void;
}
/** Registers a custom element, guarded against double script loads. */
declare function defineZazzElement(tag: string, cls: CustomElementConstructor): void;
type RefreshHook = (scope: Element) => void;
/**
 * @description Registers a hook to re-scan swapped-in content (SPA `<main>`
 * replacement). Hooks must be idempotent — already-initialized nodes are the
 * hook's own job to skip.
 */
declare function registerRefresh(hook: RefreshHook): void;
/** @description Runs every registered refresh hook against a swapped-in scope. */
declare function refreshAll(scope: Element): void;
export { ZazzElement, defineZazzElement, registerRefresh, refreshAll };
//# sourceMappingURL=zazz-element.d.ts.map
