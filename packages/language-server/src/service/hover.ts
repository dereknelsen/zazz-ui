/**
 * @fileoverview Hover text for Zazz markup: utilities and their tiers, hooks,
 * and design tokens inside `style`; identities in `data-ui`; `ui-*` tag forms;
 * and `data-<id>-*` presets.
 */

import { parseUtilityName } from "@zazz-ui/core/base/utilities.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { contextAt, tokenAround, type StyleContext } from "./context.ts";
import {
  ATTRIBUTES,
  HEADERS,
  HOOKS,
  IDENTITIES,
  TAG_PRIMITIVES,
  TOKENS,
  tokenSummary,
} from "./data.ts";
import { UTILITY_BY_NAME, describeUtilityName } from "./describe.ts";

export interface ZazzHover {
  markdown: string;
  range: [number, number];
}

export function hover(parsed: ParsedHtml, offset: number): ZazzHover | undefined {
  const context = contextAt(parsed, offset);
  switch (context?.kind) {
    case "style":
      return context.part === "name" ? styleName(context) : styleValue(context);
    case "attribute-value": {
      if (context.name !== "data-ui") return undefined;
      const { token, range } = tokenAround(context.value, context.rel);
      const markdown = identity(token);
      return markdown
        ? { markdown, range: [context.base + range[0], context.base + range[1]] }
        : undefined;
    }
    case "attribute-name": {
      const name = context.attribute?.key.value.toLowerCase();
      const attribute = name ? ATTRIBUTES.get(name) : undefined;
      if (!name || !attribute || name === "data-ui") {
        return name === "data-ui" && attribute?.description
          ? { markdown: `**\`data-ui\`**: ${attribute.description}`, range: context.range }
          : undefined;
      }
      const values = attribute.values.map((value) => `\`${value.name}\``).join(" · ");
      return {
        markdown: [
          `**\`${name}\`**`,
          attribute.description ?? "",
          values ? `Values: ${values}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        range: context.range,
      };
    }
    case "tag-name": {
      const name = context.tag?.name.toLowerCase();
      const primitive = name ? TAG_PRIMITIVES[name] : undefined;
      if (!name || !primitive) return undefined;
      return {
        markdown: identity(name.slice(3)) ?? `**\`<${name}>\`**: the ${primitive} primitive.`,
        range: context.range,
      };
    }
    default:
      return undefined;
  }
}

function styleName(context: StyleContext): ZazzHover | undefined {
  const { declaration, base } = context;
  if (!declaration) return undefined;
  const range: [number, number] = [base + declaration.nameSpan[0], base + declaration.nameSpan[1]];
  const hook = HOOKS[declaration.name];
  if (hook) {
    return {
      markdown: `**\`${declaration.name}\`** · primitive hook\n\nDefault: \`${hook.value}\`\n\nDeclared in \`${hook.file}\`.`,
      range,
    };
  }
  const markdown = describeUtilityName(declaration.name);
  return markdown ? { markdown, range } : undefined;
}

/** A `var(--token)` under the cursor, or a keyword shorthand (`--shadow: md`). */
function styleValue(context: StyleContext): ZazzHover | undefined {
  const { declaration, base, rel } = context;
  if (!declaration) return undefined;
  for (const m of declaration.value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    const start = declaration.valueSpan[0] + m.index! + m[0].indexOf("--");
    const end = start + m[1]!.length;
    if (rel < start || rel > end) continue;
    const token = TOKENS[m[1]!];
    if (!token) return undefined;
    return {
      markdown: `**\`${m[1]}\`**: \`${tokenSummary(token)}\`\n\n\`${m[1]}: ${token.value}\`\n\nDeclared in \`${token.file}\`.`,
      range: [base + start, base + end],
    };
  }
  const utility = UTILITY_BY_NAME.get(parseUtilityName(declaration.name).name);
  const alias = utility?.aliases?.[declaration.value];
  if (alias) {
    const target = /var\((--[\w-]+)\)/.exec(alias)?.[1];
    const token = target ? TOKENS[target] : undefined;
    const resolved = token ? `\n\n\`${tokenSummary(token)}\`` : "";
    return {
      markdown: `**\`${declaration.value}\`** reads as \`${alias}\`.${resolved}`,
      range: [base + declaration.valueSpan[0], base + declaration.valueSpan[1]],
    };
  }
  return undefined;
}

/** Markdown for a `data-ui` identity: its stylesheet's summary, presets, slots, and hooks. */
export function identity(token: string): string | undefined {
  const owner = IDENTITIES[token];
  if (!owner) return undefined;
  const header = HEADERS[owner.file];
  const lines = [
    `**\`${token}\`** · ${owner.primitive ? `${owner.primitive} primitive` : "base layer"}`,
  ];
  if (header?.summary) lines.push("", header.summary);
  const root = token.split("-")[0]!;
  const presets = [...ATTRIBUTES.keys()].filter(
    (name) =>
      name.startsWith(`data-${token}-`) && !name.endsWith("-slot") && !name.endsWith("-state"),
  );
  if (presets.length) lines.push("", `Presets: ${presets.map((p) => `\`${p}\``).join(", ")}`);
  const slots = ATTRIBUTES.get(`data-${root}-slot`)?.values.map((v) => `\`${v.name}\``);
  if (slots?.length) lines.push("", `Slots (\`data-${root}-slot\`): ${slots.join(", ")}`);
  for (const tag of header?.tags["tokens"] ?? []) lines.push("", `Hooks: ${tag}`);
  lines.push("", `Styles: \`${owner.file}\``);
  return lines.join("\n");
}
