/**
 * @fileoverview Parses HTML with `@html-eslint/parser`, the parser the lint
 * rules run on, so the editor and `vp run lint:html` agree on every range.
 * Outside ESLint nothing sets `parent`, so this links it.
 */

import { parseForESLint } from "@html-eslint/parser";
import { maskTemplateHoles, type Span } from "./holes.ts";
import { isTag, type Comment, type Node, type Tag } from "./nodes.ts";

export interface ParsedHtml {
  /** The parsed text: the source, with a templating language's holes masked to spaces. */
  text: string;
  /** Every element in document order. */
  tags: Tag[];
  comments: Comment[];
  /** The `<html>` element, when the file is a whole page rather than a fragment. */
  root?: Tag;
  /** Spans of template holes masked out before parsing (empty for plain HTML). */
  holes: Span[];
}

/**
 * Parses `source` as HTML. For a templating language (`languageId` such as
 * `astro` or `razor`) its expressions are masked first, so offsets still
 * point into the source and the audit never reads template code as CSS.
 */
export function parseHtml(source: string, languageId = "html"): ParsedHtml {
  const { text, holes } = maskTemplateHoles(source, languageId);
  const { ast } = parseForESLint(text, {}) as unknown as { ast: { body: Node[] } };
  const parsed: ParsedHtml = { text, tags: [], comments: [], holes };
  const visit = (node: Node, parent: Node | undefined) => {
    if (parent) node.parent = parent;
    if (isTag(node)) {
      // A masked attribute name (Razor's `@onclick="Save"`, Astro's `{name}="y"`) or a stray
      // `="x"` parses as a value with no key. It has no name to audit, so it is dropped here
      // and every reader can rely on `attribute.key`.
      node.attributes = node.attributes.filter((attribute) => attribute.key);
      parsed.tags.push(node);
      if (node.name.toLowerCase() === "html") parsed.root ??= node;
    } else if (node.type === "Comment") {
      parsed.comments.push(node as Comment);
    }
    for (const child of node.children ?? []) visit(child, node);
  };
  for (const node of ast.body) visit(node, undefined);
  return parsed;
}

/** The innermost tag whose source range holds `offset`. */
export function tagAt(parsed: ParsedHtml, offset: number): Tag | undefined {
  let found: Tag | undefined;
  for (const tag of parsed.tags) {
    if (tag.range[0] <= offset && offset <= tag.range[1]) found = tag;
  }
  return found;
}
