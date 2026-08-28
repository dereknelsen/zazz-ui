"use strict";

/**
 * @fileoverview TC39 Signals wrapper: the kit reactive-state seam.
 * @description Zazz bets on the TC39 Signals proposal for component state. This
 * module is the only file in the kit allowed to import `signal-polyfill`;
 * component scripts import `state`, `computed`, and `effect` from here, so when
 * the proposal's API shifts or engines ship native signals, one file changes.
 *
 * Division of labor (how Zazz components use signals):
 * - DOM events and observers are **input adapters**: they write into `state`.
 * - `computed` holds **pure derived logic**: the unit-testable part.
 * - `effect` is the **output adapter**: it writes results back to the DOM.
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

// The disposer `effect` returns implements the dispose protocol, and `using`
// compiles (target ES2022) to try/finally helpers that read this well-known
// symbol at runtime; engines without native Explicit Resource Management
// (Safari) don't define it, so give them a local stand-in.
(Symbol as { dispose: symbol }).dispose ??= Symbol("Symbol.dispose");

// --- State and computed ---

/**
 * @description Creates a mutable signal: a reactive value read with `.get()`
 * and written with `.set()`. Reads inside `computed`/`effect` are tracked.
 *
 * @param initialValue - The starting value.
 * @param options - Signal options (e.g. a custom `equals`).
 * @returns The state signal.
 * @example
 * const expanded = state(false);
 * expanded.set(true);
 */
function state<T>(initialValue: T, options?: Signal.Options<T>): Signal.State<T> {
  return new Signal.State(initialValue, options);
}

/**
 * @description Creates a derived signal: recomputed lazily when a tracked
 * dependency changes, cached otherwise. Keep the computation pure.
 *
 * @param computation - Pure function deriving the value from other signals.
 * @param options - Signal options (e.g. a custom `equals`).
 * @returns The computed signal.
 * @example
 * const paused = computed(() => expanded.get() || hidden.get());
 */
function computed<T>(computation: () => T, options?: Signal.Options<T>): Signal.Computed<T> {
  return new Signal.Computed(computation, options);
}

// --- Effects ---

/** Options for `effect`. */
interface EffectOptions {
  /** Aborting disposes the effect: pass an element's controller signal. */
  signal?: AbortSignal;
}

/** An effect callback returns either nothing or a cleanup function. */
type EffectCallback = () => void | (() => void);

/** The disposer `effect` returns: callable, and a `using`-compatible `Disposable`. */
type EffectDispose = (() => void) & Disposable;

// The proposal deliberately ships no effect(): this is the reference
// implementation from the polyfill README: one shared Watcher notifies
// synchronously on the first dirty signal, and re-runs are batched to a
// microtask so N writes in one task trigger one re-run.
let needsEnqueue = true;

const watcher = new Signal.subtle.Watcher(() => {
  if (needsEnqueue) {
    needsEnqueue = false;
    queueMicrotask(processPending);
  }
});

/**
 * @description Re-runs every dirty effect and re-arms the watcher.
 *
 * @private
 */
function processPending(): void {
  needsEnqueue = true;
  for (const dirty of watcher.getPending()) {
    dirty.get();
  }
  watcher.watch();
}

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
function effect(callback: EffectCallback, options: EffectOptions = {}): EffectDispose {
  let cleanup: (() => void) | void;
  let disposed = false;

  const tracked = new Signal.Computed(() => {
    if (typeof cleanup === "function") cleanup();
    cleanup = callback();
  });

  watcher.watch(tracked);
  tracked.get();

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    watcher.unwatch(tracked);
    if (typeof cleanup === "function") cleanup();
    cleanup = undefined;
  };

  options.signal?.addEventListener("abort", dispose, { once: true });
  return Object.assign(dispose, { [Symbol.dispose]: dispose });
}

// --- Public API ---

/**
 * @namespace Signals
 * @description Reactive state for Zazz components, wrapping the TC39 Signals
 * polyfill. Import `state`/`computed`/`effect` from this module, never from
 * `signal-polyfill` directly.
 *
 * @property state - Creates a mutable signal.
 * @property computed - Creates a pure derived signal.
 * @property effect - Runs a tracked side effect with batched re-runs.
 */
const Signals = { state, computed, effect };

// Attach to window for the documented public API, then export for module consumers.
if (typeof window !== "undefined") {
  window.Signals = Signals;
}

export { Signals, state, computed, effect };
export type { EffectCallback, EffectDispose, EffectOptions };
