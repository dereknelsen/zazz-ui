"use strict";

/**
 * @fileoverview Shared drag tracking for gesture-driven primitives (toast
 * swipe-to-dismiss, the drawer).
 * @description A gesture has two phases, and this module owns only the first.
 *
 * - **Track** (pointer down): `trackDrag()` reports the pointer's offset along a
 *   locked axis on every move. The consumer writes it straight to the dragged
 *   element's `translate`, with transitions off, so the element follows the
 *   pointer 1:1. `translate` composes with whatever `transform` the element
 *   already has, and writing it on the element itself (never a custom property
 *   on an ancestor) keeps the per-frame style work to that one element.
 * - **Release** (pointer up): the consumer decides with `shouldDismiss()`
 *   (distance *or* velocity), then lets its own CSS transitions finish the
 *   motion, either to the dismissed state or back to rest. `flickDuration()`
 *   shortens that transition for a fast flick. Transitions, never keyframes:
 *   they retarget from wherever the element is, so motion stays interruptible.
 *
 * A drag starts only once the pointer has moved past a small slop, so a press
 * on a button inside the element is still a click; the click that would follow
 * a real drag is swallowed. Form fields, editable content, and anything inside
 * `[data-ui-no-drag]` never start a drag, and neither does a press that is
 * selecting text: give a surface that should drag from its text
 * `user-select: none`.
 *
 * Elements that always drag set `touch-action` in CSS. Where the answer depends
 * on state (a drawer's scrolling body), `trackDrag()` cancels the first
 * `touchmove` of a gesture it has claimed, which is the one moment a browser
 * lets a script take a touch away from native scrolling.
 */

// --- Types ---

/** The axis a drag is locked to. */
type DragAxis = "x" | "y";

/** One drag, as reported to every callback. */
interface DragState {
  /** The axis the drag locked to. */
  axis: DragAxis;
  /** Signed px along `axis` since the drag started (0 at start, no slop jump). */
  offset: number;
  /** Signed px/ms along `axis`, measured over the last ~100ms. */
  velocity: number;
  /** Viewport x of the original press. */
  startX: number;
  /** Viewport y of the original press. */
  startY: number;
  /** The element that was pressed. */
  target: Element;
  /** `mouse`, `touch`, or `pen`. */
  pointerType: string;
  /** The pointer event behind this report. */
  event: PointerEvent;
}

/** Options for `trackDrag()`. */
interface DragOptions {
  /** The axis to track; `both` locks to whichever axis the pointer moves on first. */
  axis: DragAxis | "both";
  /** Px the pointer travels before a drag starts. Default: 6 for a mouse, 0 for touch and pen. */
  slop?: number;
  /**
   * Veto, asked once when the axis locks. `offset` is the travel so far, so
   * its sign is the drag's direction. Returning false leaves the gesture to
   * the browser (scrolling, text selection) until the pointer lifts.
   */
  canStart?: (drag: DragState) => boolean;
  /** The drag started; `offset` is 0. */
  onStart?: (drag: DragState) => void;
  /** The pointer moved. */
  onMove: (drag: DragState) => void;
  /** The pointer lifted. */
  onEnd: (drag: DragState) => void;
  /** The browser took the pointer away, or tracking was aborted mid-drag. Default: `onEnd`. */
  onCancel?: (drag: DragState) => void;
  /** Unbinds everything; a drag in flight is cancelled. */
  signal: AbortSignal;
}

/** A pointer position at a point in time. */
interface VelocitySample {
  /** Timestamp in ms. */
  time: number;
  /** Viewport x. */
  x: number;
  /** Viewport y. */
  y: number;
}

/** Rolling pointer-velocity estimate. */
interface VelocityTracker {
  /** Records a position. */
  add(time: number, x: number, y: number): void;
  /** Signed px/ms on each axis over the tracked window. */
  velocity(): { x: number; y: number };
}

// --- Pure helpers ---

/** How far back the velocity estimate looks, in ms. */
const VELOCITY_WINDOW_MS = 100;

/** Slop for a mouse: a click with a small wobble is not a drag. */
const MOUSE_SLOP_PX = 6;

/** Shortest release transition a flick can ask for, in ms. */
const MIN_FLICK_MS = 120;

/**
 * How long after a drag the click it produces is swallowed, in ms. The click
 * follows the pointer up directly; the window only has to outlast that, and
 * stays short so a deliberate click right after a swipe still lands.
 */
const CLICK_SUPPRESS_MS = 50;

/** Targets that never start a drag: they need the pointer for themselves. */
const NO_DRAG =
  'input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-ui-no-drag]';

/**
 * @description Creates a rolling velocity estimate from the samples of the
 * last 100ms. A whole-gesture average (distance over total time) under-reads
 * a flick that follows a pause and over-reads a pause that follows a flick;
 * the window reads what the pointer was doing when it lifted.
 *
 * @returns The tracker.
 */
function createVelocityTracker(): VelocityTracker {
  let samples: VelocitySample[] = [];
  return {
    add(time, x, y) {
      samples.push({ time, x, y });
      samples = samples.filter((sample) => time - sample.time <= VELOCITY_WINDOW_MS);
    },
    velocity() {
      const first = samples[0];
      const last = samples.at(-1);
      if (!first || !last) return { x: 0, y: 0 };
      const elapsed = last.time - first.time;
      if (elapsed <= 0) return { x: 0, y: 0 };
      return { x: (last.x - first.x) / elapsed, y: (last.y - first.y) / elapsed };
    },
  };
}

/**
 * @description Resistance past a boundary: the further the pointer goes, the
 * less the element follows, approaching `limit` and never passing it.
 *
 * @param overshoot - Px the pointer has travelled past the boundary (sign kept).
 * @param limit - The most the element may move, in px.
 * @param constant - Initial follow ratio (0.55 is the iOS scroll-view feel).
 * @returns The damped distance, same sign as `overshoot`.
 */
function rubberBand(overshoot: number, limit: number, constant = 0.55): number {
  if (limit <= 0 || overshoot === 0) return 0;
  const distance = Math.abs(overshoot);
  return (Math.sign(overshoot) * (distance * limit * constant)) / (limit + constant * distance);
}

/**
 * @description Decides a release: dismiss on a fast enough flick, or on enough
 * distance unless the pointer was flicking back toward rest. Both inputs are
 * measured toward the dismissal direction (positive = away from rest).
 *
 * @param release - The release measurements and thresholds.
 * @returns Whether to dismiss.
 */
function shouldDismiss(release: {
  /** Px travelled toward dismissal. */
  offset: number;
  /** Px/ms toward dismissal at release. */
  velocity: number;
  /** Px of travel that dismisses on its own. */
  distance: number;
  /** Px/ms that dismisses on its own. */
  velocityThreshold: number;
}): boolean {
  const { offset, velocity, distance, velocityThreshold } = release;
  if (offset <= 0) return false;
  if (velocity > velocityThreshold) return true;
  return offset >= distance && velocity > -velocityThreshold;
}

/**
 * @description Picks where an element with several resting places settles on
 * release. Stops are positions along the dismissal axis in px, the furthest
 * from dismissal last (a drawer's largest snap point is `0`, smaller ones are
 * pushed further down). A very fast flick goes to the far end or dismisses, a
 * flick over a short distance moves one stop, and anything slower settles on
 * the nearest stop, or dismisses once it is far enough past the first.
 *
 * @param release - The release measurements, the stops, and the thresholds.
 * @returns The index of the stop to settle on, or `-1` to dismiss.
 */
function pickSnap(release: {
  /** Resting positions in px toward dismissal, descending (index 0 is nearest dismissal). */
  stops: readonly number[];
  /** Where the element is now, on the same axis. */
  position: number;
  /** Px/ms toward dismissal at release. */
  velocity: number;
  /** The stop the drag started from. */
  active: number;
  /** The position at which the element is fully dismissed. */
  size: number;
  /** Share of the first stop's visible extent that dismisses on its own (default 0.25). */
  closeRatio?: number;
  /** Px/ms that moves one stop (default 0.4). */
  flick?: number;
  /** Px/ms that skips to the far end or dismisses (default 2). */
  fling?: number;
  /** A fast flick moves one stop instead of skipping. */
  sequential?: boolean;
}): number {
  const { stops, position, velocity, active, size, sequential = false } = release;
  const { closeRatio = 0.25, flick = 0.4, fling = 2 } = release;
  const last = stops.length - 1;
  if (last < 0) return -1;
  const speed = Math.abs(velocity);
  const towardDismissal = velocity > 0;

  if (!sequential && speed > fling) return towardDismissal ? -1 : last;

  const from = stops[Math.min(Math.max(active, 0), last)] ?? 0;
  if (speed > flick && Math.abs(position - from) < size * 0.4) {
    return towardDismissal ? active - 1 : Math.min(last, active + 1);
  }

  const first = stops[0] ?? 0;
  if (position > first) {
    // past the first stop: enough travel dismisses, unless the pointer was heading back
    return position - first >= (size - first) * closeRatio && velocity > -flick ? -1 : 0;
  }
  let nearest = 0;
  for (let index = 1; index <= last; index++) {
    if (Math.abs((stops[index] ?? 0) - position) < Math.abs((stops[nearest] ?? 0) - position)) {
      nearest = index;
    }
  }
  return nearest;
}

/**
 * @description The release transition's duration for a flick: the time the
 * remaining travel takes at the release speed, never longer than the
 * element's own duration (so `0` under reduced motion stays `0`) and never
 * shorter than a floor that keeps the motion visible.
 *
 * @param remaining - Px left to travel.
 * @param velocity - Release speed in px/ms (sign ignored).
 * @param max - The element's own transition duration in ms.
 * @returns The duration in ms.
 */
function flickDuration(remaining: number, velocity: number, max: number): number {
  const speed = Math.abs(velocity);
  if (speed === 0 || max <= 0) return Math.max(0, max);
  return Math.min(max, Math.max(Math.min(MIN_FLICK_MS, max), Math.abs(remaining) / speed));
}

// --- DOM helpers ---

/**
 * @description An element's longest computed transition duration.
 *
 * @param element - The element to read.
 * @returns The duration in ms.
 */
function maxTransitionMs(element: Element): number {
  return (
    getComputedStyle(element)
      .transitionDuration.split(",")
      .reduce((max, value) => Math.max(max, Number.parseFloat(value) || 0), 0) * 1000
  );
}

/**
 * @description An element's current `translate`, mid-transition included, so
 * a drag that catches the element on its way back to rest continues from
 * where it is instead of jumping to the pointer.
 *
 * @param element - The element to read.
 * @returns The translation in px.
 */
function currentTranslate(element: Element): { x: number; y: number } {
  const [x = 0, y = 0] = getComputedStyle(element)
    .translate.split(/\s+/)
    .map((part) => Number.parseFloat(part) || 0);
  return { x, y };
}

/** Swallows the click a finished drag produces, wherever it lands. */
function suppressNextClick(): void {
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(
    () => document.removeEventListener("click", swallow, { capture: true }),
    CLICK_SUPPRESS_MS,
  );
}

// --- Drag tracking ---

/** A press being followed: undecided, dragging, or left to the browser. */
interface DragSession {
  phase: "pending" | "dragging" | "rejected";
  pointerId: number;
  pointerType: string;
  target: Element;
  /** Where the press landed. */
  startX: number;
  startY: number;
  /** Where the drag started (the press plus the slop), the zero of `offset`. */
  originX: number;
  originY: number;
  axis: DragAxis;
  tracker: VelocityTracker;
  /** The page's selected text at the press, to tell a selection this press is making. */
  selection: string;
}

/**
 * @description Tracks drags that start on `element`. One pointer at a time:
 * further touches are ignored until the first lifts.
 *
 * @param element - The element a drag must start on (usually the one that moves).
 * @param options - Axis, callbacks, and the abort signal that unbinds it.
 * @example
 * trackDrag(sheet, {
 *   axis: "y",
 *   signal,
 *   onStart: () => sheet.setAttribute("data-sheet-state", "dragging"),
 *   onMove: ({ offset }) => (sheet.style.translate = `0 ${Math.max(0, offset)}px`),
 *   onEnd: ({ offset, velocity }) => { … },
 * });
 */
function trackDrag(element: HTMLElement, options: DragOptions): void {
  const { signal } = options;
  if (signal.aborted) return;

  let session: DragSession | null = null;

  const report = (active: DragSession, event: PointerEvent): DragState => {
    const horizontal = active.axis === "x";
    const velocity = active.tracker.velocity();
    return {
      axis: active.axis,
      offset: horizontal ? event.clientX - active.originX : event.clientY - active.originY,
      velocity: horizontal ? velocity.x : velocity.y,
      startX: active.startX,
      startY: active.startY,
      target: active.target,
      pointerType: active.pointerType,
      event,
    };
  };

  const release = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerCancel);
    session = null;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (session || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(NO_DRAG)) return;

    const tracker = createVelocityTracker();
    tracker.add(event.timeStamp, event.clientX, event.clientY);
    session = {
      phase: "pending",
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      target,
      startX: event.clientX,
      startY: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
      axis: options.axis === "x" ? "x" : "y",
      tracker,
      selection: document.getSelection()?.toString() ?? "",
    };
    // on the document: before capture, a mouse can leave the element
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
  };

  const onPointerMove = (event: PointerEvent) => {
    const active = session;
    if (!active || event.pointerId !== active.pointerId) return;
    active.tracker.add(event.timeStamp, event.clientX, event.clientY);

    if (active.phase === "pending") {
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      const slop = options.slop ?? (active.pointerType === "mouse" ? MOUSE_SLOP_PX : 0);
      if (dx === 0 && dy === 0) return;
      if (Math.hypot(dx, dy) < slop) return;

      const dominant: DragAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      active.axis = options.axis === "both" ? dominant : options.axis;
      // a press that is selecting text keeps doing that; text selected before
      // the press, or elsewhere on the page, is no reason to refuse
      const selected = document.getSelection()?.toString() ?? "";
      const selecting = selected.length > 0 && selected !== active.selection;
      // decided on the travel so far, so `offset` carries the direction
      if (
        dominant !== active.axis ||
        selecting ||
        (options.canStart && !options.canStart(report(active, event)))
      ) {
        active.phase = "rejected";
        return;
      }

      active.phase = "dragging";
      active.originX = event.clientX;
      active.originY = event.clientY;
      try {
        element.setPointerCapture(active.pointerId);
      } catch {
        // a pointer that is already gone (or a synthetic one) cannot be captured
      }
      options.onStart?.(report(active, event));
      return;
    }

    if (active.phase === "dragging") options.onMove(report(active, event));
  };

  const onPointerUp = (event: PointerEvent) => {
    const active = session;
    if (!active || event.pointerId !== active.pointerId) return;
    active.tracker.add(event.timeStamp, event.clientX, event.clientY);
    release();
    if (active.phase !== "dragging") return;
    suppressNextClick();
    options.onEnd(report(active, event));
  };

  const onPointerCancel = (event: PointerEvent) => {
    const active = session;
    if (!active || event.pointerId !== active.pointerId) return;
    release();
    if (active.phase === "dragging") (options.onCancel ?? options.onEnd)(report(active, event));
  };

  // A claimed touch must not also scroll. Only the first touchmove of a
  // gesture is cancelable, and pointermove is dispatched before it, so the
  // claim above is already made when this runs.
  const onTouchMove = (event: TouchEvent) => {
    if (session?.phase === "dragging" && event.cancelable) event.preventDefault();
  };

  element.addEventListener("pointerdown", onPointerDown, { signal });
  element.addEventListener("touchmove", onTouchMove, { passive: false, signal });
  signal.addEventListener(
    "abort",
    () => {
      const active = session;
      if (!active) return;
      release();
      if (active.phase !== "dragging") return;
      const last = new PointerEvent("pointercancel", {
        pointerId: active.pointerId,
        clientX: active.originX,
        clientY: active.originY,
      });
      (options.onCancel ?? options.onEnd)(report(active, last));
    },
    { once: true },
  );
}

export {
  createVelocityTracker,
  currentTranslate,
  flickDuration,
  maxTransitionMs,
  pickSnap,
  rubberBand,
  shouldDismiss,
  trackDrag,
};
export type { DragAxis, DragOptions, DragState, VelocityTracker };
