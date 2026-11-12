/**
 * The theme builder's corner-shape slider. Inside -2 to 3 it writes
 * `superellipse(n)`; one step past either end it writes the limit:
 * `superellipse(infinity)` (a square corner) or `superellipse(-infinity)`
 * (a notch).
 */

/** The slider's range and step, ends included. Part of the share code's format (lib/preset.ts). */
export const CORNER_SHAPE = { min: -2.1, max: 3.1, step: 0.1 } as const;

/** The finite superellipse range; anything past it is infinite. */
const FINITE = { min: -2, max: 3 } as const;

/** The `--radius-corner-shape` value for a slider value. */
export function cornerShape(n: number): string {
  if (n > FINITE.max) return "superellipse(infinity)";
  if (n < FINITE.min) return "superellipse(-infinity)";
  return `superellipse(${n})`;
}

/** The slider's readout: the number, or ∞ and −∞ at the ends. */
export function cornerShapeLabel(n: number): string {
  if (n > FINITE.max) return "∞";
  if (n < FINITE.min) return "−∞";
  return String(n);
}
