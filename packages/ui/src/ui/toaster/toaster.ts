"use strict";

/**
 * @fileoverview `<ui-toaster>` — HTML web component for stacked toast notifications.
 * @description Light-DOM custom element that hosts a top-layer toast stack, plus
 * the `window.Toaster` imperative API. The stacking model (newest toast in front,
 * older toasts peeking behind, expand on hover, timer pause on hover/hidden tab)
 * is adapted from Sonner by Emil Kowalski — https://sonner.emilkowal.ski (MIT).
 *
 * The region is a `popover="manual"` element: it enters the top layer via
 * `showPopover()` when the first toast arrives and leaves it after the last
 * toast's exit transition. Toasts are plain `<li>` children, so the collapsed
 * stack offsets in `_toaster.css` work with normal CSS transforms.
 *
 * Fire toasts two ways:
 * - Declaratively, from any button, via a custom Invoker Command:
 *   `command="--toast"` (or `--toast-success|info|warning|destructive`) with
 *   `commandfor="<region id>"`. Toast content comes from the button's
 *   `data-title`, `data-description`, `data-variant`, `data-duration`, and
 *   `data-close-button` attributes.
 * - Imperatively: `window.Toaster.toast({ title, description, variant, … })`
 *   and the `.success()/.info()/.warning()/.error()` shorthands.
 *
 * Region attributes:
 * - `data-position` — `top-start | top-center | top-end | bottom-start |
 *   bottom-center | bottom-end` (logical; default `bottom-end`).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
 *
 * @example
 * <ui-toaster class="ui-toaster" id="toaster" popover="manual"></ui-toaster>
 * <button commandfor="toaster" command="--toast" data-title="Saved">Save</button>
 */

import { Utils } from "../../base/utils.ts";
import { computed, effect, state } from "../../base/signals.ts";

// `using` compiles (target ES2022) to try/finally helpers that read this
// well-known symbol at runtime; engines without native Explicit Resource
// Management (Safari) don't define it, so give them a local stand-in.
(Symbol as { dispose: symbol }).dispose ??= Symbol("Symbol.dispose");

// --- Constants ---

/** Default toast lifetime in milliseconds. */
const TOAST_LIFETIME = 4000;

/** Maximum number of toasts shown in the collapsed stack. */
const VISIBLE_TOASTS = 3;

/** Safety net for node removal when no exit `transitionend` fires. */
const EXIT_FALLBACK_MS = 600;

const VARIANTS: ReadonlyArray<string> = ["success", "info", "warning", "destructive"];

// --- Icons (adapted from Sonner's assets.tsx — MIT, Emil Kowalski) ---

const ICONS: Record<string, string> = {
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"/></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>',
  destructive:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
  close:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};

// --- Typedefs ---

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

interface ToastTimer {
  /** Milliseconds left when next resumed. */
  remaining: number;
  /** `Date.now()` at the last (re)schedule. */
  startedAt: number;
  /** Active timeout id, or `0` while paused. */
  timeoutId: number;
}

/** One measured toast in the stack (oldest first, matching DOM order). */
interface ToastStackEntry {
  /** The toast element. */
  node: HTMLElement;
  /** Measured natural height in px. */
  height: number;
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

// --- Measurement ---

/**
 * @description Unclamps every toast's block-size for a batch measurement (the
 * inline style beats the collapsed block-size rule) and returns a disposer
 * that restores the clamp. Bind it with `using` so the restore is guaranteed
 * at scope exit — even if a measure in between throws.
 *
 * @param toasts - The live toasts to unclamp.
 * @returns A `Disposable` that removes the inline block-size again.
 * @private
 */
function unclampForMeasure(toasts: readonly HTMLElement[]): Disposable {
  for (const toast of toasts) toast.style.blockSize = "auto";
  return {
    [Symbol.dispose]() {
      for (const toast of toasts) toast.style.removeProperty("block-size");
    },
  };
}

// --- Stack math (pure) ---

/**
 * @description Computes the collapsed-stack placement for every toast from the
 * measured heights alone (oldest first, matching DOM order). Pure — the
 * measure step feeds it and an effect writes the results to the DOM, so this
 * is the unit-testable core of the stacking model.
 *
 * @param heights - Natural toast heights in px, oldest first.
 * @returns Per-toast layout (same order) and the front toast's height.
 */
function computeStackLayout(heights: number[]): {
  toasts: ToastStackLayout[];
  frontToastHeightPx: number | null;
} {
  const count = heights.length;
  const toasts: ToastStackLayout[] = Array.from({ length: count });

  let heightsBefore = 0;
  for (let i = count - 1; i >= 0; i--) {
    const stackIndex = count - 1 - i; // 0 = front (newest, last in DOM)
    toasts[i] = {
      stackIndex,
      offsetPx: heightsBefore,
      zIndex: count - stackIndex,
      front: stackIndex === 0,
      visible: stackIndex < VISIBLE_TOASTS,
    };
    heightsBefore += heights[i];
  }

  return { toasts, frontToastHeightPx: count > 0 ? heights[count - 1] : null };
}

// --- <ui-toaster> element ---

/**
 * @class
 * @description Hosts the toast stack: builds toast markup, maintains the
 * collapsed-stack CSS custom properties, runs auto-dismiss timers, and shows or
 * hides the `popover="manual"` region as toasts come and go.
 */
class UiToaster extends HTMLElement {
  #controller: AbortController | null = null;

  #timers: Map<string, ToastTimer> = new Map();

  #counter = 0;

  #resizeFrame = 0;

  #handledCommand: { source: Element | null; command: string } | null = null;

  #collapseTimer = 0;

  // Signal state: DOM events and observers write in; computed holds the pure
  // derivations; effects (bound in connectedCallback) write back to the DOM.
  /** Whether the stack is expanded (hover/focus). */
  #expanded = state(false);

  /** Whether the tab is hidden (mirrors `document.hidden`). */
  #hidden = state(typeof document !== "undefined" ? document.hidden : false);

  /** Timers run only while neither expanded nor hidden. */
  #paused = computed(() => this.#expanded.get() || this.#hidden.get());

  /** Measured stack (oldest first) — written by `#reindex`'s measure pass. */
  #stack = state<ToastStackEntry[]>([]);

  /** Pure placement derived from the measured heights. */
  #layout = computed(() => computeStackLayout(this.#stack.get().map((entry) => entry.height)));

  connectedCallback() {
    if (this.#controller) return;
    this.#controller = new AbortController();
    const signal = this.#controller.signal;

    // Region baseline: manual popover (no light dismiss), reachable landmark.
    if (!this.hasAttribute("popover")) this.setAttribute("popover", "manual");
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("aria-label")) this.setAttribute("aria-label", "Notifications");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");

    // The live region must exist before toasts are inserted so additions announce.
    if (!this.querySelector('[data-slot~="toaster-list"]')) {
      const list = document.createElement("ol");
      list.setAttribute("data-slot", "toaster-list");
      list.setAttribute("aria-live", "polite");
      list.setAttribute("aria-relevant", "additions text");
      list.setAttribute("aria-atomic", "false");
      this.append(list);
    }

    this.addEventListener("command", (event) => this.#onCommand(event), { signal });

    // Hover/focus expands the stack; expanded (or hidden tab) pauses timers.
    // Leave events only *request* a collapse — dismissal animations and node
    // removal fire spurious mouseleave/focusout while the pointer never moved,
    // so the collapse is verified against real hover/focus state first.
    this.addEventListener("mouseenter", () => this.#setExpanded(true), { signal });
    this.addEventListener("mouseleave", () => this.#requestCollapse(), { signal });
    this.addEventListener("focusin", () => this.#setExpanded(true), { signal });
    this.addEventListener("focusout", () => this.#requestCollapse(), { signal });

    document.addEventListener("visibilitychange", () => this.#hidden.set(document.hidden), {
      signal,
    });

    // Viewport resizes rewrap toast text — remeasure the stack.
    window.addEventListener(
      "resize",
      () => {
        cancelAnimationFrame(this.#resizeFrame);
        this.#resizeFrame = requestAnimationFrame(() => this.#reindex());
      },
      { signal },
    );

    // Output effects (disposed by the same controller as the listeners):
    // one owns the expanded attribute, one owns pausing/resuming the timers,
    // one writes the computed stack placement to the DOM.
    effect(
      () => {
        this.dataset.expanded = String(this.#expanded.get());
      },
      { signal },
    );

    effect(
      () => {
        if (this.#paused.get()) {
          this.#pauseTimers();
        } else {
          this.#resumeTimers();
        }
      },
      { signal },
    );

    effect(
      () => {
        const entries = this.#stack.get();
        const { toasts, frontToastHeightPx } = this.#layout.get();

        for (let i = 0; i < entries.length; i++) {
          const { node, height } = entries[i];
          const layout = toasts[i];
          node.dataset.front = String(layout.front);
          node.dataset.visible = String(layout.visible);
          node.style.zIndex = String(layout.zIndex);
          node.style.setProperty("--toasts-before", String(layout.stackIndex));
          node.style.setProperty("--initial-height", `${height}px`);
          node.style.setProperty(
            "--offset",
            `calc(${layout.offsetPx}px + var(--toaster-gap) * ${layout.stackIndex})`,
          );
        }

        if (frontToastHeightPx !== null) {
          this.style.setProperty("--front-toast-height", `${frontToastHeightPx}px`);
        }
      },
      { signal },
    );
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
    cancelAnimationFrame(this.#resizeFrame);
    window.clearTimeout(this.#collapseTimer);
    for (const timer of this.#timers.values()) clearTimeout(timer.timeoutId);
    this.#timers.clear();
  }

  // --- Public API ---

  /**
   * @description Adds a toast to this region and shows the region if needed.
   *
   * @param options - Toast content and behavior.
   * @returns The toast id (usable with `dismiss()`).
   */
  addToast(options: ToastOptions = {}): string {
    const id = `toast-${++this.#counter}`;
    const list = this.#list();

    // Show the popover before inserting so the insertion is announced and the
    // toast's @starting-style enter transition runs inside an open region.
    this.#showRegion();

    list.append(this.#buildToast(options, id));
    this.#reindex();
    this.#startTimer(id, options.duration ?? TOAST_LIFETIME);

    return id;
  }

  /**
   * @description Dismisses one toast by id, or every toast when omitted.
   *
   * @param id - Toast id returned by `addToast()`.
   */
  dismiss(id?: string): void {
    if (id === undefined) {
      this.dismissAll();
      return;
    }

    const toast = this.#list().querySelector(`[data-toast-id="${CSS.escape(id)}"]`);
    if (!(toast instanceof HTMLElement) || toast.dataset.removed === "true") return;

    const timer = this.#timers.get(id);
    if (timer) clearTimeout(timer.timeoutId);
    this.#timers.delete(id);

    toast.dataset.removed = "true";

    // Keyboard users keep their place: hand focus to the next toast before this
    // one goes. A mouse click's incidental focus is left to drop to <body> —
    // holding it would pin the stack expanded after the pointer leaves, and
    // #requestCollapse's :hover check already keeps the stack open meanwhile.
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      toast.contains(active) &&
      active.matches(":focus-visible")
    ) {
      this.#toasts()
        .filter((t) => t.dataset.removed !== "true")
        .at(-1)
        ?.focus({ preventScroll: true });
    }

    this.#reindex();
    this.#finalizeRemoval(toast);
  }

  /**
   * @description Dismisses every toast in this region.
   */
  dismissAll(): void {
    for (const toast of this.#toasts()) {
      const toastId = toast.dataset.toastId;
      if (toastId) this.dismiss(toastId);
    }
  }

  // --- Invoker Commands ---

  /**
   * @description Handles the custom `--toast` Invoker Command fired by buttons
   * with `commandfor` pointing at this region. `--toast-success` (etc.) sets the
   * variant; everything else comes from the invoker's `data-*` attributes.
   *
   * @param event - The command event.
   */
  #onCommand(event: CommandEvent): void {
    const command = event.command;
    if (typeof command !== "string" || !command.startsWith("--toast")) return;

    // The invokers polyfill re-dispatches commands even in browsers with a
    // native CommandEvent, so one click can deliver the same command twice in
    // the same task. Handle the first and drop the same-task duplicate.
    const handled = this.#handledCommand;
    if (handled && handled.source === event.source && handled.command === command) return;
    this.#handledCommand = { source: event.source, command };
    window.setTimeout(() => {
      this.#handledCommand = null;
    }, 0);

    const source = event.source;
    const options: ToastOptions = {};

    const suffix = command.slice("--toast-".length);
    if (VARIANTS.includes(suffix)) {
      options.variant = suffix as ToastOptions["variant"];
    }

    if (source instanceof HTMLElement) {
      const { title, description, variant, duration, closeButton } = source.dataset;
      if (title) options.title = title;
      if (description) options.description = description;
      if (!options.variant && variant && VARIANTS.includes(variant)) {
        options.variant = variant as ToastOptions["variant"];
      }
      if (duration !== undefined) {
        const parsed = Utils.parseValue(duration);
        if (typeof parsed === "number") options.duration = parsed;
      }
      if (closeButton !== undefined) options.closeButton = closeButton !== "false";
    }

    this.addToast(options);
  }

  // --- Toast construction ---

  /**
   * @description Builds a toast `<li>`: status icon, title/description, and the
   * optional action and close buttons. Text is set via `textContent`.
   *
   * @param options - Toast content and behavior.
   * @param id - The generated toast id.
   * @returns The toast element (not yet inserted).
   */
  #buildToast(options: ToastOptions, id: string): HTMLLIElement {
    const toast = document.createElement("li");
    toast.setAttribute("data-slot", "toaster-toast");
    toast.dataset.toastId = id;
    toast.tabIndex = 0;
    if (options.variant) toast.dataset.variant = options.variant;

    if (options.variant) {
      const icon = document.createElement("span");
      icon.setAttribute("data-slot", "toaster-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICONS[options.variant];
      toast.append(icon);
    }

    const content = document.createElement("div");
    content.setAttribute("data-slot", "toaster-content");
    if (options.title) {
      const title = document.createElement("div");
      title.setAttribute("data-slot", "toaster-title");
      title.textContent = options.title;
      content.append(title);
    }
    if (options.description) {
      const description = document.createElement("div");
      description.setAttribute("data-slot", "toaster-description");
      description.textContent = options.description;
      content.append(description);
    }
    toast.append(content);

    const action = options.action;
    if (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ui-button";
      button.setAttribute("data-slot", "toaster-action");
      button.dataset.size = "sm";
      button.textContent = action.label;
      button.addEventListener("click", (event) => {
        action.onClick?.(event);
        if (!event.defaultPrevented) this.dismiss(id);
      });
      toast.append(button);
    }

    if (options.closeButton !== false) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "ui-button";
      close.setAttribute("data-slot", "toaster-close");
      close.dataset.variant = "ghost";
      close.dataset.size = "icon-sm";
      close.setAttribute("aria-label", "Close notification");
      close.innerHTML = ICONS.close;
      close.addEventListener("click", () => this.dismiss(id));
      toast.append(close);
    }

    return toast;
  }

  // --- Stack math ---

  /**
   * @description Remeasures the stack — the measure half of the stacking
   * model. Batch-reads every live toast's natural height and writes the
   * result into `#stack`; `#layout` derives the placement purely
   * (`computeStackLayout`) and the stack effect writes the CSS custom
   * properties `_toaster.css` reads (`--toasts-before`, `--offset`,
   * `--initial-height`, `--front-toast-height`) plus `data-front`,
   * `data-visible`, and z-index. DOM order is chronological; the last child
   * is the front (newest) toast.
   */
  #reindex(): void {
    const toasts = this.#toasts().filter((toast) => toast.dataset.removed !== "true");

    // Batch-measure with heights unclamped, restored at scope exit — one
    // layout pass, no visible change (the stack effect is microtask-batched,
    // so its DOM writes land after the restore).
    using _measure = unclampForMeasure(toasts);
    const entries = toasts.map((toast) => ({ node: toast, height: toast.offsetHeight }));

    this.#stack.set(entries);
  }

  /**
   * @returns The toast list (created in `connectedCallback`).
   */
  #list(): HTMLOListElement {
    let list = this.querySelector('[data-slot~="toaster-list"]');
    if (!(list instanceof HTMLOListElement)) {
      list = document.createElement("ol");
      list.setAttribute("data-slot", "toaster-list");
      this.append(list);
    }
    return list as HTMLOListElement;
  }

  /**
   * @returns All toast elements, oldest first (DOM order).
   */
  #toasts(): HTMLElement[] {
    return Array.from(this.#list().children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .filter((child) => child.matches('[data-slot~="toaster-toast"]'));
  }

  // --- Expand / collapse ---

  /**
   * @description Expands or collapses the stack by writing the signal state.
   * The attribute write and the timer pause/resume (matching Sonner) are owned
   * by the effects in `connectedCallback` — no caller has to remember them.
   *
   * @param expanded - Whether the stack is expanded.
   */
  #setExpanded(expanded: boolean): void {
    if (expanded) window.clearTimeout(this.#collapseTimer);
    this.#expanded.set(expanded);
  }

  /**
   * @description Collapses the stack only if the user has really left it.
   * Waits a beat, then checks actual hover and focus state — dismissals fire
   * spurious mouseleave/focusout (exit transforms, node removal, focus drops)
   * that a raw event handler would mistake for the pointer leaving.
   */
  #requestCollapse(): void {
    window.clearTimeout(this.#collapseTimer);
    this.#collapseTimer = window.setTimeout(() => {
      const activeElement = document.activeElement;
      const focusWithin = activeElement instanceof Node && this.contains(activeElement);
      if (!this.matches(":hover") && !focusWithin) this.#setExpanded(false);
    }, 100);
  }

  // --- Timers ---

  /**
   * @description Registers a toast's auto-dismiss timer and schedules it unless
   * the stack is currently paused (expanded or hidden tab).
   *
   * @param id - Toast id.
   * @param duration - Lifetime in ms; `Infinity` skips the timer.
   */
  #startTimer(id: string, duration: number): void {
    if (duration === Infinity || Number.isNaN(duration)) return;
    const timer: ToastTimer = { remaining: duration, startedAt: 0, timeoutId: 0 };
    this.#timers.set(id, timer);
    if (!this.#paused.get()) this.#schedule(id, timer);
  }

  /**
   * @description Arms a timer's timeout for its remaining lifetime.
   *
   * @param id - Toast id.
   * @param timer - The timer record.
   */
  #schedule(id: string, timer: ToastTimer): void {
    timer.startedAt = Date.now();
    timer.timeoutId = window.setTimeout(() => this.dismiss(id), timer.remaining);
  }

  /**
   * @description Pauses all running timers, banking each one's remaining time.
   */
  #pauseTimers(): void {
    for (const timer of this.#timers.values()) {
      if (!timer.timeoutId) continue;
      clearTimeout(timer.timeoutId);
      timer.timeoutId = 0;
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
    }
  }

  /**
   * @description Resumes paused timers (no-op while still expanded or hidden).
   */
  #resumeTimers(): void {
    if (this.#paused.get()) return;
    for (const [id, timer] of this.#timers) {
      if (!timer.timeoutId) this.#schedule(id, timer);
    }
  }

  // --- Region show/hide ---

  /**
   * @description Puts the region on the top layer if it isn't already.
   */
  #showRegion(): void {
    try {
      if (!this.matches(":popover-open, .\\:popover-open")) this.showPopover();
    } catch {
      // Older engines without the Popover API: the region stays a fixed-position
      // element, which still renders (just not on the top layer).
    }
  }

  /**
   * @description Removes the region from the top layer.
   */
  #hideRegion(): void {
    try {
      if (this.matches(":popover-open, .\\:popover-open")) this.hidePopover();
    } catch {
      // See #showRegion.
    }
  }

  /**
   * @description Removes a dismissed toast after its exit transition (with a
   * timeout safety net), then hides the region once the stack is empty.
   *
   * @param toast - The toast marked `data-removed="true"`.
   */
  #finalizeRemoval(toast: HTMLElement): void {
    let done = false;
    const remove = () => {
      if (done) return;
      done = true;
      toast.remove();
      if (this.#toasts().length === 0) {
        this.#setExpanded(false);
        this.#hideRegion();
      }
    };

    toast.addEventListener("transitionend", (event) => {
      if (event.target === toast) remove();
    });

    // Safety net for when no transitionend fires (reduced motion → duration 0).
    // Scaled to the computed duration so retuned --toaster-transition-duration
    // themes aren't yanked out mid-exit.
    const duration = getComputedStyle(toast)
      .transitionDuration.split(",")
      .reduce((max, value) => Math.max(max, Number.parseFloat(value) || 0), 0);
    window.setTimeout(remove, Math.max(EXIT_FALLBACK_MS, duration * 1000 + 100));
  }
}

// --- Imperative API ---

/**
 * @description Resolves a target region from an id, element, or the document.
 *
 * @param region - Region id or element.
 * @returns The region, or `null` when none exists.
 * @private
 */
function resolveRegion(region?: string | Element): UiToaster | null {
  const node =
    region instanceof Element
      ? region
      : typeof region === "string"
        ? document.getElementById(region)
        : document.querySelector("ui-toaster");

  if (node instanceof UiToaster) return node;

  console.warn(
    'Toaster: no <ui-toaster> found. Add `<ui-toaster class="ui-toaster" popover="manual"></ui-toaster>` to the page.',
  );
  return null;
}

/**
 * @description Normalizes the `toast("message")` string shorthand.
 *
 * @param options - Options object or title string.
 * @returns The options object.
 * @private
 */
function toOptions(options?: ToastOptions | string): ToastOptions {
  if (typeof options === "string") return { title: options };
  return options ?? {};
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
const Toaster = {
  /**
   * @description Shows a toast in the target (or first) region.
   *
   * @param options - Options object or title string.
   * @returns The toast id, or `null` when no region exists.
   */
  toast(options?: ToastOptions | string): string | null {
    const resolved = toOptions(options);
    const region = resolveRegion(resolved.region);
    return region ? region.addToast(resolved) : null;
  },

  /**
   * @description Shows a success toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  success(message: string, options?: ToastOptions): string | null {
    return Toaster.toast({ ...options, title: message, variant: "success" });
  },

  /**
   * @description Shows an info toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  info(message: string, options?: ToastOptions): string | null {
    return Toaster.toast({ ...options, title: message, variant: "info" });
  },

  /**
   * @description Shows a warning toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  warning(message: string, options?: ToastOptions): string | null {
    return Toaster.toast({ ...options, title: message, variant: "warning" });
  },

  /**
   * @description Shows a destructive/error toast.
   *
   * @param message - Toast title.
   * @param options - Additional options.
   * @returns The toast id, or `null` when no region exists.
   */
  error(message: string, options?: ToastOptions): string | null {
    return Toaster.toast({ ...options, title: message, variant: "destructive" });
  },

  /**
   * @description Dismisses a toast by id in any region, or every toast everywhere.
   *
   * @param id - Toast id returned by `toast()`.
   */
  dismiss(id?: string): void {
    for (const region of document.querySelectorAll("ui-toaster")) {
      if (region instanceof UiToaster) region.dismiss(id);
    }
  },
};

// Register the element (guarded against double script loads)
if (typeof window !== "undefined" && !customElements.get("ui-toaster")) {
  customElements.define("ui-toaster", UiToaster);
}

// Attach to window for the documented public API, then export for module consumers.
if (typeof window !== "undefined") {
  window.Toaster = Toaster;
  window.UiToaster = UiToaster;
}

// computeStackLayout is exported for unit tests only — not part of the
// documented public API (window.Toaster is the surface app authors use).
export { Toaster, UiToaster, computeStackLayout };
