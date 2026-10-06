"use strict";

/**
 * @fileoverview How a `style=""` of utilities is written: normalized, in
 * cascade order, one declaration per line.
 * @description The `zazz/style-format` lint rule (`@zazz-ui/eslint-plugin`)
 * writes `style` with it: fixed on save, by the commit hook, and by
 * `vp run fmt:html`. Development tooling only; no runtime entry imports it.
 *
 * Order: utilities follow the `UTILITIES` table (family, then emission order,
 * shorthands first), each led by its `--*--starting` tier (the value it
 * transitions from reads before the value it lands on; CSS order does not
 * matter, the generated setter sits in `@starting-style`) and followed by its
 * tiers (breakpoints small to large, then states in `STATES` order) and its
 * `--group-*` forms; then the
 * `--before-*` forms, then `--after-*`; then other custom properties (`--ui-*`
 * hooks) and raw CSS, each kept in source order. Custom properties do not
 * depend on declaration order, and the sort is stable, so a repeated name
 * keeps its winner and raw shorthands keep their place before longhands.
 */

import {
  BREAKPOINTS,
  PSEUDO_ONLY,
  PSEUDO_SIDES,
  STATES,
  UTILITIES,
  parseUtilityName,
} from "./utilities.ts";

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
  value: string;
  /** Empty (`[colon + 1, colon + 1]`) when nothing follows the colon. */
  valueSpan: Range;
}

/** Trims `[start, end)` of `text` to its non-whitespace extent. */
function trimRange(text: string, start: number, end: number): Range {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  return [start, end];
}

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
    found.push({
      span,
      name: value.slice(...nameSpan),
      nameSpan,
      colon: hasColon ? colon : -1,
      value: value.slice(...valueSpan),
      valueSpan,
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

/** Collapses whitespace runs to one space, outside quotes. */
function collapse(text: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) out += text[++i];
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (/\s/.test(ch)) {
      if (!out.endsWith(" ")) out += " ";
    } else out += ch;
  }
  return out.trim();
}

/** `--px :6` → `--px: 6`. A declaration without a colon is kept as written. */
export function normalize(declaration: string): string {
  const colon = declaration.indexOf(":");
  if (colon === -1) return collapse(declaration);
  return `${declaration.slice(0, colon).trim()}: ${collapse(declaration.slice(colon + 1))}`;
}

// --- Order ---

const UTILITY_RANK = new Map([...UTILITIES, ...PSEUDO_ONLY].map((utility, i) => [utility.name, i]));
// the starting tier leads its utility, ahead of the base (rank 0)
const TIER_RANK = new Map<string, number>(
  [...BREAKPOINTS, ...STATES].map((tier, i) => [tier, tier === "starting" ? -1 : i + 1]),
);

/** Sort key: utilities by side, table order, own-before-group, tier; everything else after. */
function rank(declaration: string): number[] {
  const colon = declaration.indexOf(":");
  const name = colon === -1 ? "" : declaration.slice(0, colon).trim();
  if (!name.startsWith("--")) return [2];
  const parsed = parseUtilityName(name);
  const utility = UTILITY_RANK.get(parsed.name);
  if (utility === undefined || name.startsWith("--ui-")) return [1];
  const side = parsed.side ? PSEUDO_SIDES.indexOf(parsed.side as "before") + 1 : 0;
  return [0, side, utility, parsed.group ? 1 : 0, parsed.tier ? TIER_RANK.get(parsed.tier)! : 0];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const delta = (a[i] ?? -1) - (b[i] ?? -1);
    if (delta) return delta;
  }
  return 0;
}

/** Declarations in cascade order (a stable sort). */
export function orderDeclarations(declarations: string[]): string[] {
  const ranks = new Map(declarations.map((d) => [d, rank(d)]));
  return [...declarations].sort((a, b) => compare(ranks.get(a)!, ranks.get(b)!));
}

// --- Layout ---

/**
 * The formatted `style` value: normalized declarations in cascade order, one
 * per line under `attrIndent` (the attribute's own indent) when there are two
 * or more, a bare declaration when there is one.
 */
export function formatStyleValue(value: string, attrIndent: string): string {
  const declarations = orderDeclarations(splitDeclarations(value).map(normalize));
  if (declarations.length === 0) return value;
  if (declarations.length === 1) return declarations[0]!;
  const inner = `${attrIndent}  `;
  return `\n${declarations.map((d) => `${inner}${d};`).join("\n")}\n${attrIndent}`;
}
