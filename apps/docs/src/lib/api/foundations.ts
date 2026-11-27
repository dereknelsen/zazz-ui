/**
 * Foundations data: typography roles (from `font.css`), global `data-ui-*` attributes (from the HTML custom
 * data), and design tokens grouped by purpose (from the language data).
 */
import htmlData from "@zazz-ui/core/editor/zazz.html-data.json";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json";
import { readKitFile } from "../kit.ts";

const ROLE_ORDER = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "eyebrow",
  "2xl",
  "xl",
  "lg",
  "md",
  "sm",
  "xs",
  "2xs",
];

/** The typography roles the kit styles (the values of `data-font`), in display order. */
export function typographyRoles(): string[] {
  const css = readKitFile("primitives/font/font.css") ?? "";
  const found = new Set([...css.matchAll(/\[data-font="([a-z0-9]+)"\]/g)].map((m) => m[1]!));
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

const PAGE_LEVEL = /^data-(?:draggable|navigation(?:-persist(?:-mode)?)?|style-guard|theme)$/;

/** The page-level attributes: navigation, the color scheme, the drag opt-out, and the style guard opt-out. */
export function globalAttributes(): GlobalAttribute[] {
  return (
    htmlData.globalAttributes as { name: string; description: string; values: { name: string }[] }[]
  )
    .filter((a) => PAGE_LEVEL.test(a.name))
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
  { id: "fluid", title: "Fluid range", test: /^--fluid(-|$)/ },
  { id: "spacing", title: "Spacing", test: /^--spac(e|ing)/ },
  { id: "radius", title: "Radius", test: /^--radius-/ },
  {
    id: "shadow",
    title: "Shadows, ring, and outline",
    test: /^--shadow-|^--ring-|^--outline-|^--default-shadow-/,
  },
  { id: "font", title: "Type: families, sizes, weights", test: /^--font-|^--typeset-/ },
  {
    id: "leading-tracking",
    title: "Type: leading, tracking, rhythm, decoration",
    test: /^--leading-|^--tracking-|^--paragraph-spacing-|^--decoration-/,
  },
  { id: "layout", title: "Layout widths", test: /^--layout-|^--article-|^--gutters$/ },
  {
    id: "motion",
    title: "Motion",
    test: /^--spring-|^--bezier-|^--default-|^--(spin|ping|pulse|bounce)$/,
  },
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
