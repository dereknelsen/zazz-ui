/**
 * @fileoverview Style formatting as text edits: every `style` the way
 * `formatStyleValue` writes it (cascade order, one utility per line, `name:
 * value`), the same output as the `zazz/style-format` lint fix.
 */

import { formatStyleValue } from "@zazz-ui/core/base/style-format.ts";
import { attributeIndent, attributeOf, type Tag } from "../html/index.ts";
import type { ParsedHtml } from "../html/parse.ts";

export interface Edit {
  range: [number, number];
  newText: string;
}

/** The edit that formats one tag's `style`, if it needs one. */
export function styleEdit(text: string, tag: Tag): Edit | undefined {
  const attribute = attributeOf(tag, "style");
  const value = attribute?.value;
  if (!attribute || !value) return undefined;
  const formatted = formatStyleValue(value.value, attributeIndent(text, attribute.key.range[0]));
  return formatted === value.value ? undefined : { range: value.range, newText: formatted };
}

/** Edits that format every `style` in the document. */
export function styleEdits(parsed: ParsedHtml): Edit[] {
  return parsed.tags.flatMap((tag) => styleEdit(parsed.text, tag) ?? []);
}
