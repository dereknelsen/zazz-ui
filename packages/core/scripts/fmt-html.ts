/**
 * @fileoverview Formats HTML for the Zazz utilities syntax: oxfmt, then one style
 * utility per line.
 * @description oxfmt keeps `style=""` values verbatim for HTML (the root
 * `vite.config.ts` sets `embeddedLanguageFormatting: "off"` for `**\/*.html`),
 * so this script owns their layout: a style with two or more declarations gets
 * one declaration per line, and every declaration is normalized to
 * `name: value` (the kit's `[style*="--px:"]` gates need the colon right after
 * the name and a space after it). A single declaration stays on one line.
 *
 * Usage (from the repo root):
 *   node packages/core/scripts/fmt-html.ts            # every tracked + untracked .html
 *   node packages/core/scripts/fmt-html.ts a.html b.html
 *   node packages/core/scripts/fmt-html.ts --check    # exit 1 when anything would change
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// --- Declarations ---

/** Splits a style value on top-level `;`, ignoring ones inside parentheses or quotes. */
function splitDeclarations(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Collapses whitespace runs to one space, outside quotes. */
function collapse(text: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) out += text[++i];
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (/\s/.test(ch)) {
      if (!out.endsWith(" ")) out += " ";
    } else out += ch;
  }
  return out.trim();
}

/** `--px :6` → `--px: 6`. A declaration without a colon is kept as written. */
function normalize(declaration: string): string {
  const colon = declaration.indexOf(":");
  if (colon === -1) return collapse(declaration);
  return `${declaration.slice(0, colon).trim()}: ${collapse(declaration.slice(colon + 1))}`;
}

// --- Tags ---

const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

/** The leading whitespace of the line containing `index`. */
function lineIndent(html: string, index: number): { indent: string; ownLine: boolean } {
  const start = html.lastIndexOf("\n", index - 1) + 1;
  const prefix = html.slice(start, index);
  const indent = /^[ \t]*/.exec(prefix)![0];
  return { indent, ownLine: prefix.trim() === "" };
}

/** Rewrites one `style="…"` value; `at` is the index of the attribute name. */
function formatStyle(html: string, at: number, value: string): string {
  const declarations = splitDeclarations(value).map(normalize);
  if (declarations.length === 0) return value;
  if (declarations.length === 1) return declarations[0]!;
  const { indent, ownLine } = lineIndent(html, at);
  const attrIndent = ownLine ? indent : `${indent}  `;
  const inner = `${attrIndent}  `;
  return `\n${declarations.map((d) => `${inner}${d};`).join("\n")}\n${attrIndent}`;
}

/**
 * Expands every multi-declaration `style` attribute in `html` to one
 * declaration per line. Comments and raw-text element contents are untouched.
 */
export function expandStyles(html: string): string {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      const stop = end === -1 ? html.length : end + 3;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }
    const name = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!name) {
      out += "<";
      i = lt + 1;
      continue;
    }
    // Scan the tag to its closing `>`, rewriting a style attribute on the way.
    let j = lt + name[0].length;
    let tag = name[0];
    while (j < html.length && html[j] !== ">") {
      const attr = /^\s+([^\s=>/"']+)(\s*=\s*)?/.exec(html.slice(j));
      if (!attr) {
        tag += html[j];
        j++;
        continue;
      }
      tag += attr[0];
      j += attr[0].length;
      if (!attr[2]) continue;
      const q = html[j];
      if (q === '"' || q === "'") {
        const end = html.indexOf(q, j + 1);
        if (end === -1) break;
        const value = html.slice(j + 1, end);
        // the attribute name's index in the output so far, for its line's indent
        const head = out + tag;
        const at = head.length - attr[0].length + attr[0].search(/\S/);
        const styled = attr[1]!.toLowerCase() === "style" ? formatStyle(head, at, value) : value;
        tag += `${q}${styled}${q}`;
        j = end + 1;
      } else {
        const bare = /^[^\s>]*/.exec(html.slice(j))![0];
        tag += bare;
        j += bare.length;
      }
    }
    if (j < html.length) {
      tag += ">";
      j++;
    }
    out += tag;
    i = j;
    // Raw-text elements: copy their contents through untouched.
    const tagName = name[1]!.toLowerCase();
    if (RAW_TEXT.has(tagName)) {
      const close = html.toLowerCase().indexOf(`</${tagName}`, i);
      const stop = close === -1 ? html.length : close;
      out += html.slice(i, stop);
      i = stop;
    }
  }
  return out;
}

// --- CLI ---

function htmlFiles(args: string[]): string[] {
  const files = args.filter((arg) => !arg.startsWith("--"));
  if (files.length) return files.filter((file) => file.endsWith(".html"));
  const listed = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "--", "*.html"], {
    encoding: "utf8",
  });
  // ls-files also lists tracked files deleted in the working tree
  return listed.split("\n").filter((file) => file && existsSync(file));
}

function oxfmt(files: string[], check: boolean): boolean {
  if (!files.length) return true;
  const result = spawnSync("vp", ["fmt", ...(check ? ["--check"] : []), ...files], {
    stdio: check ? "pipe" : "inherit",
  });
  return result.status === 0;
}

function main(args: string[]): number {
  const check = args.includes("--check");
  const files = htmlFiles(args);
  if (check) {
    const unexpanded = files.filter((file) => {
      const text = readFileSync(file, "utf8");
      return expandStyles(text) !== text;
    });
    for (const file of unexpanded) console.error(`style utilities not one per line: ${file}`);
    const formatted = oxfmt(files, true);
    if (!formatted) console.error("oxfmt: some HTML files are not formatted (run fmt-html.ts)");
    return unexpanded.length || !formatted ? 1 : 0;
  }
  oxfmt(files, false);
  // oxfmt can move an element after its style is expanded (a tag that now
  // breaks across lines), which shifts the indent; repeat until both agree.
  let pending = files;
  for (let pass = 0; pass < 3 && pending.length; pass++) {
    pending = pending.filter((file) => {
      const text = readFileSync(file, "utf8");
      const expanded = expandStyles(text);
      if (expanded === text) return false;
      writeFileSync(file, expanded);
      return true;
    });
    oxfmt(pending, false);
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
