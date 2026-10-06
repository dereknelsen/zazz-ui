/**
 * Foundations data: switches (from `_switches.css`'s header), typography roles
 * (from `_typography.css`), global `data-ui-*` attributes (from the HTML custom
 * data), and design tokens grouped by purpose (from the language data).
 */
import htmlData from "@zazz-ui/core/editor/zazz.html-data.json";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json";
import { readKitFile } from "../kit.ts";

export interface Switch {
  tokens: string[];
  description: string;
}

/** Parses `@uses data-ui="x": description` lines (continuations indented) from a CSSDoc header. */
export function parseSwitches(css: string): Switch[] {
  const header = css.match(/\/\*\*([\s\S]*?)\*\//)?.[1] ?? "";
  const lines = header.split("\n").map((l) => l.replace(/^\s*\*\s?/, ""));
  const out: Switch[] = [];
  for (const line of lines) {
    const uses = line.match(/^@uses\s+(data-ui=.*)$/);
    if (uses) {
      const [, rest] = uses;
      const tokens = [...rest.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
      const description = rest.replace(/^data-ui=[^:]*:\s*/, "").trim();
      out.push({ tokens, description });
    } else if (out.length && /^\s+\S/.test(line) && !line.trim().startsWith("@")) {
      out[out.length - 1].description += ` ${line.trim()}`;
    } else if (line.startsWith("@")) {
      // a different tag ends the continuation
    }
  }
  return out;
}

export function switches(): Switch[] {
  return parseSwitches(readKitFile("base/_switches.css") ?? "");
}

const ROLE_ORDER = [
  "text-display",
  "text-h1",
  "text-h2",
  "text-h3",
  "text-h4",
  "text-h5",
  "text-h6",
  "text-eyebrow",
  "text-lead",
  "text-link",
  "text-2xl",
  "text-xl",
  "text-lg",
  "text-md",
  "text-sm",
  "text-xs",
  "text-2xs",
];

/** Typography role tokens the kit styles, in display order. */
export function typographyRoles(): string[] {
  const css = readKitFile("base/_typography.css") ?? "";
  const found = new Set([...css.matchAll(/data-ui~="(text-[a-z0-9-]+)"/g)].map((m) => m[1]));
  return [
    ...ROLE_ORDER.filter((r) => found.has(r)),
    ...[...found].filter((r) => !ROLE_ORDER.includes(r)).sort(),
  ];
}

export interface GlobalAttribute {
  name: string;
  description: string;
  values: string[];
}

/** `data-ui-*` attributes with no owning primitive (theme, navigation, persistence, guard). */
export function globalAttributes(): GlobalAttribute[] {
  return (
    htmlData.globalAttributes as { name: string; description: string; values: { name: string }[] }[]
  )
    .filter((a) => a.name.startsWith("data-ui-"))
    .map((a) => ({
      name: a.name,
      description: a.description,
      values: a.values.map((v) => v.name),
    }));
}

export interface Token {
  name: string;
  value: string;
  light?: string;
  dark?: string;
  min?: string;
  max?: string;
}

export interface TokenGroup {
  id: string;
  title: string;
  tokens: Token[];
}

type TokenData = Record<
  string,
  { value: string; light?: string; dark?: string; min?: string; max?: string }
>;

const GROUPS: { id: string; title: string; test: RegExp }[] = [
  {
    id: "color-roles",
    title: "Color roles",
    test: /^--color-(?!(primary|secondary|tertiary|neutral)-\d|shade-|tint-|white$|black$)/,
  },
  {
    id: "color-scales",
    title: "Color scales",
    test: /^--color-(primary|secondary|tertiary|neutral)-\d|^--color-(white|black)$/,
  },
  { id: "color-overlays", title: "Overlays", test: /^--color-(shade|tint)-/ },
  { id: "spacing", title: "Spacing", test: /^--spac(e|ing)/ },
  { id: "radius", title: "Radius", test: /^--radius-/ },
  { id: "shadow", title: "Shadows, ring, and outline", test: /^--shadow-|^--ring-|^--outline-/ },
  { id: "font", title: "Type: families, sizes, weights", test: /^--font-/ },
  {
    id: "leading-tracking",
    title: "Type: leading, tracking, rhythm, decoration",
    test: /^--leading-|^--tracking-|^--paragraph-spacing-|^--decoration-/,
  },
  { id: "layout", title: "Layout widths", test: /^--layout-|^--article-|^--gutters$/ },
  { id: "motion", title: "Motion", test: /^--spring-|^--bezier-|^--default-/ },
];

export function tokenGroups(): TokenGroup[] {
  const tokens = languageData.tokens as TokenData;
  const groups: TokenGroup[] = GROUPS.map((g) => ({ id: g.id, title: g.title, tokens: [] }));
  const other: TokenGroup = { id: "other", title: "Other", tokens: [] };
  for (const [name, data] of Object.entries(tokens)) {
    const group = GROUPS.findIndex((g) => g.test.test(name));
    (group >= 0 ? groups[group] : other).tokens.push({ name, ...data });
  }
  for (const g of groups)
    g.tokens.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return other.tokens.length ? [...groups, other] : groups;
}

export function tokenGroup(id: string): TokenGroup | undefined {
  return tokenGroups().find((g) => g.id === id);
}
