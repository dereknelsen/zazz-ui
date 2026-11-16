"use strict";

/**
 * @fileoverview Drawer: drag-to-dismiss for `<dialog data-ui="drawer">` bottom sheets.
 * @description A drawer is a native modal `<dialog>`, opened and closed like
 * any other (`command="show-modal"`, `command="close"`, Esc, the backdrop with
 * `closedby="any"`). This script adds the gesture: drag the drawer down and
 * let go to dismiss it.
 *
 * - `data-ui="drawer"` is a drawer on every device.
 * - `data-ui="dialog drawer"` is a drawer below the `sm` band on a touch
 *   screen, and a plain dialog (no dragging) everywhere else.
 *
 * While the pointer is down the drawer follows it 1:1 and the backdrop fades
 * with it. Letting go past a quarter of the drawer's height, or with a quick
 * downward flick, slides it off the bottom edge and then closes it through
 * `requestClose()`, so `cancel` and `close` fire as they do for Esc; anything
 * less returns it to rest. Until it has slid out it can be caught again. Pulling it up
 * past its resting place meets resistance.
 *
 * A drag starts anywhere on the drawer except on form fields, selected text,
 * and anything inside `[data-ui-no-drag]`. Inside scrolling content it starts
 * only once that content is scrolled to the top and the pointer moves down,
 * so the body scrolls first and the drawer follows; the handle
 * (`data-drawer-slot="handle"`) always drags. There is no custom element and
 * nothing to initialize: the script binds a drawer when it opens.
 *
 * **Snap points.** `data-drawer-snap="148px 0.5 1"` gives the drawer resting
 * heights, smallest first: a number up to 1 is a share of the drawer's full
 * height, a `px` or `rem` length is a visible height. It opens at the first.
 * Letting go settles on the nearest; a flick moves one stop in its direction,
 * a very fast one goes all the way (or one stop, with
 * `data-drawer-snap-sequential`), and from the lowest stop a flick or enough
 * travel downward closes the drawer. Below the largest stop the drawer takes
 * every vertical drag and its content does not scroll. A click on the handle
 * steps to the next stop; make the handle a `<button>` to give the keyboard
 * the same. Each change fires `zazz:drawer-snap` (`detail.index`,
 * `detail.value` in px), `data-drawer-state` carries `expanded` at the largest
 * stop, and `snapDrawer(dialog, index)` moves it from script.
 *
 * **The software keyboard.** A phone lays a drawer out against the full
 * screen, which the keyboard does not shrink. While a field in the front
 * drawer has the keyboard up, the drawer's content ends at the keyboard's top
 * edge (its surface runs on underneath), the focused field scrolls into what
 * is still visible, and the page behind stays where it was. Nothing to author.
 *
 * **Stacked drawers.** A drawer opened over another scales the one behind back
 * and lifts it, and that one follows as the front drawer is dragged. Nothing
 * to author: the script counts the open drawers.
 *
 * **Indent.** Wrap the page in `<ui-drawer-indent>` (or put
 * `data-ui="drawer-indent"` on its wrapper) and it scales back behind any open
 * drawer, with rounded top corners, and follows the drag of the last one. Only
 * transforms animate. While indented the wrapper is transformed, so a
 * `position: fixed` element inside it moves with the page; `position: sticky`
 * is unaffected.
 *
 * @example
 * <button data-ui="button" command="show-modal" commandfor="filters">Filters</button>
 * <dialog id="filters" data-ui="drawer" closedby="any">
 *   <div data-drawer-slot="handle"></div>
 *   <div data-drawer-slot="content">
 *     <header data-drawer-slot="header">…</header>
 *     <div data-drawer-slot="body">…</div>
 *   </div>
 * </dialog>
 */

import {
  currentTranslate,
  maxTransitionMs,
  pickSnap,
  rubberBand,
  trackDrag,
} from "../../base/gesture.ts";
import type { DragState } from "../../base/gesture.ts";

// --- Tuning ---

/** Share of the drawer's visible height, at its lowest stop, that dismisses on its own. */
const CLOSE_RATIO = 0.25;

/** Speed that moves the drawer one stop, or dismisses it from the lowest, in px/ms. */
const FLICK_VELOCITY = 0.4;

/** Speed that skips every stop: all the way open, or closed, in px/ms. */
const FLING_VELOCITY = 2;

/**
 * After inner content scrolls, how long before the drawer may be dragged, in
 * ms. A fast scroll that reaches the top would otherwise carry straight on
 * into dragging the drawer away.
 */
const SCROLL_GUARD_MS = 100;

/** Length of the backdrop's scrub animation: its timeline is drag progress, not time. */
const SCRUB_MS = 1000;

const DRAWER = 'dialog[data-ui~="drawer"]';
const HANDLE = '[data-drawer-slot~="handle"]';
const INDENT = 'ui-drawer-indent, [data-ui~="drawer-indent"]';
const INDENT_STATE = "data-drawer-indent-state";

// --- Helpers ---

/** Adds or removes one token of a space-separated state attribute; an empty attribute is removed. */
function setToken(element: Element, attribute: string, token: string, on: boolean): void {
  const tokens = new Set((element.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean));
  if (tokens.has(token) === on) return;
  if (on) tokens.add(token);
  else tokens.delete(token);
  if (tokens.size) element.setAttribute(attribute, [...tokens].join(" "));
  else element.removeAttribute(attribute);
}

/** Adds or removes a token of a drawer's `data-drawer-state`. */
function setState(dialog: HTMLDialogElement, token: string, on: boolean): void {
  setToken(dialog, "data-drawer-state", token, on);
}

/** Adds or removes the `dragging` token of a drawer's `data-drawer-state`. */
function setDragging(dialog: HTMLDialogElement, on: boolean): void {
  setState(dialog, "dragging", on);
}

/** Clears everything a drag wrote on the drawer. */
function reset(dialog: HTMLDialogElement): void {
  setDragging(dialog, false);
  dialog.style.removeProperty("translate");
  dialog.style.removeProperty("--_drawer-backdrop");
}

/**
 * @description Reads a drawer's snap points as resting positions: px the
 * drawer is pushed down at each, the smallest visible height first.
 *
 * @param dialog - The drawer.
 * @param height - The drawer's full visible height in px.
 * @returns The positions, descending; `[0]` without usable snap points.
 * @private
 */
function readStops(dialog: HTMLDialogElement, height: number): number[] {
  const raw = dialog.getAttribute("data-drawer-snap")?.trim();
  if (!raw) return [0];
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const positions = new Set<number>();
  for (const token of raw.split(/\s+/)) {
    const value = Number.parseFloat(token);
    if (!Number.isFinite(value) || value <= 0) continue;
    let visible = value * height;
    if (token.endsWith("rem")) visible = value * rem;
    else if (token.endsWith("px") || value > 1) visible = value;
    positions.add(Math.round(height - Math.min(height, Math.max(1, visible))));
  }
  return positions.size ? [...positions].sort((a, b) => b - a) : [0];
}

/**
 * @description Starts a paused opacity animation on the drawer's backdrop, to
 * be scrubbed with the drag. An animation, not a style write: it reaches the
 * pseudo-element without restyling the drawer's content, in engines that do
 * not re-resolve `::backdrop` when a non-inherited property changes on its
 * dialog (WebKit).
 *
 * @param dialog - The drawer.
 * @returns The animation, or null where `::backdrop` cannot be animated; the
 * caller then writes `--_drawer-backdrop`, which drawer.css reads.
 * @private
 */
function scrubBackdrop(dialog: HTMLDialogElement): Animation | null {
  try {
    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
      pseudoElement: "::backdrop",
      duration: SCRUB_MS,
      fill: "both",
    });
    animation.pause();
    return animation;
  } catch {
    return null;
  }
}

/** Whether drawer.css has the dialog in drawer mode right now. */
function inDrawerMode(dialog: HTMLDialogElement): boolean {
  return getComputedStyle(dialog).getPropertyValue("--_drawer-mode").trim() === "1";
}

/** Whether an element scrolls its content on the block axis. */
function scrolls(element: Element): boolean {
  if (element.scrollHeight <= element.clientHeight) return false;
  const overflow = getComputedStyle(element).overflowY;
  return overflow === "auto" || overflow === "scroll";
}

/**
 * @description Whether a press may drag the drawer, given what it landed on
 * and which way it is moving.
 *
 * @param dialog - The drawer.
 * @param drag - The drag about to start; `offset` carries its direction.
 * @param lastScroll - When content inside the drawer last scrolled.
 * @param partial - Whether the drawer rests below its largest snap point.
 * @returns Whether the drawer takes the gesture.
 * @private
 */
function claims(
  dialog: HTMLDialogElement,
  drag: DragState,
  lastScroll: number,
  partial: boolean,
): boolean {
  if (!inDrawerMode(dialog)) return false;

  // a press on the backdrop targets the dialog, outside its box
  const box = dialog.getBoundingClientRect();
  if (drag.startY < box.top || drag.startX < box.left || drag.startX > box.right) return false;

  if (drag.target.closest(HANDLE)) return true;
  // below its largest stop the drawer moves before anything inside it scrolls
  if (partial) return true;

  // scrolling content goes first: it must be at the top, and the pull downward
  const down = drag.offset > 0;
  for (
    let node: Element | null = drag.target;
    node && dialog.contains(node);
    node = node.parentElement
  ) {
    if (scrolls(node) && (node.scrollTop > 0 || !down)) return false;
  }
  return performance.now() - lastScroll >= SCROLL_GUARD_MS;
}

// --- Stack ---

/** The open drawers in drawer mode, the front one last. */
const stack: HTMLDialogElement[] = [];

/**
 * @description Writes each open drawer's place in the stack: how many drawers
 * sit in front of it (`--_drawer-depth`, `stacked`) and whether it opened over
 * another (`nested`). Runs when a drawer opens or closes, never per frame.
 * @private
 */
function restack(): void {
  // a drawer removed from the page while open never reports its close
  for (let index = stack.length - 1; index >= 0; index--) {
    const dialog = stack[index]!;
    if (!dialog.isConnected || !dialog.open) stack.splice(index, 1);
  }
  stack.forEach((dialog, index) => {
    const depth = stack.length - 1 - index;
    setState(dialog, "following", false);
    setState(dialog, "stacked", depth > 0);
    setState(dialog, "nested", index > 0);
    if (depth > 0) dialog.style.setProperty("--_drawer-depth", String(depth));
    else dialog.style.removeProperty("--_drawer-depth");
  });
  indentPose(stack.length > 0);
}

/**
 * @description Moves the drawers behind `front` with its drag: at progress 1
 * each sits where it will once `front` is gone. The depth is a non-inheriting
 * property, so the write restyles those drawers and not their content.
 *
 * @param front - The drawer being dragged or released.
 * @param progress - How far `front` is toward closed, 0 to 1.
 * @param live - Whether a pointer is driving it (transitions off).
 * @private
 */
function follow(front: HTMLDialogElement, progress: number, live: boolean): void {
  const index = stack.indexOf(front);
  for (let behind = 0; behind < index; behind++) {
    const dialog = stack[behind]!;
    dialog.style.setProperty("--_drawer-depth", String(index - behind - progress));
    setState(dialog, "following", live);
  }
}

// --- Indent ---

/** The page wrapper that is indented right now, and what ends its return to rest. */
let indented: HTMLElement | null = null;
let cancelOutdent: (() => void) | null = null;

/**
 * @description Measures what the indent needs, once per activation and on
 * resize: the scale that pulls each side in by the inset hook, and where the
 * viewport sits inside the wrapper (the transform's origin, the clip, and the
 * corner pieces all hang off its top edge).
 * @private
 */
function measureIndent(wrapper: HTMLElement): void {
  const box = wrapper.getBoundingClientRect();
  const width = wrapper.offsetWidth || 1;
  const inset =
    Number.parseFloat(getComputedStyle(wrapper).getPropertyValue("--_drawer-indent-inset")) || 0;
  const top = Math.max(0, -box.top);
  const bottom = Math.max(0, wrapper.offsetHeight - top - window.innerHeight);
  wrapper.style.setProperty("--_drawer-indent-scale", String(Math.max(0, 1 - (inset * 2) / width)));
  wrapper.style.setProperty("--_drawer-indent-top", `${top}px`);
  wrapper.style.setProperty("--_drawer-indent-bottom", `${bottom}px`);
}

/**
 * @description Indents the page wrapper or sends it back to rest. The pose is
 * a state token and the motion a CSS transition; the `on` token (clip,
 * corners, backing) outlasts the pose until the return has finished.
 *
 * @param active - Whether a drawer is open.
 * @private
 */
function indentPose(active: boolean): void {
  // a wrapper that left the page takes its state with it
  if (indented && !indented.isConnected) {
    cancelOutdent?.();
    indented = null;
  }
  const wrapper = indented ?? document.querySelector<HTMLElement>(INDENT);
  if (!wrapper) return;
  if (active) {
    cancelOutdent?.();
    if (indented !== wrapper) {
      measureIndent(wrapper);
      indented = wrapper;
    }
    setToken(wrapper, INDENT_STATE, "on", true);
    setToken(wrapper, INDENT_STATE, "active", true);
    return;
  }
  if (!indented || cancelOutdent) return;
  setToken(wrapper, INDENT_STATE, "dragging", false);
  wrapper.style.removeProperty("--_drawer-indent-amount");
  setToken(wrapper, INDENT_STATE, "active", false);

  const off = () => {
    cancelOutdent?.();
    wrapper.removeAttribute(INDENT_STATE);
    for (const name of ["scale", "top", "bottom"]) {
      wrapper.style.removeProperty(`--_drawer-indent-${name}`);
    }
    indented = null;
  };
  const ms = maxTransitionMs(wrapper);
  if (ms <= 0) {
    off();
    return;
  }
  const onReturned = (event: TransitionEvent) => {
    if (event.target === wrapper && event.propertyName === "scale") off();
  };
  const timer = window.setTimeout(off, ms + 100);
  wrapper.addEventListener("transitionend", onReturned);
  cancelOutdent = () => {
    window.clearTimeout(timer);
    wrapper.removeEventListener("transitionend", onReturned);
    cancelOutdent = null;
  };
}

/**
 * @description Links the indent to the last open drawer's drag.
 *
 * @param progress - How far the drawer is toward closed, 0 to 1.
 * @param live - Whether a pointer is driving it (transitions off).
 * @private
 */
function indentProgress(progress: number, live: boolean): void {
  if (!indented) return;
  setToken(indented, INDENT_STATE, "dragging", live);
  if (live) indented.style.setProperty("--_drawer-indent-amount", String(1 - progress));
  else indented.style.removeProperty("--_drawer-indent-amount");
}

// --- Keyboard ---

/** The keyboard's height on the front drawer, which drawer.css adds to its bottom padding. */
const KEYBOARD_INSET = "--_drawer-keyboard";

/** Space kept between a revealed field and the keyboard's top edge, in px. */
const REVEAL_GAP = 16;

/** Inputs that open a picker or nothing rather than the software keyboard. */
const NO_KEYBOARD =
  /^(?:button|checkbox|color|file|hidden|image|radio|range|reset|submit|date|datetime-local|month|time|week)$/;

/** Whether focus on this element opens the software keyboard. */
function typesText(element: Element): boolean {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly;
  if (element instanceof HTMLInputElement)
    return !element.readOnly && !NO_KEYBOARD.test(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

/**
 * @description How much of the layout viewport the software keyboard covers,
 * from the bottom: the part below the visual viewport. 0 while the page is
 * pinch-zoomed, when the visual viewport is smaller for another reason.
 * @private
 */
function keyboardInset(): number {
  const viewport = window.visualViewport;
  if (!viewport || Math.abs(viewport.scale - 1) > 0.01) return 0;
  const bottom = Math.max(0, viewport.offsetTop) + viewport.height;
  return Math.max(0, Math.round(window.innerHeight - Math.min(window.innerHeight, bottom)));
}

/**
 * @description Keeps an open drawer usable with the software keyboard up.
 * iOS lays out the top layer against the layout viewport, which the keyboard
 * does not shrink, and scrolls the page behind a modal to reveal a focused
 * field. While the drawer is the front one this writes the keyboard's height
 * to `--_drawer-keyboard` (drawer.css pads the sheet by it, so its
 * content ends at the keyboard's top edge), holds the page at its scroll
 * position, and scrolls a focused field into the part of its scrolling slot
 * that is still visible.
 *
 * @param dialog - The drawer.
 * @param signal - Aborts when the drawer closes.
 * @param onChange - Runs after the inset changes, once the new padding is in place.
 * @private
 */
function trackKeyboard(dialog: HTMLDialogElement, signal: AbortSignal, onChange: () => void): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const front = () => stack[stack.length - 1] === dialog;
  const pageX = window.scrollX;
  const pageY = window.scrollY;
  let frame = 0;
  let current = 0;

  const update = () => {
    frame = 0;
    const inset = front() ? keyboardInset() : 0;
    if (inset === current) return;
    current = inset;
    if (inset > 0) dialog.style.setProperty(KEYBOARD_INSET, `${inset}px`);
    else dialog.style.removeProperty(KEYBOARD_INSET);
    onChange();
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  /** Scrolls the field's scrolling slot so the field sits above the keyboard and below the slot's top. */
  const reveal = (field: Element) => {
    if (!dialog.contains(field) || document.activeElement !== field) return;
    let container: Element | null = field.parentElement;
    while (container && dialog.contains(container) && !scrolls(container)) {
      container = container.parentElement;
    }
    if (!container || !dialog.contains(container)) return;
    const box = container.getBoundingClientRect();
    const target = field.getBoundingClientRect();
    const visibleBottom = Math.min(box.bottom, viewport.offsetTop + viewport.height) - REVEAL_GAP;
    const visibleTop = Math.max(box.top, viewport.offsetTop) + REVEAL_GAP;
    let by = 0;
    if (target.bottom > visibleBottom) by = target.bottom - visibleBottom;
    if (target.top - by < visibleTop) by = target.top - visibleTop;
    if (Math.abs(by) < 1) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollBy({ top: by, behavior: still ? "instant" : "smooth" });
  };

  viewport.addEventListener("resize", schedule, { signal });
  viewport.addEventListener("scroll", schedule, { signal });

  // the page behind a modal stays where it was, whatever iOS scrolls to show the field
  window.addEventListener(
    "scroll",
    () => {
      if (!front() || (window.scrollX === pageX && window.scrollY === pageY)) return;
      window.scrollTo({ left: pageX, top: pageY, behavior: "instant" });
    },
    { passive: true, signal },
  );

  // the keyboard settles over a few frames: reveal after it has, and again once it is up
  dialog.addEventListener(
    "focusin",
    (event) => {
      const field = event.target;
      if (!(field instanceof Element) || !typesText(field) || !front()) return;
      for (const ms of [100, 350]) {
        const timer = window.setTimeout(() => {
          update();
          reveal(field);
        }, ms);
        signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
      }
    },
    { signal },
  );

  signal.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    dialog.style.removeProperty(KEYBOARD_INSET);
  });
  update();
}

// --- Binding ---

/** What an open drawer exposes to the rest of the module. */
interface BoundDrawer {
  controller: AbortController;
  snapTo(index: number): void;
}

/** Open drawers and what unbinds or moves each. */
const bound = new WeakMap<HTMLDialogElement, BoundDrawer>();

/** Each drawer's backdrop animation, kept past its close so the next open can drop it. */
const fades = new WeakMap<HTMLDialogElement, Animation>();

/**
 * @description Binds drag-to-dismiss to an open drawer until it closes.
 *
 * @param dialog - The drawer.
 */
function bindDrawer(dialog: HTMLDialogElement): void {
  if (bound.has(dialog)) return;
  const controller = new AbortController();
  const { signal } = controller;
  // what the last dismissal left in place: the slid-out translate, the cleared backdrop
  fades.get(dialog)?.cancel();
  fades.delete(dialog);
  reset(dialog);

  const snaps = dialog.hasAttribute("data-drawer-snap");
  let lastScroll = 0;
  // where the drawer was when the drag caught it (mid snap-back, usually its stop)
  let base = 0;
  let height = 1;
  // the sheet's bleed past the bottom edge: the most it may be pulled up
  let lift = 0;
  // resting positions, px pushed down, the lowest snap point first; and the one it rests at
  let stops = [0];
  let active = 0;
  let fade: Animation | null = null;
  // undoes a dismissal still sliding out, so a new drag can catch the drawer
  let cancelClose: (() => void) | null = null;

  const measure = () => {
    lift = Math.max(0, -Number.parseFloat(getComputedStyle(dialog).marginBlockEnd) || 0);
    // the layout height: a stacked drawer's scale must not shrink it
    height = Math.max(1, dialog.offsetHeight - lift);
    stops = snaps ? readStops(dialog, height) : [0];
    active = Math.min(active, stops.length - 1);
  };

  /** Writes where the drawer rests: drawer.css turns `--_drawer-snap` into its `translate`. */
  const place = () => {
    if (!snaps) return;
    const largest = active === stops.length - 1;
    dialog.style.setProperty("--_drawer-snap", `${stops[active] ?? 0}px`);
    setState(dialog, "expanded", largest);
    setState(dialog, "partial", !largest);
  };

  /** Everything that moves with the drawer's progress toward closed, besides its backdrop. */
  const link = (progress: number, live: boolean) => {
    follow(dialog, progress, live);
    if (stack.length === 1 && stack[0] === dialog) indentProgress(progress, live);
  };

  /**
   * Runs the backdrop from where the drag left it to clear or back to full,
   * in `ms`. Back at full the animation is dropped; clear, it holds until the
   * drawer next opens, over whatever the closed dialog's own backdrop does.
   */
  const settle = (closing: boolean, ms: number) => {
    dialog.style.removeProperty("--_drawer-backdrop");
    const animation = fade;
    if (!animation) return;
    const done = () => {
      if (closing || fade !== animation || animation.playState !== "finished") return;
      animation.cancel();
      fades.delete(dialog);
      fade = null;
    };
    const at = Number(animation.currentTime) || 0;
    const left = closing ? SCRUB_MS - at : at;
    if (ms <= 0 || left <= 0) {
      animation.playbackRate = closing ? 1 : -1;
      animation.finish();
      done();
      return;
    }
    animation.playbackRate = ((closing ? 1 : -1) * left) / ms;
    animation.play();
    animation.finished.then(done, () => {});
  };

  /** Settles the drawer on a stop; the dialog's `translate` transition carries it there. */
  const snapTo = (index: number) => {
    const next = Math.min(Math.max(index, 0), stops.length - 1);
    const changed = next !== active;
    active = next;
    place();
    setDragging(dialog, false);
    settle(false, maxTransitionMs(dialog));
    dialog.style.removeProperty("translate");
    link(0, false);
    if (!changed) return;
    dialog.dispatchEvent(
      new CustomEvent("zazz:drawer-snap", {
        bubbles: true,
        detail: { index: active, value: height - (stops[active] ?? 0) },
      }),
    );
  };

  const rest = () => snapTo(active);

  /** Closes the dialog; a `cancel` listener that keeps it open sends it back to rest. */
  const close = () => {
    if (!dialog.open) return;
    if (typeof dialog.requestClose === "function") dialog.requestClose();
    else dialog.close();
    if (!dialog.open) return;
    if (stack.length === 1) indentPose(true);
    rest();
  };

  /**
   * Slides the drawer off the bottom edge while it is still open, then closes
   * it. The slide is the drawer's own `translate` transition, so it does not
   * depend on the engine animating a dialog's exit (WebKit removes a closed
   * dialog at once), and until it ends the drawer can be caught again.
   * Whatever is linked to the drawer leaves with it.
   */
  const slideOutAndClose = (ms: number) => {
    dialog.style.translate = `0 ${height + lift}px`;
    settle(true, ms);
    follow(dialog, 1, false);
    if (stack.length === 1 && stack[0] === dialog) indentPose(false);
    if (ms <= 0) {
      close();
      return;
    }
    const onSlid = (event: TransitionEvent) => {
      if (event.target === dialog && event.propertyName === "translate") finish();
    };
    const finish = () => {
      cancelClose?.();
      close();
    };
    // the timer covers a transition that never reports its end
    const timer = window.setTimeout(finish, ms + 100);
    dialog.addEventListener("transitionend", onSlid);
    cancelClose = () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("transitionend", onSlid);
      cancelClose = null;
    };
  };

  bound.set(dialog, { controller, snapTo });
  if (inDrawerMode(dialog)) {
    measure();
    place();
    stack.push(dialog);
    restack();
    trackKeyboard(dialog, signal, () => {
      measure();
      place();
    });
  }

  signal.addEventListener("abort", () => {
    cancelClose?.();
    // a drawer closed some other way mid-drag: nothing may hold the backdrop
    if (fade?.playState === "paused") {
      fade.cancel();
      fades.delete(dialog);
    }
  });

  dialog.addEventListener(
    "scroll",
    () => {
      lastScroll = performance.now();
    },
    { capture: true, passive: true, signal },
  );

  // the handle steps through the snap points: a click, so a button handle works from the keyboard
  dialog.addEventListener(
    "click",
    (event) => {
      if (stops.length < 2 || !(event.target instanceof Element)) return;
      if (event.target.closest(HANDLE)) snapTo((active + 1) % stops.length);
    },
    { signal },
  );

  window.addEventListener(
    "resize",
    () => {
      if (!stack.includes(dialog)) return;
      measure();
      place();
    },
    { signal },
  );

  trackDrag(dialog, {
    axis: "y",
    signal,
    canStart: (drag) => claims(dialog, drag, lastScroll, active < stops.length - 1),
    onStart: () => {
      // a drawer caught on its way out: what left with it comes back
      if (cancelClose && stack.length === 1) indentPose(true);
      cancelClose?.();
      base = currentTranslate(dialog).y;
      measure();
      if (!fade) {
        fade = scrubBackdrop(dialog);
        if (fade) fades.set(dialog, fade);
      }
      fade?.pause();
      setDragging(dialog, true);
    },
    onMove: ({ offset }) => {
      const travel = base + offset;
      const top = stops[stops.length - 1] ?? 0;
      const y = travel >= top ? travel : top + rubberBand(travel - top, lift + top);
      dialog.style.translate = `0 ${y}px`;
      // progress runs from the lowest stop to gone: above it nothing fades
      const lowest = stops[0] ?? 0;
      const progress = Math.min(1, Math.max(0, (y - lowest) / Math.max(1, height - lowest)));
      if (fade) fade.currentTime = progress * SCRUB_MS;
      else dialog.style.setProperty("--_drawer-backdrop", String(1 - progress));
      link(progress, true);
    },
    onEnd: ({ offset, velocity }) => {
      const target = pickSnap({
        stops,
        position: base + offset,
        velocity,
        active,
        size: height,
        closeRatio: CLOSE_RATIO,
        flick: FLICK_VELOCITY,
        fling: FLING_VELOCITY,
        sequential: dialog.hasAttribute("data-drawer-snap-sequential"),
      });
      // transitions back on: the inline translate now eases to wherever it is set
      setDragging(dialog, false);
      if (target < 0) slideOutAndClose(maxTransitionMs(dialog));
      else snapTo(target);
    },
    onCancel: rest,
  });
}

/** Unbinds a drawer that closed. */
function unbindDrawer(dialog: HTMLDialogElement): void {
  bound.get(dialog)?.controller.abort();
  bound.delete(dialog);
  dialog.removeAttribute("data-drawer-state");
  dialog.style.removeProperty("--_drawer-depth");
  const index = stack.indexOf(dialog);
  if (index < 0) return;
  stack.splice(index, 1);
  restack();
}

/**
 * @description Moves an open drawer to one of its snap points.
 *
 * @param dialog - The drawer.
 * @param index - The snap point, counted from the smallest; clamped to the ones it has.
 */
function snapDrawer(dialog: HTMLDialogElement, index: number): void {
  bound.get(dialog)?.snapTo(index);
}

interface InitDrawersFn {
  (): void;
  _bound?: boolean;
}

/**
 * @description Starts drawer binding for the page: every drawer is bound when
 * the dialog lifecycle reports it open and unbound when it closes. Idempotent.
 */
const initDrawers: InitDrawersFn = function () {
  if (initDrawers._bound) return;
  initDrawers._bound = true;

  document.addEventListener("zazz:dialog-open", (event) => {
    if (event.target instanceof HTMLDialogElement && event.target.matches(DRAWER)) {
      bindDrawer(event.target);
    }
  });
  document.addEventListener("zazz:dialog-close", (event) => {
    if (event.target instanceof HTMLDialogElement) unbindDrawer(event.target);
  });

  window.addEventListener("resize", () => {
    if (indented) measureIndent(indented);
  });

  // drawers that were already open when the script loaded
  for (const dialog of document.querySelectorAll<HTMLDialogElement>(`${DRAWER}[open]`)) {
    bindDrawer(dialog);
  }
};

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrawers);
  } else {
    initDrawers();
  }
}

export { bindDrawer, initDrawers, snapDrawer };
