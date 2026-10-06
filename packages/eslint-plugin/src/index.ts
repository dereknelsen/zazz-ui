/**
 * @fileoverview `@zazz-ui/eslint-plugin`: the `<ui-debug>` audit as html lint rules.
 * @description Each rule reports one {@link RuleId} from the shared audit core
 * (`@zazz-ui/core/primitives/debug/audit-core.ts`) through the same adapter the
 * language server uses (`@zazz-ui/language-server/html`), so the CLI, the editor,
 * and the browser console say the same thing on the same ranges. `style-format` is the repo's `style` formatter
 * (cascade order, one utility per line): fixed on save and by `vp run fmt:html`.
 * Runs on the html-eslint language (`html/html`).
 */

import type { ESLint, Linter, Rule } from "eslint";
import { RULE_IDS, type Finding, type RuleId } from "@zazz-ui/core/primitives/debug/audit-core.ts";
import { formatStyleValue } from "@zazz-ui/core/base/style-format.ts";
import {
  RULE_DESCRIPTIONS,
  STYLE_FORMAT_DESCRIPTION,
  absolute,
  attributeIndent,
  attributeOf,
  auditTag,
  persistenceFindings,
  rangeOf,
  type Tag,
} from "@zazz-ui/language-server/html";

/** Findings per tag, shared by every rule in one lint pass. */
const findings = new WeakMap<Tag, Finding[]>();

function findingsOf(tag: Tag): Finding[] {
  let found = findings.get(tag);
  if (!found) {
    found = auditTag(tag);
    findings.set(tag, found);
  }
  return found;
}

function locOf(context: Rule.RuleContext, [start, end]: [number, number]) {
  const text = context.sourceCode.text;
  const at = (index: number) => {
    const before = text.slice(0, index);
    const line = before.split("\n").length;
    return { line, column: index - (before.lastIndexOf("\n") + 1) };
  };
  return { start: at(start), end: at(end) };
}

function auditRule(id: RuleId): Rule.RuleModule {
  const fixable = id === "whitespace-before-colon";
  return {
    meta: {
      type: "problem",
      docs: { description: RULE_DESCRIPTIONS[id] },
      ...(fixable ? { fixable: "whitespace" as const } : { hasSuggestions: true }),
      schema: [],
    },
    create(context) {
      return {
        Tag(node: unknown) {
          const tag = node as Tag;
          for (const finding of findingsOf(tag)) {
            if (finding.rule !== id) continue;
            const { suggestion } = finding;
            const style = attributeOf(tag, "style")?.value;
            const fix =
              suggestion && style
                ? (fixer: Rule.RuleFixer) =>
                    fixer.replaceTextRange(
                      absolute(style.range[0], suggestion.span),
                      suggestion.text,
                    )
                : undefined;
            context.report({
              loc: locOf(context, rangeOf(tag, finding)),
              message: finding.message,
              ...(fix && fixable ? { fix } : {}),
              ...(fix && !fixable ? { suggest: [{ desc: suggestion!.description, fix }] } : {}),
            });
          }
        },
      } as Rule.RuleListener;
    },
  };
}

/** `data-ui-persist` checks need the whole page; fragments without `<html>` are skipped. */
const persistRule: Rule.RuleModule = {
  meta: { type: "problem", docs: { description: RULE_DESCRIPTIONS.persist }, schema: [] },
  create(context) {
    let root: Tag | undefined;
    const tags: Tag[] = [];
    return {
      Tag(node: unknown) {
        const tag = node as Tag;
        if (tag.name.toLowerCase() === "html") root ??= tag;
        tags.push(tag);
      },
      "Program:exit"() {
        for (const { message, range } of persistenceFindings(tags, root)) {
          context.report({ loc: locOf(context, range), message });
        }
      },
    } as Rule.RuleListener;
  },
};

/**
 * `style` in cascade order, one utility per line, normalized. A formatter, not
 * a check: the editor hides its reports (`eslint.rules.customizations`) and
 * applies the fix on save, `vp run fmt:html` applies it to every file, and
 * `vp run lint:html` fails on an unformatted style.
 */
const styleFormatRule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: { description: STYLE_FORMAT_DESCRIPTION },
    fixable: "whitespace",
    schema: [],
  },
  create(context) {
    return {
      Tag(node: unknown) {
        const attribute = attributeOf(node as Tag, "style");
        const value = attribute?.value;
        if (!attribute || !value) return;
        const formatted = formatStyleValue(
          value.value,
          attributeIndent(context.sourceCode.text, attribute.key.range[0]),
        );
        if (formatted === value.value) return;
        context.report({
          loc: locOf(context, attribute.range),
          message: "Style utilities are not formatted (cascade order, one per line).",
          fix: (fixer) => fixer.replaceTextRange(value.range, formatted),
        });
      },
    } as Rule.RuleListener;
  },
};

const rules: Record<string, Rule.RuleModule> = {
  ...Object.fromEntries(RULE_IDS.map((id) => [id, id === "persist" ? persistRule : auditRule(id)])),
  "style-format": styleFormatRule,
};

const plugin = {
  meta: { name: "@zazz-ui/eslint-plugin" },
  rules,
  configs: {} as Record<"recommended", Linter.Config>,
} satisfies ESLint.Plugin;

/** Every rule as a warning: the audit flags likely mistakes, and the layout is fixed on save. */
plugin.configs.recommended = {
  plugins: { zazz: plugin },
  rules: Object.fromEntries(Object.keys(rules).map((id) => [`zazz/${id}`, "warn"])),
};

export default plugin;
