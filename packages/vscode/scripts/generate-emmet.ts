/**
 * @fileoverview Generates `emmet/snippets.json`: an Emmet abbreviation per
 * `data-ui` identity, `ui-<identity>` → the element the kit's own fragments put
 * it on (`ui-dialog` → `dialog[data-ui=dialog]`), so `ui-card>h2` builds Zazz
 * markup. The repo points `emmet.extensionsPath` here. Identities with a tag
 * form (`<ui-carousel>`) keep Emmet's default, which already writes the tag.
 * HTML only: Emmet's stylesheet expansion appends `px` to numbers (`4px`),
 * which reads as a length, not a scale step, on a utility.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json" with { type: "json" };

const PRIMITIVES_DIR = join(
  dirname(fileURLToPath(import.meta.resolve("@zazz-ui/core/manifest"))),
  "primitives",
);

export const EMMET_PATH = fileURLToPath(new URL("../emmet/snippets.json", import.meta.url));

/** The element each identity appears on most in the kit's fragments (the first, on a tie). */
function elementsByIdentity(): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const dir of readdirSync(PRIMITIVES_DIR).sort()) {
    const files = readdirSync(join(PRIMITIVES_DIR, dir)).filter((file) => file.endsWith(".html"));
    for (const file of files.sort()) {
      const html = readFileSync(join(PRIMITIVES_DIR, dir, file), "utf8");
      for (const m of html.matchAll(/<([a-z][\w-]*)\b[^>]*?\sdata-ui="([^"]+)"/g)) {
        for (const token of m[2]!.split(/\s+/)) {
          const elements = counts.get(token) ?? new Map<string, number>();
          elements.set(m[1]!, (elements.get(m[1]!) ?? 0) + 1);
          counts.set(token, elements);
        }
      }
    }
  }
  const found = new Map<string, string>();
  for (const [token, elements] of counts) {
    const [element] = [...elements].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    found.set(token, element);
  }
  return found;
}

export function generateEmmet(): object {
  const elements = elementsByIdentity();
  const tags = new Set(Object.keys(languageData.tags));
  const snippets: Record<string, string> = {};
  for (const identity of Object.keys(languageData.identities).sort()) {
    if (tags.has(`ui-${identity}`)) continue;
    const element = elements.get(identity) ?? (identity.startsWith("text-") ? "p" : "div");
    const extra = element === "button" ? " type=button" : "";
    snippets[`ui-${identity}`] = `${element}[data-ui=${identity}${extra}]`;
  }
  return { html: { snippets } };
}

export function emmetText(): string {
  return `${JSON.stringify(generateEmmet(), null, 2)}\n`;
}

if (import.meta.main) {
  writeFileSync(EMMET_PATH, emmetText());
  console.log("wrote emmet/snippets.json");
}
