/**
 * @fileoverview Fixtures with a `|` cursor marker: the text without it and the
 * marker's offset.
 */

import { parseHtml, type ParsedHtml } from "../src/html/parse.ts";

export function cursor(marked: string): { parsed: ParsedHtml; offset: number; text: string } {
  const offset = marked.indexOf("|");
  if (offset === -1) throw new Error("cursor: no | in fixture");
  const text = marked.slice(0, offset) + marked.slice(offset + 1);
  return { parsed: parseHtml(text), offset, text };
}

/** The text an absolute range covers. */
export function slice(text: string, [start, end]: [number, number]): string {
  return text.slice(start, end);
}
