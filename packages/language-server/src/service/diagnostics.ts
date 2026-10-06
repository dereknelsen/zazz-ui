/**
 * @fileoverview The audit as diagnostics: every tag's findings plus the page's
 * `data-ui-persist` checks, on the same ranges the lint rules report.
 */

import type { Finding, RuleId } from "@zazz-ui/core/primitives/debug/audit-core.ts";
import { absolute, attributeOf, auditTag, persistenceFindings, rangeOf } from "../html/index.ts";
import type { ParsedHtml } from "../html/parse.ts";
import type { Edit } from "./format.ts";
import { missingImports } from "./head-block.ts";

export interface ZazzDiagnostic {
  range: [number, number];
  message: string;
  /** An audit rule, or `missing-import` (a primitive the page's head block does not load). */
  rule: RuleId | "missing-import";
  /** `info` for a page fix that is not a markup mistake. */
  severity?: "info";
  /** The audit's suggested rewrite, offered as a quick fix. */
  fix?: Edit & { title: string };
}

/** A fix the audit does not suggest itself: give a tier without a base its base (same value). */
function addBase(
  finding: Finding,
  text: string,
  range: [number, number],
): ZazzDiagnostic["fix"] | undefined {
  if (finding.rule !== "tier-without-base") return undefined;
  const base = /has no base `(--[\w-]+)`/.exec(finding.message)?.[1];
  const value = text
    .slice(...range)
    .split(":")
    .slice(1)
    .join(":")
    .trim();
  if (!base || !value) return undefined;
  return {
    title: `Add the base \`${base}: ${value}\``,
    range: [range[0], range[0]],
    newText: `${base}: ${value}; `,
  };
}

export function diagnose(parsed: ParsedHtml): ZazzDiagnostic[] {
  const found: ZazzDiagnostic[] = [];
  for (const tag of parsed.tags) {
    for (const finding of auditTag(tag)) {
      const style = attributeOf(tag, "style")?.value;
      const { suggestion } = finding;
      const range = rangeOf(tag, finding);
      const fix =
        suggestion && style
          ? {
              title: suggestion.description,
              range: absolute(style.range[0], suggestion.span),
              newText: suggestion.text,
            }
          : addBase(finding, parsed.text, range);
      found.push({
        range,
        message: finding.message,
        rule: finding.rule,
        ...(fix ? { fix } : {}),
      });
    }
  }
  for (const { message, range } of persistenceFindings(parsed.tags, parsed.root)) {
    found.push({ range, message, rule: "persist" });
  }
  for (const { range, primitive, fix } of missingImports(parsed)) {
    found.push({
      range,
      message: `This page's head does not load ${primitive}; its styles and behavior are missing.`,
      rule: "missing-import",
      severity: "info",
      fix,
    });
  }
  return found;
}
