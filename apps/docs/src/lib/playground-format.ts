/**
 * The editor-side Zazz tooling for the playground: the same style formatter
 * and audit the VS Code extension and `eslint --fix` run, as plain edits and
 * findings over a document string. Monaco-agnostic, so it is unit-tested here
 * and adapted to Monaco's shapes in `scripts/playground.ts`.
 */
import { diagnose } from "@zazz-ui/language-server/diagnostics";
import { styleEdits } from "@zazz-ui/language-server/format";
import { parseHtml } from "@zazz-ui/language-server/html";

export interface TextEdit {
  range: [number, number];
  newText: string;
}

export interface Finding {
  range: [number, number];
  message: string;
  rule: string;
  severity: "warning" | "info";
}

/** Edits that put every `style` attribute in cascade order, one utility per line. */
export function formatEdits(text: string): TextEdit[] {
  return styleEdits(parseHtml(text));
}

/** The `<ui-debug>` audit over the document. */
export function findings(text: string): Finding[] {
  return diagnose(parseHtml(text)).map((found) => ({
    range: found.range,
    message: found.message,
    rule: found.rule,
    severity: found.severity === "info" ? "info" : "warning",
  }));
}

/** Applies edits to `text` (edits never overlap). */
export function applyEdits(text: string, edits: readonly TextEdit[]): string {
  let out = text;
  for (const edit of [...edits].sort((a, b) => b.range[0] - a.range[0])) {
    out = out.slice(0, edit.range[0]) + edit.newText + out.slice(edit.range[1]);
  }
  return out;
}
