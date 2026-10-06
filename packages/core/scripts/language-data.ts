/**
 * @fileoverview `editor/zazz.language-data.json`: what the language server
 * (`packages/language-server`) needs beyond the VS Code custom data. Written by
 * `generate-editor-data.ts`, and kept fresh by its test.
 *
 * - `identities`: each `data-ui` token's owning primitive (`null` for the
 *   base layers: typography roles, switches, prose), so a page can import it.
 * - `tags`: each `ui-*` tag form's primitive.
 * - `primitives`: each stylesheet's CSSDoc header (summary line and tags).
 * - `hooks`: each `--ui-*` hook's default and the file declaring it.
 * - `tokens`: each design token's value, resolved through `var()` into its
 *   light and dark literals and, for fluid sizes, the rem range.
 */

import { readFileSync } from "node:fs";
import { basename, relative } from "node:path";
import { PRIMITIVES } from "../src/manifest.ts";

export interface IdentityData {
  /** Manifest key of the primitive that styles it; `null` when the base layers do. */
  primitive: string | null;
  /** `src/`-relative stylesheet that declares it. */
  file: string;
}

export interface HeaderData {
  summary: string;
  /** CSSDoc tags (`@requires`, `@tokens`, `@presets`, …), continuation lines joined. */
  tags: Record<string, string[]>;
}

export interface TokenData {
  /** The declaration as written. */
  value: string;
  file: string;
  /** Resolved literals where the value is a `light-dark()` pair (or the same literal for both). */
  light?: string;
  dark?: string;
  /** A fluid size's range (`clamp()` ends), in its unit. */
  min?: string;
  max?: string;
}

export interface HookData {
  value: string;
  file: string;
}

export interface LanguageData {
  identities: Record<string, IdentityData>;
  tags: Record<string, string>;
  primitives: Record<string, HeaderData>;
  hooks: Record<string, HookData>;
  tokens: Record<string, TokenData>;
}

/** Identities several primitives declare, owned by the one that defines them. */
const OWNERS: Record<string, string> = {
  field: "fields",
  "field-group": "fields",
  multiselect: "select",
};

// --- CSS text ---

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every custom property declaration, first definition wins (the base one, not a theme override). */
export function customProperties(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const m of stripComments(css).matchAll(/(--[a-z0-9_-]+)\s*:\s*([^;{}]+);/gi)) {
    if (!found.has(m[1]!)) found.set(m[1]!, m[2]!.replace(/\s+/g, " ").trim());
  }
  return found;
}

/** The first `/** … *\/` block: its summary line and `@tags`. */
export function parseHeader(css: string): HeaderData | undefined {
  const block = /^\s*\/\*\*([\s\S]*?)\*\//.exec(css);
  if (!block) return undefined;
  const lines = block[1]!.split("\n").map((line) => line.replace(/^\s*\*\s?/, ""));
  const tags: Record<string, string[]> = {};
  const summary: string[] = [];
  let current: string[] | undefined;
  for (const line of lines) {
    const text = line.trim();
    const tag = /^@(\w+)\s+(.*)$/.exec(text);
    if (tag) {
      current = tags[tag[1]!] ??= [];
      current.push(tag[2]!.trim());
    } else if (!text) {
      current = undefined;
    } else if (current) {
      current[current.length - 1] += ` ${text}`;
    } else if (!Object.keys(tags).length) {
      summary.push(text);
    }
  }
  return { summary: summary.join(" ").replace(/\s+/g, " ").trim(), tags };
}

// --- Token resolution ---

/** The arguments of the outermost function call starting at `text[open]` (`(`), split on top-level commas. */
function callArgs(text: string, open: number): { args: string[]; end: number } {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        args.push(text.slice(start, i).trim());
        return { args, end: i + 1 };
      }
    } else if (ch === "," && depth === 1) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  return { args, end: text.length };
}

/** Rewrites every `name(…)` call in `text` with `replace(args)`. */
function rewriteCalls(text: string, name: string, replace: (args: string[]) => string): string {
  const pattern = new RegExp(`(?<![\\w-])${name}\\(`, "g");
  let out = "";
  let last = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    const open = m.index + name.length;
    const { args, end } = callArgs(text, open);
    out += text.slice(last, m.index) + replace(args);
    last = end;
    pattern.lastIndex = end;
  }
  return out + text.slice(last);
}

type Scheme = "light" | "dark";
type End = "min" | "max";

/** Substitutes `var()` references (and their fallbacks), picking one side of `light-dark()` and `clamp()`. */
function substitute(
  value: string,
  defs: Map<string, string>,
  scheme: Scheme,
  end: End,
  depth = 0,
): string {
  if (depth > 12) return value;
  let out = rewriteCalls(value, "light-dark", ([light = "", dark = ""]) =>
    scheme === "light" ? light : dark,
  );
  out = rewriteCalls(out, "clamp", ([min = "", , max = ""]) => (end === "min" ? min : max));
  out = rewriteCalls(out, "var", ([name = "", fallback]) => {
    const def = defs.get(name);
    const resolved = def ?? fallback;
    return resolved === undefined
      ? `var(${name})`
      : substitute(resolved, defs, scheme, end, depth + 1);
  });
  return out.replace(/\s+/g, " ").trim();
}

/** Evaluates `calc()` arithmetic over numbers in one unit (`rem`, `px`, …), or `undefined`. */
export function evaluate(expression: string): string | undefined {
  const tokens = expression.replace(/calc\(/g, "(").match(/\d*\.?\d+[a-z%]*|[-+*/()]|\S/gi) ?? [];
  let unit = "";
  let i = 0;
  // expression := term (("+" | "-") term)*; term := factor (("*" | "/") factor)*;
  // factor := number | "(" expression ")" | "-" factor
  const factor = (): number => {
    const token = tokens[i++];
    if (token === "(") {
      const value = sum();
      if (tokens[i++] !== ")") throw new Error("unbalanced");
      return value;
    }
    if (token === "-") return -factor();
    const m = /^(\d*\.?\d+)([a-z%]*)$/i.exec(token ?? "");
    if (!m) throw new Error(`not a number: ${token}`);
    if (m[2]) {
      if (unit && unit !== m[2]) throw new Error("mixed units");
      unit = m[2];
    }
    return Number(m[1]);
  };
  const product = (): number => {
    let value = factor();
    while (tokens[i] === "*" || tokens[i] === "/")
      value = tokens[i++] === "*" ? value * factor() : value / factor();
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (tokens[i] === "+" || tokens[i] === "-")
      value = tokens[i++] === "+" ? value + product() : value - product();
    return value;
  };
  try {
    const result = sum();
    if (i !== tokens.length || !Number.isFinite(result)) return undefined;
    return `${Number(result.toFixed(4))}${unit}`;
  } catch {
    return undefined;
  }
}

export function resolveToken(
  value: string,
  defs: Map<string, string>,
): Omit<TokenData, "value" | "file"> {
  const resolved: Omit<TokenData, "value" | "file"> = {};
  const light = substitute(value, defs, "light", "max");
  const dark = substitute(value, defs, "dark", "max");
  if (!light.includes("var(")) {
    resolved.light = light;
    resolved.dark = dark;
  }
  if (/clamp\(|var\(/.test(value)) {
    const min = evaluate(substitute(value, defs, "light", "min"));
    const max = evaluate(substitute(value, defs, "light", "max"));
    if (min !== undefined && max !== undefined) {
      // a size: its range says more than the light/dark text
      delete resolved.light;
      delete resolved.dark;
      resolved.min = min;
      resolved.max = max;
    }
  }
  return resolved;
}

// --- Identities ---

/** The primitive owning `token`: its manifest key, a manifest key it extends, its only stylesheet, or `OWNERS`. */
export function identityOwner(token: string, declaredIn: readonly string[]): string | null {
  const primitives = declaredIn.filter((file) => file.startsWith("primitives/"));
  if (primitives.length === 0) return null;
  if (OWNERS[token]) return OWNERS[token];
  if (PRIMITIVES[token]) return token;
  const prefix = Object.keys(PRIMITIVES)
    .filter((key) => token.startsWith(`${key}-`))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return prefix;
  const owners = new Set(primitives.map((file) => file.split("/")[1]!));
  if (owners.size === 1) return [...owners][0]!;
  throw new Error(
    `language data: data-ui="${token}" is declared by ${[...owners].join(", ")}; add it to OWNERS`,
  );
}

// --- Generate ---

/** `files` are absolute paths of every kit stylesheet; `src` is the `src/` root. */
export function languageData(files: readonly string[], src: string): LanguageData {
  const sheets = files.map((path) => ({
    path: relative(src, path),
    css: readFileSync(path, "utf8"),
  }));
  const declaredIn = new Map<string, string[]>();
  for (const { path, css } of sheets) {
    for (const m of stripComments(css).matchAll(/\[data-ui~="([^"]+)"\]/g)) {
      const list = declaredIn.get(m[1]!) ?? [];
      if (!list.includes(path)) list.push(path);
      declaredIn.set(m[1]!, list);
    }
  }
  const identities: Record<string, IdentityData> = {};
  for (const token of [...declaredIn.keys()].sort()) {
    const files = declaredIn.get(token)!;
    const primitive = identityOwner(token, files);
    const own = primitive && files.find((file) => file.startsWith(`primitives/${primitive}/`));
    identities[token] = { primitive, file: own ?? files[0]! };
  }

  const tags: Record<string, string> = {};
  for (const [name, entry] of Object.entries(PRIMITIVES)) {
    for (const tag of entry.tags ?? []) tags[tag] = name;
  }

  const primitives: Record<string, HeaderData> = {};
  for (const { path, css } of sheets) {
    if (!path.startsWith("primitives/")) continue;
    const header = parseHeader(css);
    if (header) primitives[path] = header;
  }

  const defs = new Map<string, string>();
  const definedIn = new Map<string, string>();
  for (const { path, css } of sheets) {
    for (const [name, value] of customProperties(css)) {
      if (defs.has(name) || name.startsWith("--_")) continue;
      defs.set(name, value);
      definedIn.set(name, path);
    }
  }
  const hooks: Record<string, HookData> = {};
  const tokens: Record<string, TokenData> = {};
  for (const [name, value] of [...defs].sort(([a], [b]) => a.localeCompare(b))) {
    const file = definedIn.get(name)!;
    if (name.startsWith("--ui-")) {
      hooks[name] = { value, file };
    } else if (basename(file).startsWith("_variables") || basename(file) === "_breakpoints.css") {
      tokens[name] = { value, file, ...resolveToken(value, defs) };
    }
  }
  return { identities, tags, primitives, hooks, tokens };
}
