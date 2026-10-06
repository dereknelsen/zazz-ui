/**
 * @fileoverview "Sort imports" for HTML: the page's Zazz stylesheet `<link>`s
 * in the kit's cascade order (`BASE_CSS_PRE` → each primitive in
 * `CSS_CASCADE_ORDER` → `BASE_CSS_POST`), the order `index.css` and the CLI
 * keep. Links stay in their slots: the Zazz links are permuted among the
 * positions they already hold, and every other tag stays put.
 */

import {
  BASE_CSS_POST,
  BASE_CSS_PRE,
  CSS_CASCADE_ORDER,
  PRIMITIVES,
} from "@zazz-ui/core/manifest.ts";
import { valueOf, type Tag } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import type { Edit } from "./format.ts";

/** Every kit stylesheet, `src/`-relative, in cascade order. */
export const CASCADE_FILES: readonly string[] = [
  ...BASE_CSS_PRE,
  ...CSS_CASCADE_ORDER.flatMap((name) => PRIMITIVES[name]?.css ?? []),
  ...BASE_CSS_POST,
];

/** A link's place in the cascade, or -1 when it is not a kit stylesheet. */
export function cascadeRank(href: string): number {
  const path = href.replace(/[?#].*$/, "");
  return CASCADE_FILES.findIndex((file) => path === file || path.endsWith(`/${file}`));
}

/** The page's kit stylesheet links, in document order. */
export function zazzLinks(parsed: ParsedHtml): { tag: Tag; rank: number }[] {
  return parsed.tags
    .filter(
      (tag) =>
        tag.name.toLowerCase() === "link" && /\bstylesheet\b/i.test(valueOf(tag, "rel") ?? ""),
    )
    .map((tag) => ({ tag, rank: cascadeRank(valueOf(tag, "href") ?? "") }))
    .filter(({ rank }) => rank !== -1);
}

/** Edits that put the kit stylesheet links in cascade order (none when they already are). */
export function sortImports(parsed: ParsedHtml): Edit[] {
  const links = zazzLinks(parsed);
  const sorted = [...links].sort((a, b) => a.rank - b.rank);
  const edits: Edit[] = [];
  links.forEach((slot, i) => {
    const next = sorted[i]!;
    if (next === slot) return;
    edits.push({ range: slot.tag.range, newText: parsed.text.slice(...next.tag.range) });
  });
  return edits;
}
