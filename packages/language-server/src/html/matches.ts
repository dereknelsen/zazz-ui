/**
 * @fileoverview `Element.matches` for html-eslint tags, over the grammar the
 * audit's selectors use (the rules the generator derives from the kit's
 * stylesheets): type and universal selectors,
 * `[attr]`, attribute values (`=`, `~=`, `|=`, `^=`, `$=`, `*=`), `:is()`, `:not()`, a relative
 * `:has()`, selector lists, and the descendant, child, and sibling combinators.
 * Anything else throws, and tests compile every selector the audit reads, so a
 * new one outside the grammar fails there. One difference from the DOM:
 * html-eslint nests a `<template>`'s content under it, so a descendant
 * combinator can match through a `<template>`, and a top-level element of a
 * fragment has no parent, so a sibling combinator never reaches its siblings.
 */

import { isTag, valueOf, type Tag } from "./nodes.ts";

type Test = (tag: Tag) => boolean;
type Combinator = " " | ">" | "+" | "~";

/** A complex selector: its compounds left to right, and the combinator before each (none before the first). */
interface Complex {
  compounds: Test[];
  combinators: Combinator[];
}

const COMBINATORS = new Set<string>([">", "+", "~"]);

const cache = new Map<string, Test>();

/** True when `tag` matches `selector`. */
export function matches(tag: Tag, selector: string): boolean {
  let test = cache.get(selector);
  if (!test) {
    test = compileSelector(selector);
    cache.set(selector, test);
  }
  return test(tag);
}

/** Compiles a selector list; throws on syntax outside the grammar. */
export function compileSelector(selector: string): Test {
  const tests = splitTopLevel(selector, ",").map((complex) => complexTest(parseComplex(complex)));
  return (tag) => tests.some((test) => test(tag));
}

function unsupported(selector: string): Error {
  return new Error(`unsupported selector syntax: ${selector}`);
}

/**
 * Splits on any of `separators` outside brackets, parentheses, and quotes;
 * a separator in `kept` is also returned as a token of its own.
 */
function splitTopLevel(text: string, separators: string, kept = ""): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (separators.includes(char) && depth === 0) {
      parts.push(text.slice(start, i));
      if (kept.includes(char)) parts.push(char);
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim());
}

/**
 * A complex selector's compounds and combinators. With `relative` (a `:has()`
 * argument) it may lead with a combinator, returned as `leading`.
 */
function parseComplex(text: string, relative = false): Complex & { leading?: Combinator } {
  // tokens are compounds and combinators; whitespace between two compounds is the descendant combinator
  const tokens = splitTopLevel(text, " \t\n\r\f>+~", ">+~").filter(Boolean);
  const complex: Complex & { leading?: Combinator } = { compounds: [], combinators: [] };
  let combinator: Combinator | undefined;
  for (const token of tokens) {
    if (COMBINATORS.has(token)) {
      if (combinator && combinator !== " ") throw unsupported(text);
      combinator = token as Combinator;
    } else {
      if (complex.compounds.length) complex.combinators.push(combinator ?? " ");
      else if (combinator) {
        if (!relative) throw unsupported(text);
        complex.leading = combinator;
      }
      complex.compounds.push(compoundTest(token));
      combinator = " ";
    }
  }
  if (!complex.compounds.length || (combinator && combinator !== " ")) throw unsupported(text);
  return complex;
}

/**
 * Matches the last compound on `tag`, then each compound to its left on the
 * element its combinator reaches. Inside `:has()`, `scope` is the subject: the
 * walk never leaves it, and the leftmost compound must relate to it by `leading`.
 */
function complexTest(
  { compounds, combinators }: Complex,
  scope?: { tag: Tag; leading: " " | ">" },
): Test {
  const inScope = (node: Tag) => !scope || isWithin(node, scope.tag);
  const from = (tag: Tag, i: number): boolean => {
    if (!inScope(tag) || !compounds[i]!(tag)) return false;
    if (i === 0) return !scope || relates(scope.tag, tag, scope.leading);
    const combinator = combinators[i - 1]!;
    for (const node of reach(tag, combinator)) {
      if (from(node, i - 1)) return true;
    }
    return false;
  };
  return (tag) => from(tag, compounds.length - 1);
}

/** The elements a combinator reaches leftward from `tag`, nearest first. */
function reach(tag: Tag, combinator: Combinator): Tag[] {
  if (combinator === ">") return [parentTag(tag)].filter((node): node is Tag => !!node);
  if (combinator === " ") {
    const ancestors: Tag[] = [];
    for (let node = parentTag(tag); node; node = parentTag(node)) ancestors.push(node);
    return ancestors;
  }
  const before = siblingTags(tag);
  const previous = before.slice(0, before.indexOf(tag)).reverse();
  return combinator === "+" ? previous.slice(0, 1) : previous;
}

/** True when `node` sits below `anchor` as `combinator` says. */
function relates(anchor: Tag, node: Tag, combinator: " " | ">"): boolean {
  return combinator === ">" ? parentTag(node) === anchor : isWithin(node, anchor);
}

/** True when `node` is a proper descendant of `ancestor`. */
function isWithin(node: Tag, ancestor: Tag): boolean {
  for (let parent = parentTag(node); parent; parent = parentTag(parent)) {
    if (parent === ancestor) return true;
  }
  return false;
}

function parentTag(tag: Tag): Tag | undefined {
  const parent = tag.parent;
  return isTag(parent) ? parent : undefined;
}

/** `tag` and its element siblings in order (just `tag` at the top level, which has no parent). */
function siblingTags(tag: Tag): Tag[] {
  const parent = parentTag(tag);
  return parent ? (parent.children ?? []).filter(isTag) : [tag];
}

/** Every element below `tag`, in document order. */
function descendantTags(tag: Tag): Tag[] {
  return (tag.children ?? []).filter(isTag).flatMap((child) => [child, ...descendantTags(child)]);
}

/**
 * A relative selector list (`:has()`'s argument): true when a descendant of
 * `tag` matches it, anchored to `tag` by its leading `>` or descendant
 * combinator. A leading `+` or `~` is outside the grammar.
 */
function hasTest(list: string): Test {
  const complexes = splitTopLevel(list, ",").map((item) => {
    const complex = parseComplex(item, true);
    const leading = complex.leading ?? " ";
    if (leading !== " " && leading !== ">") throw unsupported(list);
    return { complex, leading };
  });
  return (tag) =>
    complexes.some(({ complex, leading }) =>
      descendantTags(tag).some(complexTest(complex, { tag, leading })),
    );
}

/** HTML whitespace (not `\s`, which also takes NBSP). */
const WHITESPACE = /[ \t\n\f\r]+/;
const ATTRIBUTE = /^\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))\s*)?\]$/;

/** A compound's next part: universal, type, attribute, or a functional pseudo-class with its argument. */
function nextPart(text: string): string | undefined {
  const simple = /^(?:\*|[a-zA-Z][\w-]*|\[[^\]]*\])/.exec(text)?.[0];
  if (simple) return simple;
  const functional = /^:(?:is|not|has)\(/.exec(text)?.[0];
  if (!functional) return undefined;
  let depth = 0;
  let end = functional.length - 1;
  do {
    if (text[end] === "(") depth++;
    else if (text[end] === ")") depth--;
    end++;
  } while (depth && end < text.length);
  return depth ? undefined : text.slice(0, end);
}

function compoundTest(text: string): Test {
  const tests: Test[] = [];
  let rest = text;
  while (rest) {
    const part = nextPart(rest);
    if (!part) throw unsupported(text);
    rest = rest.slice(part.length);
    if (part === "*") continue;
    if (part.startsWith(":is(")) tests.push(compileSelector(part.slice(4, -1)));
    else if (part.startsWith(":not(")) {
      const inner = compileSelector(part.slice(5, -1));
      tests.push((tag) => !inner(tag));
    } else if (part.startsWith(":has(")) tests.push(hasTest(part.slice(5, -1)));
    else if (part.startsWith("[")) {
      const match = ATTRIBUTE.exec(part);
      if (!match) throw unsupported(text);
      const [, name, operator, ...values] = match;
      const expected = values.find((value) => value !== undefined) ?? "";
      tests.push((tag) => {
        const value = valueOf(tag, name!.toLowerCase());
        if (value === null) return false;
        if (!operator) return true;
        if (operator === "=") return value === expected;
        if (operator === "|=") return value === expected || value.startsWith(`${expected}-`);
        // the substring operators never match an empty string
        if (operator === "^=") return !!expected && value.startsWith(expected);
        if (operator === "$=") return !!expected && value.endsWith(expected);
        if (operator === "*=") return !!expected && value.includes(expected);
        // `~=` never matches an empty word or one holding whitespace
        return (
          !!expected && !WHITESPACE.test(expected) && value.split(WHITESPACE).includes(expected)
        );
      });
    } else {
      const name = part.toLowerCase();
      tests.push((tag) => tag.name.toLowerCase() === name);
    }
  }
  return (tag) => tests.every((test) => test(tag));
}
