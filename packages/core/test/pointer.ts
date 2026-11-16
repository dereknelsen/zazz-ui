"use strict";

/**
 * @fileoverview Synthetic pointer drags for the gesture browser tests. The
 * events are dispatched in the page, so they run in every engine; real time
 * passes between them, which is what the velocity estimate reads.
 */

/** One drag to perform. */
export interface DragSpec {
  /** Viewport point the press lands on (default: the target's center). */
  from?: { x: number; y: number };
  /** Total travel in px. */
  dx?: number;
  dy?: number;
  /** Moves the travel is split into (default 4). */
  steps?: number;
  /** Ms between moves (default 8: a flick). */
  interval?: number;
  /** Ms the pointer rests before lifting (default 0; 150 makes the release velocity zero). */
  hold?: number;
  /** `mouse` (default) or `touch`. */
  pointerType?: "mouse" | "touch";
  /** Leave the pointer down (the caller ends the drag with `pointerUp`). */
  keepDown?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fire(target: EventTarget, type: string, x: number, y: number, pointerType: string): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      pointerType,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

/** Presses on `target`, moves, and (unless `keepDown`) lifts. Returns where the pointer ended. */
export async function drag(target: Element, spec: DragSpec): Promise<{ x: number; y: number }> {
  const box = target.getBoundingClientRect();
  const from = spec.from ?? { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const { dx = 0, dy = 0, steps = 4, interval = 8, hold = 0, pointerType = "mouse" } = spec;

  fire(target, "pointerdown", from.x, from.y, pointerType);
  let x = from.x;
  let y = from.y;
  for (let step = 1; step <= steps; step++) {
    await sleep(interval);
    x = from.x + (dx * step) / steps;
    y = from.y + (dy * step) / steps;
    fire(document, "pointermove", x, y, pointerType);
  }
  if (hold) await sleep(hold);
  if (!spec.keepDown) fire(document, "pointerup", x, y, pointerType);
  return { x, y };
}

/** Lifts a pointer left down by `drag({ keepDown: true })`. */
export function pointerUp(at: { x: number; y: number }, pointerType = "mouse"): void {
  fire(document, "pointerup", at.x, at.y, pointerType);
}
