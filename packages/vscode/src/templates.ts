/**
 * @fileoverview Page templates as snippet text: a blank page, a page around a
 * primitive's example, a swap-navigation page, and a new primitive fragment.
 * Pages get a `<!-- zazz:head -->` block that lists their primitives, so
 * completing another identity adds it to the head (auto-import).
 */

import { buildHead, headMarker, type HeadOptions } from "@zazz-ui/core/head.ts";
import { escapeSnippet, indent, shiftTabStops } from "./snippet.ts";

export type TemplateKind = "blank" | "primitive" | "swap" | "fragment";

export const TEMPLATES: { kind: TemplateKind; label: string; detail: string }[] = [
  { kind: "blank", label: "Blank page", detail: "A page with a Zazz head and a layout" },
  {
    kind: "primitive",
    label: "Page from a primitive",
    detail: "A page around a primitive's example",
  },
  {
    kind: "swap",
    label: "Swap-navigation page",
    detail: "In-page navigation with a persisted header and toaster",
  },
  {
    kind: "fragment",
    label: "Primitive fragment",
    detail: "A new src/primitives/<name>/<name>.html example",
  },
];

interface PageOptions {
  /** URL prefix to the kit's `src/` contents (`buildHead`'s `base`). */
  base: string;
  primitives: string[];
  /** Snippet text for the inside of `<main>`; `$0` when absent. */
  body?: string;
  swap?: boolean;
}

/** A whole page as snippet text. */
export function pageSnippet({ base, primitives, body, swap }: PageOptions): string {
  const options: HeadOptions = { base, primitives };
  const head = escapeSnippet(`${headMarker(options)}\n${buildHead(options)}\n<!-- /zazz:head -->`);
  // the page's own stops are $1 (title) and $2 (nav); the body's follow them
  const main = body === undefined ? "$0" : shiftTabStops(body, 2);
  const content = swap
    ? [
        `<header data-ui-persist="header" style="--py: 4">`,
        `  <nav><a href="./">\${2:Home}</a></nav>`,
        `</header>`,
        `<main data-ui="layout">`,
        indent(main, "  "),
        `</main>`,
        `<ui-toaster data-ui-persist="toaster"></ui-toaster>`,
      ].join("\n")
    : [`<main data-ui="layout">`, indent(main, "  "), `</main>`].join("\n");
  return [
    "<!doctype html>",
    `<html lang="en"${swap ? ` data-ui-navigation="swap"` : ""}>`,
    "  <head>",
    indent(head, "    "),
    "    <title>${1:Page}</title>",
    "  </head>",
    "  <body>",
    indent(content, "    "),
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

/** The primitives each page template starts with. */
export function templatePrimitives(kind: TemplateKind, primitive?: string): string[] {
  if (kind === "swap") return ["layout", "toaster"];
  if (kind === "primitive" && primitive) return [...new Set(["layout", primitive])].sort();
  return ["layout"];
}

/** A new primitive fragment: the identity on a root element, as snippet text. */
export function fragmentSnippet(name: string): string {
  return `<div data-ui="${escapeSnippet(name)}">\n  $0\n</div>\n`;
}

/** Kebab-case, as primitive directories are named. */
export function isPrimitiveName(name: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name);
}
