/**
 * @fileoverview The `<ui-debug>` audit over html-eslint tags: the adapter to
 * `AuditNode`, the findings per tag, and where each finding sits in the source.
 * Shared by `@zazz-ui/eslint-plugin` (CLI, commit hook) and the language server
 * (editor), so both report the same findings on the same ranges.
 */

import {
  auditNode,
  auditPersistence,
  carriesIdentity,
  type AuditContext,
  type AuditNode,
  type Finding,
  type Span,
} from "@zazz-ui/core/primitives/debug/audit-core.ts";
import lintData from "@zazz-ui/core/editor/zazz.lint-data.json" with { type: "json" };
import { isColor } from "./colors.ts";
import { attributeOf, selfAndAncestors, valueOf, type Tag } from "./nodes.ts";

/** Identities and hooks from the generated lint data, where `<ui-debug>` reads the page's stylesheets. */
export const AUDIT_CONTEXT: AuditContext = { ...lintData, isColor };

export function auditNodeOf(tag: Tag): AuditNode {
  return {
    getAttribute: (name) => valueOf(tag, name),
    getAttributeNames: () => tag.attributes.map((attribute) => attribute.key.value.toLowerCase()),
    withinIdentity: (name, identities) => {
      for (const node of selfAndAncestors(tag)) {
        if (carriesIdentity(node.name, valueOf(node, "data-ui"), name, identities)) return true;
      }
      return false;
    },
  };
}

/** The audit's findings for one tag (`<ui-debug>` itself is skipped). */
export function auditTag(tag: Tag, context: AuditContext = AUDIT_CONTEXT): Finding[] {
  return tag.name.toLowerCase() === "ui-debug" ? [] : auditNode(auditNodeOf(tag), context);
}

export function absolute(base: number, [start, end]: Span): [number, number] {
  return [base + start, base + end];
}

/** Source range a finding underlines: its declaration inside `style`, its attribute, or the tag. */
export function rangeOf(tag: Tag, finding: Finding): [number, number] {
  const style = attributeOf(tag, "style")?.value;
  if (finding.span && style) return absolute(style.range[0], finding.span);
  const attribute = finding.attribute && attributeOf(tag, finding.attribute);
  if (attribute) return attribute.range;
  return tag.range;
}

/** `data-ui-persist` and `data-ui-persist-scroll` findings for a whole page; a fragment (no `<html>`) has none. */
export function persistenceFindings(
  tags: readonly Tag[],
  root: Tag | undefined,
): { tag: Tag; message: string; range: [number, number] }[] {
  if (!root) return [];
  const swap = valueOf(root, "data-ui-navigation") === "swap";
  const marked = (attribute: string) =>
    tags.filter((tag) => attributeOf(tag, attribute)).sort((a, b) => a.range[0] - b.range[0]);
  const persists = (tag: Tag) => valueOf(tag, "data-ui-persist") ?? "";
  const owner = (tag: Tag, self: boolean) => {
    for (const node of selfAndAncestors(tag)) {
      if (node === tag && !self) continue;
      if (attributeOf(node, "data-ui-persist")) return { id: persists(node), self: node === tag };
    }
    return null;
  };
  const findings = (attribute: "data-ui-persist" | "data-ui-persist-scroll") =>
    auditPersistence(
      swap,
      marked(attribute),
      (tag) => valueOf(tag, attribute) ?? "",
      (tag) => owner(tag, attribute === "data-ui-persist-scroll"),
      attribute,
    ).warnings.map(({ el, message }) => ({
      tag: el,
      message,
      range: attributeOf(el, attribute)!.range,
    }));
  return [...findings("data-ui-persist"), ...findings("data-ui-persist-scroll")];
}

/** The indent a style is laid out under: the attribute's line, one step in when the tag starts there. */
export function attributeIndent(text: string, at: number): string {
  const start = text.lastIndexOf("\n", at - 1) + 1;
  const prefix = text.slice(start, at);
  const indent = /^[ \t]*/.exec(prefix)![0];
  return prefix.trim() === "" ? indent : `${indent}  `;
}
