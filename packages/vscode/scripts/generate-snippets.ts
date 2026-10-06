/**
 * @fileoverview Generates `snippets/zazz.code-snippets`: one HTML snippet per
 * kit example fragment (`src/primitives/<name>/<file>.html`), prefixed
 * `zazz-<file>`. Each `id` becomes a tab stop, and every attribute that points
 * at it (`for`, `commandfor`, `popovertarget`, `aria-describedby`, `href="#…"`,
 * …) mirrors it, so renaming one id renames its references. The "page from a
 * primitive" template reuses these bodies.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json" with { type: "json" };
import { PRIMITIVES } from "@zazz-ui/core/manifest.ts";
import { escapeSnippet } from "../src/snippet.ts";

const SRC = dirname(fileURLToPath(import.meta.resolve("@zazz-ui/core/manifest.ts")));

export const SNIPPETS_PATH = fileURLToPath(
  new URL("../snippets/zazz.code-snippets", import.meta.url),
);

/** Attributes whose value is an id, or a space-separated list of ids. */
const REFERENCES = [
  "for",
  "commandfor",
  "popovertarget",
  "interestfor",
  "form",
  "list",
  "anchor",
  "aria-controls",
  "aria-describedby",
  "aria-labelledby",
  "aria-owns",
  "aria-activedescendant",
];

/** A fragment as a snippet body: escaped, ids as tab stops, references mirrored. */
export function snippetBody(html: string): string {
  const ids = [...new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!))];
  const stops = new Map(ids.map((id, i) => [id, i + 1]));
  let body = escapeSnippet(html.trimEnd());
  const stop = (id: string, first: boolean) => {
    const n = stops.get(id);
    return n === undefined ? escapeSnippet(id) : first ? `\${${n}:${escapeSnippet(id)}}` : `$${n}`;
  };
  const seen = new Set<string>();
  // ids first (each id's first appearance is its placeholder), then references
  body = body.replace(/(\sid=")([^"]+)(")/g, (_, open: string, id: string, close: string) => {
    const raw = id.replace(/\\(.)/g, "$1");
    const first = !seen.has(raw);
    seen.add(raw);
    return `${open}${stop(raw, first)}${close}`;
  });
  const references = new RegExp(`(\\s(?:${REFERENCES.join("|")})=")([^"]+)(")`, "g");
  body = body.replace(references, (_, open: string, value: string, close: string) => {
    const mirrored = value
      .split(/(\s+)/)
      .map((part) =>
        stops.has(part.replace(/\\(.)/g, "$1")) ? stop(part.replace(/\\(.)/g, "$1"), false) : part,
      )
      .join("");
    return `${open}${mirrored}${close}`;
  });
  body = body.replace(/(\shref="#)([^"]+)(")/g, (match, open: string, id: string, close: string) =>
    stops.has(id) ? `${open}${stop(id, false)}${close}` : match,
  );
  return body;
}

interface Snippet {
  prefix: string;
  body: string[];
  description: string;
}

export function generateSnippets(): Record<string, Snippet> {
  const snippets: Record<string, Snippet> = {};
  for (const [name, entry] of Object.entries(PRIMITIVES)) {
    const summary = languageData.primitives[`primitives/${name}/${name}.css` as never] as
      | { summary: string }
      | undefined;
    for (const example of entry.examples) {
      const file = example
        .split("/")
        .at(-1)!
        .replace(/\.html$/, "");
      const html = readFileSync(join(SRC, example), "utf8");
      snippets[`Zazz: ${file}`] = {
        prefix: `zazz-${file}`,
        body: snippetBody(html).split("\n"),
        description: summary?.summary ?? `Zazz ${name} example (${example}).`,
      };
    }
  }
  return snippets;
}

export function snippetsText(): string {
  return `${JSON.stringify(generateSnippets(), null, 2)}\n`;
}

if (import.meta.main) {
  writeFileSync(SNIPPETS_PATH, snippetsText());
  console.log("wrote snippets/zazz.code-snippets");
}
