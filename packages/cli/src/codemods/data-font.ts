"use strict";

/**
 * @fileoverview The `data-font` codemod's source transform.
 * @description Typography roles left `data-ui`: `data-ui="text-sm"` is
 * `data-font="sm"`, and `data-ui="text-link"` is the `link` identity. This
 * rewrites the attribute where it is written out in quotes with plain tokens
 * (in any markup, template, or string) and the quoted attribute selectors that
 * match it. Anything it cannot move safely it leaves as written and lists: two
 * roles on one element, a value with template syntax, an element that already
 * has `data-font`, a role set from script, and an unquoted selector. Pure text
 * in, text out; the command (`commands/codemod.ts`) owns the files.
 */

/** The roles that were `text-<role>` tokens; `text-link` is handled apart. */
export const ROLES = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "2xl",
  "xl",
  "lg",
  "md",
  "sm",
  "xs",
  "2xs",
  "eyebrow",
] as const;

const ROLE = ROLES.join("|");
const RETIRED = `text-(?:${ROLE}|link)`;
const ROLE_TOKEN = new RegExp(`^text-(${ROLE})$`);
/** A token the codemod may move: a plain word, no template syntax. */
const PLAIN = /^[\w-]+$/;
/** `data-ui="…"` in plain, single, or backslash-escaped quotes; not `x-data-ui` or `:data-ui`. */
const ATTRIBUTE = /(?<![\w:.@-])data-ui=(\\?["'])([^"'\\]*)\1/g;
/** `[data-ui~="text-sm"]`, with `=` or `~=`, in quotes. A bare value may sit inside a quoted string, so it is left. */
const SELECTOR = new RegExp(`\\[data-ui~?=(\\\\?["'])text-(${ROLE}|link)\\1\\]`, "g");
/**
 * Where a retired token is still set through `data-ui` after the rewrite: a
 * quoted value (any content), a `{…}` expression, `setAttribute("data-ui", …)`,
 * `dataset.ui = …`, and an attribute selector. Text that only mentions a token
 * is not one of these.
 */
const LEFTOVERS = [
  new RegExp(
    `(?<![\\w:.@-]|data-ui)[:@]?data-ui=(\\\\?["'])(?:(?!\\1)[\\s\\S]){0,400}?\\b${RETIRED}\\b`,
    "g",
  ),
  new RegExp(
    `(?<![\\w.@-])data-ui=\\{(?:(?!\\n\\s*[\\w:@.-]+=)[\\s\\S]){0,400}?\\b${RETIRED}\\b`,
    "g",
  ),
  new RegExp(`["'\`]data-ui["'\`]\\s*,[^\\n]{0,120}?\\b${RETIRED}\\b`, "g"),
  new RegExp(`\\bdataset\\.ui\\b[^\\n]{0,120}?\\b${RETIRED}\\b`, "g"),
  new RegExp(`\\[data-ui[~|^$*]?=[^\\]\\n]{0,80}?\\b${RETIRED}\\b`, "g"),
];

export interface Review {
  /** 1-based line in the rewritten source. */
  line: number;
  text: string;
}

export interface Rewrite {
  output: string;
  /** Attributes and selectors rewritten. */
  count: number;
  /** Lines that still carry a retired token and need a hand. */
  review: Review[];
}

/** True when the tag around `[start, end)` already carries a `data-font`. */
function tagHasFont(source: string, start: number, end: number): boolean {
  const open = source.lastIndexOf("<", start);
  const close = source.indexOf(">", end);
  const tag = source.slice(Math.max(open, start - 2000), close === -1 ? end + 2000 : close);
  return /(?<![\w:.@-])data-font=/.test(tag);
}

export function rewriteDataFont(source: string): Rewrite {
  let count = 0;
  const attributes = source.replace(
    ATTRIBUTE,
    (whole, quote: string, value: string, offset: number) => {
      const tokens = value.split(/\s+/).filter(Boolean);
      const roles = tokens.flatMap((token) => ROLE_TOKEN.exec(token)?.[1] ?? []);
      const link = tokens.includes("text-link");
      if (!roles.length && !link) return whole;
      // Left for the author: two roles (which one was winning?), template syntax
      // among the tokens (a role may be conditional), and an element that
      // already has a data-font.
      if (roles.length > 1 || !tokens.every((token) => PLAIN.test(token))) return whole;
      if (roles.length && tagHasFont(source, offset, offset + whole.length)) return whole;
      const rest = tokens
        .filter((token) => !ROLE_TOKEN.test(token))
        .map((token) => (token === "text-link" ? "link" : token));
      count += 1;
      return [
        ...(rest.length ? [`data-ui=${quote}${rest.join(" ")}${quote}`] : []),
        ...(roles.length ? [`data-font=${quote}${roles[0]}${quote}`] : []),
      ].join(" ");
    },
  );
  const output = attributes.replace(SELECTOR, (_whole, quote: string, role: string) => {
    count += 1;
    return role === "link"
      ? `[data-ui~=${quote}link${quote}]`
      : `[data-font=${quote}${role}${quote}]`;
  });
  const lines = output.split("\n");
  const flagged = new Set<number>();
  for (const pattern of LEFTOVERS) {
    for (const match of output.matchAll(pattern)) {
      flagged.add(output.slice(0, match.index).split("\n").length);
    }
  }
  const review = [...flagged]
    .sort((a, b) => a - b)
    .map((line) => ({ line, text: lines[line - 1]!.trim() }));
  return { output, count, review };
}

/** The primitives markup needs loaded for its roles, links, and prose, in a stable order. */
export function primitivesUsed(source: string): string[] {
  const identities = new Set(
    [...source.matchAll(ATTRIBUTE)].flatMap((match) => match[2]!.split(/\s+/)),
  );
  return [
    ...(/(?<![\w:.@-])data-font=/.test(source) ? ["font"] : []),
    ...(identities.has("link") ? ["link"] : []),
    ...(identities.has("prose") ? ["prose"] : []),
  ];
}
