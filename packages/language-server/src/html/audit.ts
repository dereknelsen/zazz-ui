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

/** `data-ui-persist` findings for a whole page; a fragment (no `<html>`) has none. */
export function persistenceFindings(
  tags: readonly Tag[],
  root: Tag | undefined,
): { tag: Tag; message: string; range: [number, number] }[] {
  if (!root) return [];
  const persisted = tags
    .filter((tag) => attributeOf(tag, "data-ui-persist"))
    .sort((a, b) => a.range[0] - b.range[0]);
  const { warnings } = auditPersistence(
    valueOf(root, "data-ui-navigation") === "swap",
    persisted,
    (tag) => valueOf(tag, "data-ui-persist") ?? "",
    (tag) => {
      for (const node of selfAndAncestors(tag)) {
        if (node !== tag && attributeOf(node, "data-ui-persist")) return node;
      }
      return null;
    },
  );
  return warnings.map(({ el, message }) => ({
    tag: el,
    message,
    range: attributeOf(el, "data-ui-persist")!.range,
  }));
}

/** The indent a style is laid out under: the attribute's line, one step in when the tag starts there. */
export function attributeIndent(text: string, at: number): string {
  const start = text.lastIndexOf("\n", at - 1) + 1;
  const prefix = text.slice(start, at);
  const indent = /^[ \t]*/.exec(prefix)![0];
  return prefix.trim() === "" ? indent : `${indent}  `;
}
