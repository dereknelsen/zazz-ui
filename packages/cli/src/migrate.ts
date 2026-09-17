"use strict";

/**
 * @fileoverview The migrate engine: versioned rename rules applied to text.
 * @description Pure and fs-free. `loadRules` validates a `migrations/<to>.json`
 * document, `compile` turns it into the regexes one pass needs, and
 * `applyToText` rewrites one file's text, counting hits per rule and reporting
 * what it could not map. Every rewrite is simultaneous by construction: one
 * alternation regex, longest name first, one `replace` with a map lookup, so
 * chain shifts (`@xs:`→`@sm:` next to `@sm:`→`@md:`) never double-apply within
 * a run. The corollary is that chain shifts are not idempotent across runs;
 * the command stamps `migrated` in zazz.json for exactly that reason. Rules
 * whose `to` names are disjoint from their `from` names are idempotent.
 *
 * Rule kinds and where each applies:
 * - `token`: a custom-property name, every file kind, word-and-dash bounded.
 *   With `readsOnly` (the old name is a live style prop in the new version),
 *   markup, `md` and `js` rename only `var(--name)` reads, never a `--name:`
 *   declaration in a `style` attribute; `css` and `<style>` blocks rename both.
 * - `class-prefix` / `class`: whitespace-separated tokens inside `class="…"`,
 *   `class='…'`, `className="…"` / `className='…'` literals, plus the escaped
 *   selector form (`.\@xs\:grid`) in `css` and inside `<style>` blocks of
 *   `html` (which covers `.vue`, `.svelte` and `.astro` single-file components).
 * - `attr-value`: `from`/`to` are `attr=value` pairs; rewrites `attr="value"`
 *   and `attr='value'` (markup and CSS attribute selectors alike).
 * - `manual`: report only. A needle ending in `{` names a JSX attribute
 *   expression (`className={`) and is searched in the raw text; any other
 *   needle (`[`) is searched inside class tokens.
 *
 * Built in, rule-independent: in `js`, any line whose string literal (quotes
 * or backticks) carries a class prefix or class name outside a `class` /
 * `className` attribute literal is reported (`classList.add("@xs:grid")`,
 * `` `@xs:grid ${gap}` ``), since the expression that builds the class list
 * is not something a rename can follow.
 */

import { ZazzError } from "./errors.ts";

// --- Rule shape ---

export type RuleKind = "token" | "class-prefix" | "class" | "attr-value" | "manual";

export interface Rule {
  kind: RuleKind;
  /**
   * The thing to find: a `--token` name, a class prefix like `@xs:`, an exact
   * class name, an `attr=value` pair, or (manual) a literal needle.
   */
  from: string;
  /** The replacement, same shape as `from`. Absent on `manual` rules. */
  to?: string;
  /** Wording for the report. Manual rules should always carry one. */
  note?: string;
  /**
   * `token` rules only. The old name lives on as a *style prop* in the new
   * version (`--gap-md` is the `--gap` prop at md), so outside stylesheets
   * only `var(--name)` reads are renamed; a `--name:` declaration in a
   * `style` attribute is the new prop and stays. In `css` (and `<style>`
   * blocks) declarations and reads are both renamed, as for any token.
   */
  readsOnly?: boolean;
}

/** The parsed `migrations/<to>.json` document. */
export interface Rules {
  /** The kit line these rules migrate away from, e.g. `0.4`. */
  from: string;
  /** The kit version they migrate to, e.g. `0.5.0`. */
  to: string;
  rules: Rule[];
}

export type FileKind = "css" | "html" | "md" | "js";

export interface Unmappable {
  /** 1-based line in the input text. */
  line: number;
  /** The token, literal, or line tail that could not be mapped (trimmed, capped). */
  snippet: string;
  note: string;
}

export interface ApplyResult {
  text: string;
  /** Hits per rule id (see `ruleId`); rules that never fired are absent. */
  counts: Record<string, number>;
  unmappable: Unmappable[];
}

const KINDS: ReadonlySet<string> = new Set<RuleKind>([
  "token",
  "class-prefix",
  "class",
  "attr-value",
  "manual",
]);

/** The stable key a rule is counted under: `kind:from`. */
export function ruleId(rule: Pick<Rule, "kind" | "from">): string {
  return `${rule.kind}:${rule.from}`;
}

/**
 * @description Parses (when given a string) and validates a rules document.
 * `source` names it in error messages, e.g. the path it was read from.
 */
export function loadRules(json: unknown, source = "migration rules"): Rules {
  const fail: (detail: string) => never = (detail) => {
    throw new ZazzError(`${source} is not a valid migration file: ${detail}`);
  };

  let raw = json;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      fail(`not valid JSON (${(error as Error).message})`);
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("not an object");
  const doc = raw as Record<string, unknown>;
  if (typeof doc.from !== "string" || doc.from.length === 0) fail("from missing");
  if (typeof doc.to !== "string" || doc.to.length === 0) fail("to missing");
  if (!Array.isArray(doc.rules)) fail("rules must be an array");

  const rules = (doc.rules as unknown[]).map((entry, index) => validateRule(entry, index, fail));
  const seen = new Set<string>();
  for (const rule of rules) {
    const id = ruleId(rule);
    if (seen.has(id)) fail(`duplicate rule ${id}`);
    seen.add(id);
  }
  return { from: doc.from, to: doc.to, rules };
}

function validateRule(entry: unknown, index: number, fail: (detail: string) => never): Rule {
  const where = `rules[${index}]`;
  if (typeof entry !== "object" || entry === null) fail(`${where} is not an object`);
  const { kind, from, to, note, readsOnly } = entry as Record<string, unknown>;

  if (!isKind(kind)) fail(`${where}.kind must be one of ${[...KINDS].join(", ")}`);
  if (typeof from !== "string" || from.length === 0) fail(`${where}.from missing`);
  if (/\s/.test(from)) fail(`${where}.from must not contain whitespace`);
  if (note !== undefined && typeof note !== "string") fail(`${where}.note must be a string`);
  if (readsOnly !== undefined && typeof readsOnly !== "boolean") {
    fail(`${where}.readsOnly must be a boolean`);
  }
  if (readsOnly !== undefined && kind !== "token") {
    fail(`${where}: readsOnly applies to token rules only`);
  }

  if (kind === "manual") {
    if (to !== undefined) fail(`${where}: manual rules take no "to"`);
    return note === undefined ? { kind, from } : { kind, from, note };
  }

  if (typeof to !== "string" || to.length === 0) fail(`${where}.to missing`);
  if (/\s/.test(to)) fail(`${where}.to must not contain whitespace`);
  if (to === from) fail(`${where} maps ${from} to itself`);
  if (kind === "token") {
    if (!from.startsWith("--") || !to.startsWith("--")) {
      fail(`${where}: token names start with --`);
    }
    if (readsOnly === true) {
      return note === undefined
        ? { kind, from, to, readsOnly }
        : { kind, from, to, note, readsOnly };
    }
  }
  if (kind === "attr-value") {
    const source = parseAttrValue(from);
    const target = parseAttrValue(to);
    if (source === null || target === null) fail(`${where}: attr-value from/to must be attr=value`);
    if (source.attr !== target.attr) {
      fail(`${where}: attr-value must keep the attribute name (${source.attr} vs ${target.attr})`);
    }
  }
  return note === undefined ? { kind, from, to } : { kind, from, to, note };
}

function isKind(value: unknown): value is RuleKind {
  return typeof value === "string" && KINDS.has(value);
}

function parseAttrValue(pair: string): { attr: string; value: string } | null {
  const match = /^([\w:-]+)=(.+)$/.exec(pair);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  return { attr: match[1], value: match[2] };
}

// --- Compilation ---

/** One alternation regex plus the lookup it feeds; `map` keys are match text. */
interface Replacer<Entry extends { to: string; id: string } = { to: string; id: string }> {
  regex: RegExp;
  map: Map<string, Entry>;
}

/** A token rule's replacement, with the `readsOnly` restriction when set. */
interface TokenEntry {
  to: string;
  id: string;
  readsOnly: boolean;
}

interface ManualNeedle {
  needle: string;
  id: string;
  note: string;
}

export interface Compiled {
  /** The rules in force, built-in manual rules included. */
  readonly rules: readonly Rule[];
  readonly token: Replacer<TokenEntry> | null;
  /** Exact class name → replacement. */
  readonly className: Map<string, { to: string; id: string }>;
  /** Class prefixes, longest first, each with its replacement. */
  readonly classPrefix: { from: string; to: string; id: string }[];
  /** Escaped selector forms of the class rules (`.\@xs\:` …) for `css` and `<style>` blocks. */
  readonly cssSelector: Replacer | null;
  /** `attr` → (`value` → replacement) for attr-value rules. */
  readonly attrValue: {
    regex: RegExp;
    map: Map<string, Map<string, { to: string; id: string }>>;
  } | null;
  /** Manual needles searched inside class tokens. */
  readonly manualInClass: ManualNeedle[];
  /** Manual needles (ending in `{`) searched in the raw text. */
  readonly manualInText: ManualNeedle[];
  /** Class prefixes and names, longest first, for the js string-literal probe. */
  readonly classNeedles: RegExp | null;
}

/**
 * The rewriter's own limits, reported even when the rules file is silent
 * about them. A rules file that carries the same `from` overrides the note.
 */
const BUILTIN_MANUAL: readonly Rule[] = [
  {
    kind: "manual",
    from: "className={",
    note: "JSX className expression; migrate the strings inside by hand",
  },
  { kind: "manual", from: "[", note: "arbitrary value; migrate by hand" },
];

const DEFAULT_NOTE = "migrate by hand";

export function compile(rules: Rules): Compiled {
  const declared = new Set(rules.rules.map((rule) => rule.from));
  const all = [...rules.rules, ...BUILTIN_MANUAL.filter((rule) => !declared.has(rule.from))];

  const tokens = new Map<string, TokenEntry>();
  const className = new Map<string, { to: string; id: string }>();
  const classPrefix: Compiled["classPrefix"] = [];
  const attrs = new Map<string, Map<string, { to: string; id: string }>>();
  const manualInClass: ManualNeedle[] = [];
  const manualInText: ManualNeedle[] = [];

  for (const rule of all) {
    const id = ruleId(rule);
    const to = rule.to ?? "";
    switch (rule.kind) {
      case "token":
        tokens.set(rule.from, { to, id, readsOnly: rule.readsOnly === true });
        break;
      case "class":
        className.set(rule.from, { to, id });
        break;
      case "class-prefix":
        classPrefix.push({ from: rule.from, to, id });
        break;
      case "attr-value": {
        const source = parseAttrValue(rule.from);
        const target = parseAttrValue(to);
        if (source === null || target === null) break; // loadRules rejects these
        const values = attrs.get(source.attr) ?? new Map();
        values.set(source.value, { to: target.value, id });
        attrs.set(source.attr, values);
        break;
      }
      case "manual": {
        const needle = { needle: rule.from, id, note: rule.note ?? DEFAULT_NOTE };
        (rule.from.endsWith("{") ? manualInText : manualInClass).push(needle);
        break;
      }
    }
  }
  classPrefix.sort((a, b) => b.from.length - a.from.length);

  // Escaped selector forms share one map so a prefix and an exact class never race.
  const cssMap = new Map<string, { to: string; id: string }>();
  for (const [from, entry] of className) {
    cssMap.set(cssEscape(from), { to: cssEscape(entry.to), id: entry.id });
  }
  for (const entry of classPrefix) {
    cssMap.set(cssEscape(entry.from), { to: cssEscape(entry.to), id: entry.id });
  }
  const cssSelector =
    cssMap.size === 0
      ? null
      : {
          map: cssMap,
          // Exact classes need a trailing boundary; prefixes end in `\:` and carry their own.
          regex: new RegExp(
            `(?<=\\.)(?:${[...cssMap.keys()]
              .sort(byLengthDesc)
              .map((form) =>
                form.endsWith("\\:") ? escapeRegExp(form) : `${escapeRegExp(form)}(?![\\w-])`,
              )
              .join("|")})`,
            "g",
          ),
        };

  // Exact names need a trailing boundary; prefixes end in `:` and carry their own.
  const classNeedleForms = [
    ...[...className.keys()].map((name) => `${escapeRegExp(name)}(?![\\w-])`),
    ...classPrefix.map((entry) => escapeRegExp(entry.from)),
  ];

  return {
    rules: all,
    token: tokens.size === 0 ? null : boundedReplacer(tokens),
    className,
    classPrefix,
    cssSelector,
    attrValue:
      attrs.size === 0
        ? null
        : {
            map: attrs,
            regex: new RegExp(
              `(?<![\\w:.-])(${[...attrs.keys()].sort(byLengthDesc).map(escapeRegExp).join("|")})(\\s*=\\s*)(["'])([^"']*)\\3`,
              "g",
            ),
          },
    manualInClass,
    manualInText,
    classNeedles:
      classNeedleForms.length === 0
        ? null
        : new RegExp(`(?<![\\w@:-])(?:${classNeedleForms.sort(byLengthDesc).join("|")})`),
  };
}

/** `(?<![\w-])NAME(?![\w-])` over every name, longest first. */
function boundedReplacer<Entry extends { to: string; id: string }>(
  map: Map<string, Entry>,
): Replacer<Entry> {
  const names = [...map.keys()].sort(byLengthDesc).map(escapeRegExp).join("|");
  return { regex: new RegExp(`(?<![\\w-])(?:${names})(?![\\w-])`, "g"), map };
}

function byLengthDesc(a: string, b: string): number {
  return b.length - a.length || (a < b ? -1 : 1);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The hand-authored escape form the kit uses in selectors: `@xs:` → `\@xs\:`. */
function cssEscape(ident: string): string {
  return ident.replace(/[^\w-]/g, (char) => `\\${char}`);
}

// --- Application ---

/** Attribute literals the class rewrite owns; excludes `:class`, `data-class`, `el.className`. */
const CLASS_ATTR = /(?<![\w:.@-])(class|className)(\s*=\s*)(?:"([^"]*)"|'([^']*)')/g;

/** A `<style>` element in markup, tags included: the one place css lives in `html`. */
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;

const SNIPPET_MAX = 80;

export function applyToText(
  text: string,
  compiled: Compiled,
  options: { kind: FileKind },
): ApplyResult {
  const counts: Record<string, number> = {};
  const unmappable: Unmappable[] = [];
  const hit = (id: string): void => {
    counts[id] = (counts[id] ?? 0) + 1;
  };

  // No rewrite below adds or removes a newline, so a line number holds for
  // input and output alike — but an offset does not (a rename can change a
  // line's length), so every lookup goes through an index over the very
  // string the offset was measured in.
  const inputLines = new LineIndex(text);
  const reportedLines = new Set<number>();
  for (const { needle, id, note } of compiled.manualInText) {
    for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
      const line = inputLines.at(at);
      reportedLines.add(line);
      unmappable.push({ line, snippet: excerpt(text, at), note });
      hit(id);
    }
  }
  if (options.kind === "js" && compiled.classNeedles !== null) {
    const needles = compiled.classNeedles;
    // Class attribute literals are rewritten below, so they are blanked out
    // (newlines kept, offsets intact) before the string literals are walked.
    const loose = text.replace(CLASS_ATTR, (attr) => attr.replace(/[^\n]/g, " "));
    for (const { line, lineStart, content } of jsLiterals(loose)) {
      if (reportedLines.has(line)) continue;
      const found = needles.exec(content);
      if (found === null) continue;
      reportedLines.add(line);
      unmappable.push({
        line,
        snippet: excerpt(text, lineStart),
        note: `string literal contains \`${found[0]}\`; rewrite by hand`,
      });
    }
  }

  let out = text;

  if (compiled.token !== null) {
    const { regex, map } = compiled.token;
    // Outside stylesheets a readsOnly name is renamed only as a var() read;
    // css semantics still apply inside a markup file's <style> blocks.
    const styleBlocks =
      options.kind === "html"
        ? [...text.matchAll(STYLE_BLOCK)].map((match) => [
            match.index,
            match.index + match[0].length,
          ])
        : [];
    const isStylesheet = (offset: number): boolean =>
      options.kind === "css" ||
      styleBlocks.some(([start, end]) => offset >= (start ?? 0) && offset < (end ?? 0));
    out = out.replace(regex, (name, offset: number) => {
      const entry = map.get(name);
      if (entry === undefined) return name;
      if (entry.readsOnly && !isStylesheet(offset) && !isVarRead(text, offset)) return name;
      hit(entry.id);
      return entry.to;
    });
  }

  // Class attribute offsets are measured in the token-rewritten text.
  const tokenLines = new LineIndex(out);
  out = out.replace(
    CLASS_ATTR,
    (whole, name: string, eq: string, dq?: string, sq?: string, offset?: number) => {
      const value = dq ?? sq ?? "";
      const quote = dq === undefined ? "'" : '"';
      const valueStart = (offset ?? 0) + name.length + eq.length + 1;
      let at = valueStart;
      const pieces = value.split(/(\s+)/).map((piece) => {
        const start = at;
        at += piece.length;
        if (piece.length === 0 || /^\s+$/.test(piece)) return piece;
        for (const { needle, id, note } of compiled.manualInClass) {
          if (!piece.includes(needle)) continue;
          unmappable.push({ line: tokenLines.at(start), snippet: piece, note });
          hit(id);
        }
        const exact = compiled.className.get(piece);
        if (exact !== undefined) {
          hit(exact.id);
          return exact.to;
        }
        for (const prefix of compiled.classPrefix) {
          if (!piece.startsWith(prefix.from)) continue;
          hit(prefix.id);
          return prefix.to + piece.slice(prefix.from.length);
        }
        return piece;
      });
      const rewritten = pieces.join("");
      return rewritten === value ? whole : `${name}${eq}${quote}${rewritten}${quote}`;
    },
  );
  if (compiled.cssSelector !== null) {
    const { regex, map } = compiled.cssSelector;
    const rewriteSelectors = (css: string): string =>
      css.replace(regex, (form) => {
        const entry = map.get(form);
        if (entry === undefined) return form;
        hit(entry.id);
        return entry.to;
      });
    if (options.kind === "css") out = rewriteSelectors(out);
    else if (options.kind === "html") out = out.replace(STYLE_BLOCK, rewriteSelectors);
  }

  if (compiled.attrValue !== null) {
    const { regex, map } = compiled.attrValue;
    out = out.replace(regex, (whole, attr: string, eq: string, quote: string, value: string) => {
      const entry = map.get(attr)?.get(value);
      if (entry === undefined) return whole;
      hit(entry.id);
      return `${attr}${eq}${quote}${entry.to}${quote}`;
    });
  }

  unmappable.sort((a, b) => a.line - b.line);
  return { text: out, counts, unmappable };
}

/**
 * Line lookup by offset via binary search over line starts. The starts are
 * collected on the first lookup, so a file with nothing to report never pays
 * for the scan.
 */
class LineIndex {
  readonly #text: string;
  #starts: number[] | null = null;

  constructor(text: string) {
    this.#text = text;
  }

  /** 1-based line containing `offset`. */
  at(offset: number): number {
    const starts = (this.#starts ??= lineStarts(this.#text));
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  }
}

/** One line's worth of a js string literal's contents. */
interface LiteralLine {
  /** 1-based line the contents sit on. */
  line: number;
  /** Offset of that line's first character in the scanned text. */
  lineStart: number;
  /** The literal's contents on this line, quotes excluded. */
  content: string;
}

/**
 * @description Walks the `"…"`, `'…'` and `` `…` `` literals of js text and
 * yields their contents one line at a time, so a report can name the line
 * even for a template literal that spans several. Escapes are honoured; an
 * unterminated quote ends at its line (as the parser would reject it), while
 * a template runs on until its closing backtick. Comments and regex literals
 * are not modelled: a quote inside one opens a literal like any other, which
 * at worst yields a line the rules never match.
 */
function* jsLiterals(text: string): Generator<LiteralLine, void, undefined> {
  let line = 1;
  let lineStart = 0;
  let quote: '"' | "'" | "`" | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\n") {
      if (quote !== null) {
        yield { line, lineStart, content: text.slice(start, i) };
        if (quote === "`") start = i + 1;
        else quote = null;
      }
      line += 1;
      lineStart = i + 1;
    } else if (quote === null) {
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        start = i + 1;
      }
    } else if (char === "\\" && text[i + 1] !== "\n") {
      i += 1;
    } else if (char === quote) {
      yield { line, lineStart, content: text.slice(start, i) };
      quote = null;
    }
  }
  if (quote !== null) yield { line, lineStart, content: text.slice(start) };
}

/** Offset of every line start in `text`, the first being 0. */
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) {
    starts.push(i + 1);
  }
  return starts;
}

/** Whether the name at `offset` is the argument of a `var(` read. */
function isVarRead(text: string, offset: number): boolean {
  return /var\(\s*$/.test(text.slice(Math.max(0, offset - 32), offset));
}

/** From `start` to the end of its line, whitespace collapsed, capped. */
function excerpt(text: string, start: number): string {
  const end = text.indexOf("\n", start);
  const raw = text
    .slice(start, end === -1 ? undefined : end)
    .replace(/\s+/g, " ")
    .trim();
  return raw.length > SNIPPET_MAX ? `${raw.slice(0, SNIPPET_MAX - 1)}…` : raw;
}
