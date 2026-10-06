/**
 * @fileoverview Inlay hints inside `style`: what a scale number comes to
 * (`--p: 4` → `≈ 0.9–1rem`, `--spacing` being fluid), a breakpoint tier's
 * threshold (`--px--md` → `≥ 65ch`), what a shorthand reads as (`--shadow: md`
 * → `var(--shadow-md)`), and a size token's range (`var(--space-md)`).
 */

import { scanDeclarations } from "@zazz-ui/core/base/style-format.ts";
import { parseUtilityName } from "@zazz-ui/core/base/utilities.ts";
import { attributeOf } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { TOKENS, tokenSummary } from "./data.ts";
import { UTILITY_BY_NAME, breakpointThreshold, isBreakpoint } from "./describe.ts";

export interface ZazzInlayHint {
  offset: number;
  label: string;
  tooltip?: string;
}

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;

/** `n × --spacing` as a range, from the token's resolved clamp ends. */
function scaleRange(n: number): string | undefined {
  const spacing = TOKENS["--spacing"];
  const unit = /[a-z%]+$/.exec(spacing?.min ?? "")?.[0];
  if (!spacing?.min || !spacing.max || !unit) return undefined;
  const at = (end: string) => `${Number((parseFloat(end) * n).toFixed(3))}`;
  const min = at(spacing.min);
  const max = at(spacing.max);
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
}

export function inlayHints(parsed: ParsedHtml, from = 0, to = Infinity): ZazzInlayHint[] {
  const hints: ZazzInlayHint[] = [];
  for (const tag of parsed.tags) {
    const value = attributeOf(tag, "style")?.value;
    if (!value || value.range[1] < from || value.range[0] > to) continue;
    const base = value.range[0];
    for (const declaration of scanDeclarations(value.value)) {
      const name = parseUtilityName(declaration.name);
      const utility = UTILITY_BY_NAME.get(name.name);
      if (!utility || declaration.colon === -1) continue;
      if (name.tier && isBreakpoint(name.tier)) {
        hints.push({
          offset: base + declaration.nameSpan[1],
          label: ` ${breakpointThreshold(name.tier)}`,
          tooltip: `Applies when the nearest container is ${breakpointThreshold(name.tier)} wide.`,
        });
      }
      const end = base + declaration.valueSpan[1];
      if (utility.mode === "dual" && NUMBER.test(declaration.value)) {
        const range = scaleRange(Number(declaration.value));
        if (range) {
          hints.push({
            offset: end,
            label: ` ≈ ${range}`,
            tooltip: `${declaration.value} × --spacing (fluid)`,
          });
        }
        continue;
      }
      const alias = utility.aliases?.[declaration.value];
      if (alias) {
        hints.push({ offset: end, label: ` = ${alias}` });
        continue;
      }
      const token = /^var\((--[\w-]+)\)$/.exec(declaration.value)?.[1];
      const data = token ? TOKENS[token] : undefined;
      if (data?.min && data.max) hints.push({ offset: end, label: ` ≈ ${tokenSummary(data)}` });
    }
  }
  return hints;
}
