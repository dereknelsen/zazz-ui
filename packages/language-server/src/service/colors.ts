/**
 * @fileoverview Color tokens inside `style` (`var(--color-primary)`), with
 * their resolved light and dark literals, for the client's swatches.
 */

import { scanDeclarations } from "@zazz-ui/core/base/style-format.ts";
import { attributeOf } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { TOKENS } from "./data.ts";

export interface ZazzColor {
  /** The `var(--token)` span. */
  range: [number, number];
  light: string;
  dark: string;
}

const COLOR =
  /^(?:oklch|oklab|lch|lab|rgba?|hsla?|hwb|color|color-mix)\(|^#[\da-f]{3,8}$|^[a-z]+$/i;

export function colorTokens(parsed: ParsedHtml): ZazzColor[] {
  const found: ZazzColor[] = [];
  for (const tag of parsed.tags) {
    const value = attributeOf(tag, "style")?.value;
    if (!value) continue;
    for (const declaration of scanDeclarations(value.value)) {
      for (const m of declaration.value.matchAll(/var\(\s*(--color-[\w-]+)\s*\)/g)) {
        const token = TOKENS[m[1]!];
        if (!token?.light || !token.dark || !COLOR.test(token.light)) continue;
        const start = value.range[0] + declaration.valueSpan[0] + m.index!;
        found.push({ range: [start, start + m[0].length], light: token.light, dark: token.dark });
      }
    }
  }
  return found;
}
