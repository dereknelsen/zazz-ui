/**
 * @fileoverview Template holes: the expressions a templating language embeds
 * in HTML (`{expr}`, `<%= %>`, `@Model.Name`, `{{ name }}`), masked to spaces
 * so the html parser and the audit see plain markup. Masking never moves a
 * character (same length, newlines kept), so every offset the services
 * compute on the masked text is an offset in the real document.
 *
 * Each language is a list of scanners run in order over the same buffer; a
 * scanner records the spans it masks as holes, and the server drops any
 * finding, hint, or edit that touches a hole.
 */

export type Span = [number, number];

export interface MaskedText {
  text: string;
  /** Masked spans, in document order. */
  holes: Span[];
}

/** A scanner masks spans in `chars` (in place) and returns them. */
type Scanner = (chars: string[], source: string) => Span[];

const BLANKS = new Set(["\n", "\r"]);

function blank(chars: string[], start: number, end: number): Span {
  for (let i = start; i < end; i++) if (!BLANKS.has(chars[i])) chars[i] = " ";
  return [start, end];
}

const isWord = (c: string | undefined): boolean => c !== undefined && /[\w$]/.test(c);
const isIdentStart = (c: string | undefined): boolean => c !== undefined && /[A-Za-z_$]/.test(c);

/** `open … close`, not nested: `<% %>`, `{{ }}`, `<?php ?>`, `@* *@`. */
function delimited(open: string, close: string): Scanner {
  return (chars, source) => {
    const holes: Span[] = [];
    let from = 0;
    for (;;) {
      const start = source.indexOf(open, from);
      if (start === -1) break;
      const end = source.indexOf(close, start + open.length);
      const stop = end === -1 ? source.length : end + close.length;
      holes.push(blank(chars, start, stop));
      from = stop;
    }
    return holes;
  };
}

/** Skips a JS/C#-style string starting at `i` (quote char at `i`); returns the index after it. */
function skipString(source: string, i: number, braceAware = false): number {
  const quote = source[i];
  let j = i + 1;
  while (j < source.length) {
    const c = source[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === quote) return j + 1;
    if (braceAware && quote === "`" && c === "$" && source[j + 1] === "{") {
      j = balancedEnd(source, j + 1, "{", "}");
      continue;
    }
    j++;
  }
  return j;
}

/** Index after the bracket that closes the one at `open`; strings are skipped. */
function balancedEnd(source: string, open: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let i = open;
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(source, i, true);
      continue;
    }
    if (c === openChar) depth++;
    else if (c === closeChar && --depth === 0) return i + 1;
    i++;
  }
  return source.length;
}

/**
 * `{expression}` blocks. With `jsx`, markup inside an expression
 * (`{items.map((i) => <li>{i}</li>)}`) stays visible: masking pauses at a tag
 * and resumes after the element that tag opened.
 */
function braces(jsx: boolean): Scanner {
  return (chars, source) => {
    const holes: Span[] = [];
    const maskCode = (from: number, to: number): void => {
      // code between `from` and `to`, pausing for markup when jsx
      let i = from;
      let runStart = from;
      const flush = (upto: number) => {
        if (upto > runStart) holes.push(blank(chars, runStart, upto));
      };
      while (i < to) {
        const c = source[i];
        if (c === '"' || c === "'" || c === "`") {
          i = skipString(source, i, true);
          continue;
        }
        if (jsx && c === "<" && (isIdentStart(source[i + 1]) || source[i + 1] === ">")) {
          flush(i);
          i = skipMarkup(i, to);
          runStart = i;
          continue;
        }
        i++;
      }
      flush(to);
    };
    /** From `<` at `i`: the index after the element it opens, masking nested `{}` inside. */
    const skipMarkup = (i: number, limit: number): number => {
      let depth = 0;
      let j = i;
      while (j < limit) {
        const c = source[j];
        if (c === "{") {
          const end = Math.min(balancedEnd(source, j, "{", "}"), limit);
          maskCode(j, end);
          j = end;
          continue;
        }
        if (c === "<") {
          if (source[j + 1] === "/") {
            const close = source.indexOf(">", j);
            j = close === -1 ? limit : close + 1;
            if (--depth <= 0) return j;
            continue;
          }
          if (isIdentStart(source[j + 1]) || source[j + 1] === ">") depth++;
        }
        if (c === "/" && source[j + 1] === ">") {
          j += 2;
          if (--depth <= 0) return j;
          continue;
        }
        j++;
      }
      return limit;
    };
    let i = 0;
    while (i < source.length) {
      if (source[i] === "{") {
        const end = balancedEnd(source, i, "{", "}");
        maskCode(i, end);
        i = end;
      } else i++;
    }
    return holes;
  };
}

/** Astro's `---` frontmatter fence at the top of the file. */
const frontmatter: Scanner = (chars, source) => {
  if (!source.startsWith("---")) return [];
  const close = source.indexOf("\n---", 3);
  if (close === -1) return [];
  const lineEnd = source.indexOf("\n", close + 1);
  return [blank(chars, 0, lineEnd === -1 ? source.length : lineEnd)];
};

const RAZOR_BLOCKS = new Set([
  "if",
  "else",
  "for",
  "foreach",
  "while",
  "do",
  "switch",
  "try",
  "catch",
  "finally",
  "lock",
  "using",
  "functions",
  "code",
  "section",
  "helper",
]);
const RAZOR_LINE_DIRECTIVES = new Set([
  "page",
  "model",
  "using",
  "inject",
  "layout",
  "namespace",
  "inherits",
  "implements",
  "attribute",
  "addTagHelper",
  "removeTagHelper",
  "tagHelperPrefix",
  "typeparam",
  "preservewhitespace",
  "rendermode",
]);

/** Razor: `@* *@`, `@{ }`, `@( )`, `@keyword (…) {` heads and their braces, directives, `@Model.X()`. */
const razor: Scanner = (chars, source) => {
  const holes: Span[] = [];
  const blockCloses: number[] = []; // depth markers for `}` that close razor blocks
  let i = 0;
  const identifier = (from: number): number => {
    let j = from;
    while (isWord(source[j])) j++;
    return j;
  };
  /** After an identifier: `.name`, `(…)`, `[…]`, `?.name`, `!` chains. */
  const expressionEnd = (from: number): number => {
    let j = from;
    for (;;) {
      if (source[j] === "(") j = balancedEnd(source, j, "(", ")");
      else if (source[j] === "[") j = balancedEnd(source, j, "[", "]");
      else if (source[j] === "." && isIdentStart(source[j + 1])) j = identifier(j + 1);
      else if (source[j] === "?" && source[j + 1] === "." && isIdentStart(source[j + 2]))
        j = identifier(j + 2);
      else if (source[j] === "!" && source[j + 1] !== "=") j++;
      else return j;
    }
  };
  while (i < source.length) {
    const c = source[i];
    if (c === "}" && blockCloses.length) {
      blockCloses.pop();
      let end = i + 1;
      // `} else {`, `} else if (…) {`
      let j = end;
      while (/\s/.test(source[j] ?? "")) j++;
      if (source.startsWith("else", j) && !isWord(source[j + 4])) {
        j += 4;
        while (/\s/.test(source[j] ?? "")) j++;
        if (source.startsWith("if", j) && !isWord(source[j + 2])) {
          j += 2;
          while (/\s/.test(source[j] ?? "")) j++;
          if (source[j] === "(") j = balancedEnd(source, j, "(", ")");
        }
        while (/\s/.test(source[j] ?? "")) j++;
        if (source[j] === "{") {
          end = j + 1;
          blockCloses.push(1);
        }
      }
      holes.push(blank(chars, i, end));
      i = end;
      continue;
    }
    if (c !== "@") {
      i++;
      continue;
    }
    const next = source[i + 1];
    if (next === "@") {
      holes.push(blank(chars, i, i + 2)); // a literal @
      i += 2;
      continue;
    }
    const prev = source[i - 1];
    if (isWord(prev) || prev === ".") {
      i++; // an email address, not an expression
      continue;
    }
    if (next === "*") {
      const close = source.indexOf("*@", i + 2);
      const end = close === -1 ? source.length : close + 2;
      holes.push(blank(chars, i, end));
      i = end;
      continue;
    }
    if (next === "{") {
      const end = balancedEnd(source, i + 1, "{", "}");
      holes.push(blank(chars, i, end));
      i = end;
      continue;
    }
    if (next === "(") {
      const end = balancedEnd(source, i + 1, "(", ")");
      holes.push(blank(chars, i, end));
      i = end;
      continue;
    }
    if (next === ":") {
      holes.push(blank(chars, i, i + 2));
      i += 2;
      continue;
    }
    if (!isIdentStart(next)) {
      i++;
      continue;
    }
    const wordEnd = identifier(i + 1);
    const word = source.slice(i + 1, wordEnd);
    const atLineStart = source.lastIndexOf("\n", i - 1) + 1 === i || i === 0;
    if (RAZOR_BLOCKS.has(word)) {
      let j = wordEnd;
      while (/[ \t]/.test(source[j] ?? "")) j++;
      if (source[j] === "(") j = balancedEnd(source, j, "(", ")");
      while (/\s/.test(source[j] ?? "")) j++;
      if (source[j] === "{") {
        holes.push(blank(chars, i, j + 1));
        blockCloses.push(1);
        i = j + 1;
      } else {
        holes.push(blank(chars, i, wordEnd));
        i = wordEnd;
      }
      continue;
    }
    if (atLineStart && RAZOR_LINE_DIRECTIVES.has(word)) {
      const lineEnd = source.indexOf("\n", i);
      const end = lineEnd === -1 ? source.length : lineEnd;
      holes.push(blank(chars, i, end));
      i = end;
      continue;
    }
    const end = expressionEnd(wordEnd);
    holes.push(blank(chars, i, end));
    i = end;
  }
  return holes;
};

/** Blade: `@directive(...)` and bare `@directive`, with the same email guard as Razor. */
const bladeDirectives: Scanner = (chars, source) => {
  const holes: Span[] = [];
  for (const match of source.matchAll(/@[A-Za-z_]\w*/g)) {
    const i = match.index;
    if (isWord(source[i - 1]) || source[i - 1] === ".") continue;
    let end = i + match[0].length;
    let j = end;
    while (/[ \t]/.test(source[j] ?? "")) j++;
    if (source[j] === "(") end = balancedEnd(source, j, "(", ")");
    holes.push(blank(chars, i, end));
  }
  return holes;
};

/** HEEx component (`<.button>`) and slot (`<:icon>`) tags become parseable element names, same length. */
const heexTags: Scanner = (chars, source) => {
  for (const match of source.matchAll(/<\/?([.:])(?=[A-Za-z_])/g)) {
    chars[match.index + match[0].length - 1] = "x";
  }
  return [];
};

/** Elixir source: everything is a hole except the inside of `~H` sigils, which is HEEx. */
const elixirSigils: Scanner = (chars, source) => {
  const holes: Span[] = [];
  let i = 0;
  const sigil = /~H(?:"""|'''|"|')/g;
  let match: RegExpExecArray | null;
  while ((match = sigil.exec(source))) {
    const open = match[0].slice(2);
    const close = open.length === 3 ? open : open;
    const start = match.index + match[0].length;
    const end = source.indexOf(close, start);
    const stop = end === -1 ? source.length : end;
    holes.push(blank(chars, i, start));
    // the sigil body is markup; run the HEEx scanners on it in place
    const inner = chars.slice(start, stop);
    const innerHoles = run(LANGUAGES["phoenix-heex"], inner);
    for (let k = 0; k < inner.length; k++) chars[start + k] = inner[k];
    for (const [a, b] of innerHoles) holes.push([start + a, start + b]);
    i = stop;
    sigil.lastIndex = stop;
  }
  holes.push(blank(chars, i, source.length));
  return holes.filter(([a, b]) => b > a);
};

const MUSTACHE: Scanner[] = [
  delimited("{{--", "--}}"),
  delimited("{{{", "}}}"),
  delimited("{{", "}}"),
  delimited("{!!", "!!}"),
  delimited("{%", "%}"),
  delimited("{#", "#}"),
];
const ASP: Scanner[] = [delimited("<%--", "--%>"), delimited("<%", "%>")];
const HEEX: Scanner[] = [heexTags, ...ASP, braces(false)];

/** VS Code language ids → scanners, in order. */
const LANGUAGES: Record<string, Scanner[]> = {
  astro: [frontmatter, braces(true)],
  svelte: [braces(false)],
  vue: MUSTACHE,
  razor: [razor],
  aspnetcorerazor: [razor],
  asp: ASP,
  aspx: ASP,
  erb: ASP,
  php: [delimited("<?", "?>")],
  "phoenix-heex": HEEX,
  "html-eex": HEEX,
  eex: HEEX,
  elixir: [elixirSigils],
  handlebars: MUSTACHE,
  mustache: MUSTACHE,
  twig: MUSTACHE,
  jinja: MUSTACHE,
  "jinja-html": MUSTACHE,
  nunjucks: MUSTACHE,
  liquid: MUSTACHE,
  "django-html": MUSTACHE,
  blade: [...MUSTACHE, bladeDirectives],
};

/** Language ids with template holes (plain `html` is not one). */
export const HOLE_LANGUAGES: readonly string[] = Object.keys(LANGUAGES);

function run(scanners: Scanner[], chars: string[]): Span[] {
  const holes: Span[] = [];
  for (const scanner of scanners) {
    // each scanner reads the buffer as masked so far, so a later pass never re-enters an earlier hole
    holes.push(...scanner(chars, chars.join("")));
  }
  return holes.sort((a, b) => a[0] - b[0]);
}

/** Masks a document's template holes for `languageId`; plain HTML passes through unchanged. */
export function maskTemplateHoles(text: string, languageId: string): MaskedText {
  const scanners = LANGUAGES[languageId];
  if (!scanners) return { text, holes: [] };
  // Code units, not code points: LSP offsets are UTF-16 indices.
  const chars = text.split("");
  const holes = run(scanners, chars);
  return { text: chars.join(""), holes };
}

/** Whether `[start, end)` touches any hole. */
export function overlapsHole(holes: readonly Span[], [start, end]: Span): boolean {
  return holes.some(([a, b]) => a < end && start < b);
}
