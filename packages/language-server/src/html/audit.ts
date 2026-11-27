/**
 * @fileoverview The `<ui-debug>` audit over html-eslint tags: the adapter to
 * `AuditNode`, the findings per tag, and where each finding sits in the source.
 * Shared by `@zazz-ui/eslint-plugin` (CLI, commit hook) and the language server
 * (editor), so both report the same findings on the same ranges.
 */

import {
  auditNode,
  auditPersistence,
  type PersistMode,
  carriesIdentity,
  expandStyling,
  type AuditContext,
  type AuditNode,
  type Finding,
  type Span,
} from "@zazz-ui/core/primitives/debug/audit-core.ts";
import lintData from "@zazz-ui/core/editor/zazz.lint-data.json" with { type: "json" };
import { isColor } from "./colors.ts";
import { matches } from "./matches.ts";
import { attributeOf, namedAttributes, selfAndAncestors, valueOf, type Tag } from "./nodes.ts";

/** Identities and hooks from the generated lint data, where `<ui-debug>` reads the page's stylesheets. */
export const AUDIT_CONTEXT: AuditContext = {
  identities: lintData.identities,
  roles: lintData.roles,
  hooks: lintData.hooks,
  reads: expandStyling(lintData.selectors, lintData.reads),
  blocks: expandStyling(lintData.selectors, lintData.blocks),
  isColor,
};

export function auditNodeOf(tag: Tag): AuditNode {
  return {
    tagName: tag.name,
    getAttribute: (name) => valueOf(tag, name),
    getAttributeNames: () =>
      namedAttributes(tag).map((attribute) => attribute.key.value.toLowerCase()),
    withinIdentity: (name, identities) => {
      for (const node of selfAndAncestors(tag)) {
        if (carriesIdentity(node.name, valueOf(node, "data-ui"), name, identities)) return true;
      }
      return false;
    },
    matches: (selector) => matches(tag, selector),
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

/**
 * The edit that applies a finding's `attributes`: its attribute is replaced by
 * the new values, in the author's quotes, or removed with the space before it.
 */
export function attributeEdit(
  tag: Tag,
  finding: Finding,
  text: string,
): { range: [number, number]; newText: string } | undefined {
  const anchor = finding.attribute && attributeOf(tag, finding.attribute);
  if (!finding.attributes || !anchor) return undefined;
  const quote = anchor.value && text[anchor.value.range[0] - 1] === "'" ? "'" : '"';
  const written = Object.entries(finding.attributes)
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([name, value]) => `${name}=${quote}${value}${quote}`);
  if (written.length) return { range: anchor.range, newText: written.join(" ") };
  const start = anchor.range[0] - (/\s/.test(text[anchor.range[0] - 1] ?? "") ? 1 : 0);
  return { range: [start, anchor.range[1]], newText: "" };
}

/** `data-navigation-persist` findings for a whole page, in both modes; a fragment (no `<html>`) has none. */
export function persistenceFindings(
  tags: readonly Tag[],
  root: Tag | undefined,
): { tag: Tag; message: string; range: [number, number] }[] {
  if (!root) return [];
  const swap = valueOf(root, "data-navigation") === "swap";
  const scrolls = (tag: Tag) => valueOf(tag, "data-navigation-persist-mode") === "scroll";
  const carried = (tag: Tag) =>
    Boolean(attributeOf(tag, "data-navigation-persist")) && !scrolls(tag);
  const persists = (tag: Tag) => valueOf(tag, "data-navigation-persist") ?? "";
  const owner = (tag: Tag) => {
    for (const node of selfAndAncestors(tag)) {
      if (node !== tag && carried(node)) return persists(node);
    }
    return null;
  };
  const findings = (mode: PersistMode) =>
    auditPersistence(
      swap,
      tags.filter(mode === "scroll" ? scrolls : carried).sort((a, b) => a.range[0] - b.range[0]),
      persists,
      owner,
      mode,
    ).warnings.map(({ el, message }) => ({
      tag: el,
      message,
      range: (
        attributeOf(el, "data-navigation-persist") ??
        attributeOf(el, "data-navigation-persist-mode")!
      ).range,
    }));
  return [...findings("element"), ...findings("scroll")];
}

/** The indent a style is laid out under: the attribute's line, one step in when the tag starts there. */
export function attributeIndent(text: string, at: number): string {
  const start = text.lastIndexOf("\n", at - 1) + 1;
  const prefix = text.slice(start, at);
  const indent = /^[ \t]*/.exec(prefix)![0];
  return prefix.trim() === "" ? indent : `${indent}  `;
}
