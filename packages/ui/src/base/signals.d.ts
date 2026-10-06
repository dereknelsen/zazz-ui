/**
 * @fileoverview TC39 Signals wrapper — the kit's reactive-state seam.
 * @description Zazz bets on the TC39 Signals proposal for component state. This
 * module is the only file in the kit allowed to import `signal-polyfill`;
 * component scripts import `state`, `computed`, and `effect` from here, so when
 * the proposal's API shifts or engines ship native signals, one file changes.
 *
 * Division of labor (how Zazz components use signals):
 * - DOM events and observers are **input adapters** — they write into `state`.
 * - `computed` holds **pure derived logic** — the unit-testable part.
 * - `effect` is the **output adapter** — it writes results back to the DOM.
 * Imperative concerns (timers, transition choreography, DOM construction) stay
 * imperative; the DOM itself remains the source of truth for element lists.
 *
 * The bare `signal-polyfill` specifier resolves through the page's import map in
 * browsers (pinned jsDelivr URL) and through `node_modules` in tests/bundlers.
 *
 * @see https://github.com/tc39/proposal-signals
 * @see https://github.com/proposal-signals/signal-polyfill
 */
import { Signal } from "signal-polyfill";
/**
 * @description Creates a mutable signal — a reactive value read with `.get()`
 * and written with `.set()`. Reads inside `computed`/`effect` are tracked.
 *
 * @param initialValue - The starting value.
 * @param options - Signal options (e.g. a custom `equals`).
 * @returns The state signal.
 * @example
 * const expanded = state(false);
 * expanded.set(true);
 */
declare function state<T>(initialValue: T, options?: Signal.Options<T>): Signal.State<T>;
/**
 * @description Creates a derived signal — recomputed lazily when a tracked
 * dependency changes, cached otherwise. Keep the computation pure.
 *
 * @param computation - Pure function deriving the value from other signals.
 * @param options - Signal options (e.g. a custom `equals`).
 * @returns The computed signal.
 * @example
 * const paused = computed(() => expanded.get() || hidden.get());
 */
declare function computed<T>(computation: () => T, options?: Signal.Options<T>): Signal.Computed<T>;
/** Options for `effect`. */
interface EffectOptions {
  /** Aborting disposes the effect — pass an element's controller signal. */
  signal?: AbortSignal;
}
/** An effect callback returns either nothing or a cleanup function. */
type EffectCallback = () => void | (() => void);
/** The disposer `effect` returns: callable, and a `using`-compatible `Disposable`. */
type EffectDispose = (() => void) & Disposable;
/**
 * @description Runs `callback` immediately, tracks every signal it reads, and
 * re-runs it (batched to a microtask) whenever one changes. The callback may
 * return a cleanup function, run before each re-run and on disposal.
 *
 * @param callback - The tracked side effect.
 * @param options - Pass an element's `AbortSignal` to tie disposal to teardown.
 * @returns A dispose function (idempotent; also invoked by the abort signal).
 * It implements `Symbol.dispose`, so a scoped effect (TypeScript sources only)
 * can be bound with `using` and disposed automatically at scope exit.
 * @example
 * const dispose = effect(() => {
 *   node.dataset.paused = String(paused.get());
 * });
 * @example
 * using dispose = effect(() => track(count.get())); // disposed at scope exit
 */
declare function effect(callback: EffectCallback, options?: EffectOptions): EffectDispose;
/**
 * @namespace Signals
 * @description Reactive state for Zazz components, wrapping the TC39 Signals
 * polyfill. Import `state`/`computed`/`effect` from this module — never from
 * `signal-polyfill` directly.
 *
 * @property state - Creates a mutable signal.
 * @property computed - Creates a pure derived signal.
 * @property effect - Runs a tracked side effect with batched re-runs.
 */
declare const Signals: {
  state: typeof state;
  computed: typeof computed;
  effect: typeof effect;
};
export { Signals, state, computed, effect };
export type { EffectCallback, EffectDispose, EffectOptions };
//# sourceMappingURL=signals.d.ts.map
