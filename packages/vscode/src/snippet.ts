/**
 * @fileoverview Snippet text helpers shared by the snippet generator and the
 * page templates.
 */

/** Escapes text for a snippet body (`$`, `}` and `\` are syntax). */
export function escapeSnippet(text: string): string {
  return text.replace(/[\\$}]/g, "\\$&");
}

/** Indents every non-empty line of `text`. */
export function indent(text: string, by: string): string {
  return text
    .split("\n")
    .map((line) => (line ? by + line : line))
    .join("\n");
}

/** Renumbers a snippet's tab stops (`$1`, `${1:x}`) by `by`, leaving `$0` and escaped `\$` alone. */
export function shiftTabStops(snippet: string, by: number): string {
  return snippet.replace(/(?<!\\)\$(\{)?(\d+)/g, (match, brace: string | undefined, n: string) =>
    n === "0" ? match : `$${brace ?? ""}${Number(n) + by}`,
  );
}
