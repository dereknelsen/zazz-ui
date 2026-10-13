"use strict";

/**
 * @fileoverview Splits a `style` attribute value into declarations.
 * @description One parser for every reader of the attribute text: the
 * formatter (`style-format.ts`), the language server, and the CSP fallback
 * (`csp.ts`). Splits on top-level `;` only, so a `;` inside `url("…")`,
 * `var(--x, …)`, or a quoted string stays in its value. No imports, so a
 * runtime module can use it without pulling in the utility tables.
 */

// --- Declarations ---

/** `[start, end)` offsets into a style value. */
export type Range = [number, number];

/** One declaration of a style value, with its parts' offsets (all trimmed). */
export interface ScannedDeclaration {
  /** The whole declaration. */
  span: Range;
  /** The name; a declaration still being typed (`--p`) is all name. */
  name: string;
  nameSpan: Range;
  /** Offset of the colon, or -1 when there is none yet. */
  colon: number;
  /** The value as written, `!important` included. */
  value: string;
  /** Empty (`[colon + 1, colon + 1]`) when nothing follows the colon. */
  valueSpan: Range;
  /** `"important"` when the value ends in `!important`, else `""` (what `setProperty` takes). */
  priority: "" | "important";
}

/** Trims `[start, end)` of `text` to its non-whitespace extent. */
function trimRange(text: string, start: number, end: number): Range {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  return [start, end];
}

const IMPORTANT = /!\s*important$/i;

/**
 * Scans a style value into declarations, splitting on top-level `;` (not inside
 * parentheses or quotes). Empty segments are skipped.
 */
export function scanDeclarations(value: string): ScannedDeclaration[] {
  const found: ScannedDeclaration[] = [];
  const push = (from: number, to: number) => {
    const span = trimRange(value, from, to);
    if (span[0] === span[1]) return;
    const colon = value.indexOf(":", span[0]);
    const hasColon = colon !== -1 && colon < span[1];
    const nameSpan = hasColon ? trimRange(value, span[0], colon) : span;
    const valueSpan = hasColon
      ? trimRange(value, colon + 1, span[1])
      : ([span[1], span[1]] as Range);
    const text = value.slice(...valueSpan);
    found.push({
      span,
      name: value.slice(...nameSpan),
      nameSpan,
      colon: hasColon ? colon : -1,
      value: text,
      valueSpan,
      priority: IMPORTANT.test(text) ? "important" : "",
    });
  };
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      push(start, i);
      start = i + 1;
    }
  }
  push(start, value.length);
  return found;
}

/** Splits a style value on top-level `;`, ignoring ones inside parentheses or quotes. */
export function splitDeclarations(value: string): string[] {
  return scanDeclarations(value).map(({ span }) => value.slice(...span));
}

/** A declaration's value without its `!important`, for `setProperty(name, value, priority)`. */
export function plainValue({ value }: ScannedDeclaration): string {
  return value.replace(IMPORTANT, "").trimEnd();
}
