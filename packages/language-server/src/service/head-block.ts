/**
 * @fileoverview Auto-imports for pages that load the kit per primitive: a
 * `<!-- zazz:head {…"primitives":[…]} -->` block (local or CDN granular head).
 * Using an identity whose primitive the head does not load re-renders the block
 * with `buildHead`, the primitive added. Pages that load the whole kit (no
 * primitive list) and base-owned identities (typography roles, prose) need
 * nothing.
 */

import { buildHead, findHeadBlock, headBlockEdit, type HeadOptions } from "@zazz-ui/core/head.ts";
import { resolveClosure } from "@zazz-ui/core/manifest.ts";
import { valueOf } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { IDENTITIES, TAG_PRIMITIVES } from "./data.ts";
import type { Edit } from "./format.ts";

/** The primitive an identity (or `ui-*` tag) needs loaded, or `null` when the base layers style it. */
export function primitiveOf(identityOrTag: string): string | null {
  if (identityOrTag.startsWith("ui-") && TAG_PRIMITIVES[identityOrTag]) {
    return TAG_PRIMITIVES[identityOrTag]!;
  }
  return IDENTITIES[identityOrTag]?.primitive ?? null;
}

/** The primitives a head block loads by name, or `undefined` when it loads the whole kit. */
function listed(options: HeadOptions): string[] | undefined {
  return options.cdn ? options.cdn.primitives : options.primitives;
}

/** The head-block edit that also loads `primitive`, or `undefined` when it is loaded (or the page has no list). */
export function importEdit(
  text: string,
  primitive: string,
): (Edit & { title: string }) | undefined {
  const block = findHeadBlock(text);
  const current = block && listed(block.options);
  if (!block || !current || resolveClosure(current).includes(primitive)) return undefined;
  const primitives = [...new Set([...current, primitive])].sort();
  const options: HeadOptions = block.options.cdn
    ? { ...block.options, cdn: { ...block.options.cdn, primitives } }
    : { ...block.options, primitives };
  const edit = headBlockEdit(text, buildHead(options), options);
  return (
    edit && {
      title: `Add ${primitive} to the page head`,
      range: [edit.start, edit.end],
      newText: edit.text,
    }
  );
}

export interface MissingImport {
  range: [number, number];
  primitive: string;
  fix: Edit & { title: string };
}

/** Identities and tag forms whose primitive the page's head block does not load. */
export function missingImports(parsed: ParsedHtml): MissingImport[] {
  const block = findHeadBlock(parsed.text);
  if (!block || !listed(block.options)) return [];
  const found: MissingImport[] = [];
  const fixes = new Map<string, (Edit & { title: string }) | undefined>();
  const check = (name: string, range: [number, number]) => {
    const primitive = primitiveOf(name);
    if (!primitive) return;
    if (!fixes.has(primitive)) fixes.set(primitive, importEdit(parsed.text, primitive));
    const fix = fixes.get(primitive);
    if (fix) found.push({ range, primitive, fix });
  };
  for (const tag of parsed.tags) {
    const name = tag.name.toLowerCase();
    if (name.startsWith("ui-")) check(name, [tag.range[0] + 1, tag.range[0] + 1 + name.length]);
    const attribute = tag.attributes.find((a) => a.key.value.toLowerCase() === "data-ui");
    if (!attribute?.value || !valueOf(tag, "data-ui")) continue;
    for (const m of attribute.value.value.matchAll(/\S+/g)) {
      const start = attribute.value.range[0] + m.index!;
      check(m[0], [start, start + m[0].length]);
    }
  }
  return found;
}
