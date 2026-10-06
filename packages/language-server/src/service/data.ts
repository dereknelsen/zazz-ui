/**
 * @fileoverview The kit's generated editor data (`@zazz-ui/core/editor/*`),
 * indexed for lookups: utility values by property name, `data-*` attributes,
 * tag forms, identities, hooks, and tokens.
 */

import cssData from "@zazz-ui/core/editor/zazz.css-data.json" with { type: "json" };
import htmlData from "@zazz-ui/core/editor/zazz.html-data.json" with { type: "json" };
import languageData from "@zazz-ui/core/editor/zazz.language-data.json" with { type: "json" };

export interface NamedValue {
  name: string;
  description?: string;
}

export interface TokenData {
  value: string;
  file: string;
  light?: string;
  dark?: string;
  min?: string;
  max?: string;
}

export interface HeaderData {
  summary: string;
  tags: Record<string, string[]>;
}

/** Values offered after the colon, by full property name (`--px`, `--px--md`, `--ui-button-bg`). */
export const PROPERTY_VALUES = new Map<string, NamedValue[]>(
  (cssData.properties as { name: string; values?: NamedValue[] }[]).map((property) => [
    property.name,
    property.values ?? [],
  ]),
);

/** `data-*` global attributes with their values (`data-ui`, `data-button-variant`, …). */
export const ATTRIBUTES = new Map<string, { description?: string; values: NamedValue[] }>(
  (htmlData.globalAttributes as { name: string; description?: string; values: NamedValue[] }[]).map(
    (attribute) => [attribute.name, attribute],
  ),
);

export const TAGS = htmlData.tags as { name: string; description: string }[];

export const IDENTITIES = languageData.identities as Record<
  string,
  { primitive: string | null; file: string }
>;
export const TAG_PRIMITIVES = languageData.tags as Record<string, string>;
export const HEADERS = languageData.primitives as Record<string, HeaderData>;
export const HOOKS = languageData.hooks as Record<string, { value: string; file: string }>;
export const TOKENS = languageData.tokens as Record<string, TokenData>;

/** One line for a token's value: its rem range, its light / dark literals, or as written. */
export function tokenSummary(token: TokenData): string {
  if (token.min && token.max)
    return token.min === token.max ? token.min : `${token.min} – ${token.max}`;
  if (token.light && token.dark) {
    return token.light === token.dark ? token.light : `light ${token.light} · dark ${token.dark}`;
  }
  return token.value;
}
