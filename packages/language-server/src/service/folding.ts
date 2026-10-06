/**
 * @fileoverview Folding for Zazz markup: a multi-line `style` (one utility per
 * line makes them tall), a `<!-- zazz:head -->` block, and a run of kit
 * stylesheet links. Lines are 0-based; VS Code merges these with the HTML
 * extension's element folding.
 */

import { attributeOf } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { zazzLinks } from "./imports.ts";

export interface ZazzFoldingRange {
  startLine: number;
  endLine: number;
  kind?: "imports" | "region";
}

export function foldingRanges(parsed: ParsedHtml): ZazzFoldingRange[] {
  const lineStarts = [0];
  for (let i = 0; i < parsed.text.length; i++) if (parsed.text[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (offset: number) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (lineStarts[mid]! <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const ranges: ZazzFoldingRange[] = [];
  /** Folds through the line of `end`; `closing` leaves that line (a closing quote or marker) visible. */
  const fold = (start: number, end: number, closing: boolean, kind?: ZazzFoldingRange["kind"]) => {
    const startLine = lineOf(start);
    const endLine = lineOf(end) - (closing ? 1 : 0);
    if (endLine > startLine) ranges.push({ startLine, endLine, ...(kind ? { kind } : {}) });
  };
  for (const tag of parsed.tags) {
    const style = attributeOf(tag, "style");
    if (style?.value) fold(style.key.range[0], style.value.range[1], true);
  }
  const open = parsed.comments.find((c) =>
    /^<!--\s*zazz:head\b/.test(parsed.text.slice(...c.range)),
  );
  const close = parsed.comments.find((c) =>
    /^<!--\s*\/zazz:head\s*-->$/.test(parsed.text.slice(...c.range)),
  );
  if (open && close && close.range[0] > open.range[0]) {
    fold(open.range[0], close.range[0], true, "imports");
  }
  const links = zazzLinks(parsed);
  if (links.length >= 3) fold(links[0]!.tag.range[0], links.at(-1)!.tag.range[0], false, "imports");
  return ranges;
}
