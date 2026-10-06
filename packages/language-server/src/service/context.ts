/**
 * @fileoverview What the cursor is on: a declaration inside `style`, another
 * attribute's value, an attribute name, or a tag name. Offsets are absolute
 * (into the document) unless named `rel` (into a style value).
 */

import { scanDeclarations, type ScannedDeclaration } from "@zazz-ui/core/base/style-format.ts";
import { parseHtml, type ParsedHtml } from "../html/parse.ts";
import type { Attribute, Tag } from "../html/nodes.ts";

export interface StyleContext {
  /** The parse the context was read from (a repaired one while a tag is being typed). */
  parsed: ParsedHtml;
  kind: "style";
  tag: Tag;
  attribute: Attribute;
  /** Absolute offset of the style value's first character. */
  base: number;
  value: string;
  declarations: ScannedDeclaration[];
  /** The declaration the cursor is in; absent between declarations. */
  declaration?: ScannedDeclaration;
  /** Which side of the colon the cursor is on (`name` when there is no colon yet). */
  part: "name" | "value";
  /** Cursor offset into the style value. */
  rel: number;
}

export interface AttributeValueContext {
  /** The parse the context was read from (a repaired one while a tag is being typed). */
  parsed: ParsedHtml;
  kind: "attribute-value";
  tag: Tag;
  attribute: Attribute;
  name: string;
  /** Absolute offset of the value's first character. */
  base: number;
  value: string;
  rel: number;
}

export interface AttributeNameContext {
  /** The parse the context was read from (a repaired one while a tag is being typed). */
  parsed: ParsedHtml;
  kind: "attribute-name";
  tag: Tag;
  attribute?: Attribute;
  /** The attribute name typed so far, up to the cursor. */
  prefix: string;
  /** Absolute range of the name being typed (empty at a fresh position). */
  range: [number, number];
}

export interface TagNameContext {
  /** The parse the context was read from (a repaired one while a tag is being typed). */
  parsed: ParsedHtml;
  kind: "tag-name";
  /** Absent while the tag is still being typed (`<ui-ca`), which the parser cannot see yet. */
  tag?: Tag;
  prefix: string;
  range: [number, number];
}

export type CursorContext =
  | StyleContext
  | AttributeValueContext
  | AttributeNameContext
  | TagNameContext;

/** The innermost tag whose opening tag holds `offset` (between `<` and its `>`). */
export function openTagAt(parsed: ParsedHtml, offset: number): Tag | undefined {
  let found: Tag | undefined;
  for (const tag of parsed.tags) {
    if (tag.range[0] > offset) break;
    const end = openTagEnd(parsed.text, tag);
    if (offset > tag.range[0] && offset <= end) found = tag;
  }
  return found;
}

/** Offset just past the `>` that closes `tag`'s opening tag (or the tag's end when unclosed). */
function openTagEnd(text: string, tag: Tag): number {
  const last = tag.attributes.at(-1);
  let i = last ? last.range[1] : tag.range[0] + 1 + tag.name.length;
  while (i < tag.range[1] && text[i] !== ">") i++;
  return Math.min(i, tag.range[1]);
}

/**
 * The declaration holding `rel`: from its first character up to the next `;`,
 * so the cursor right after `--p` or after `--bg: ` (trailing space) is in it.
 */
function declarationAt(
  value: string,
  declarations: ScannedDeclaration[],
  rel: number,
): ScannedDeclaration | undefined {
  const candidate = declarations.findLast((d) => d.span[0] <= rel);
  if (!candidate) return undefined;
  return value.slice(candidate.span[1], rel).includes(";") ? undefined : candidate;
}

/**
 * When `offset` sits in an opening tag that is still being typed (no `>` yet,
 * maybe inside an open quote), the closer that would finish it: the quote, then `>`.
 */
function unclosedTagCloser(text: string, offset: number): string | undefined {
  const start = text.lastIndexOf("<", offset - 1);
  if (start === -1 || !/[a-z]/i.test(text[start + 1] ?? "")) return undefined;
  let quote: string | null = null;
  for (let i = start + 1; i < offset; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return undefined;
  }
  return `${quote ?? ""}>`;
}

export function contextAt(
  parsed: ParsedHtml,
  offset: number,
  repaired = false,
): CursorContext | undefined {
  const tag = openTagAt(parsed, offset);
  // the parser cannot see a tag still being typed; read the context from the
  // text up to the cursor with that tag closed (offsets before it are unchanged)
  const closer = !tag && !repaired ? unclosedTagCloser(parsed.text, offset) : undefined;
  if (closer) {
    const context = contextAt(parseHtml(parsed.text.slice(0, offset) + closer), offset, true);
    if (context) return context;
  }
  if (!tag) {
    // a tag name still being typed: `<ui-ca|`
    const typing = /<([a-z][\w-]*)$/i.exec(parsed.text.slice(Math.max(0, offset - 64), offset));
    if (!typing) return undefined;
    const rest = /^[\w-]*/.exec(parsed.text.slice(offset))![0];
    const prefix = typing[1]!;
    return {
      kind: "tag-name",
      parsed,
      prefix,
      range: [offset - prefix.length, offset + rest.length],
    };
  }
  const nameStart = tag.range[0] + 1;
  if (offset <= nameStart + tag.name.length) {
    return {
      kind: "tag-name",
      parsed,
      tag,
      prefix: parsed.text.slice(nameStart, offset),
      range: [nameStart, nameStart + tag.name.length],
    };
  }
  for (const attribute of tag.attributes) {
    const { key, value } = attribute;
    if (key.range[0] <= offset && offset <= key.range[1]) {
      return {
        kind: "attribute-name",
        parsed,
        tag,
        attribute,
        prefix: parsed.text.slice(key.range[0], offset),
        range: key.range,
      };
    }
    if (value && value.range[0] <= offset && offset <= value.range[1]) {
      const rel = offset - value.range[0];
      const name = key.value.toLowerCase();
      if (name === "style") {
        const declarations = scanDeclarations(value.value);
        const declaration = declarationAt(value.value, declarations, rel);
        const part =
          declaration && declaration.colon !== -1 && rel > declaration.colon ? "value" : "name";
        return {
          kind: "style",
          parsed,
          tag,
          attribute,
          base: value.range[0],
          value: value.value,
          declarations,
          ...(declaration ? { declaration } : {}),
          part,
          rel,
        };
      }
      return {
        kind: "attribute-value",
        parsed,
        tag,
        attribute,
        name,
        base: value.range[0],
        value: value.value,
        rel,
      };
    }
  }
  // inside the opening tag but on no attribute: a fresh attribute name
  const word = /[\w:-]*$/.exec(parsed.text.slice(Math.max(tag.range[0], offset - 64), offset))![0];
  return {
    kind: "attribute-name",
    parsed,
    tag,
    prefix: word,
    range: [offset - word.length, offset],
  };
}

/** The whitespace-separated token of `value` around `rel`, with its range in `value`. */
export function tokenAround(
  value: string,
  rel: number,
): { token: string; range: [number, number] } {
  let start = rel;
  let end = rel;
  while (start > 0 && !/\s/.test(value[start - 1]!)) start--;
  while (end < value.length && !/\s/.test(value[end]!)) end++;
  return { token: value.slice(start, end), range: [start, end] };
}
