/**
 * The playground's kitchen-sink template: every primitive's main example (its
 * `<name>/<name>.html` fragment), one section each, in alphabetical order.
 * Built from the kit at build time, so a new primitive shows up on its own.
 * The page around the sections is `src/templates/kitchen-sink.html`; the
 * generated sections replace its `<!-- sections … -->` comment line.
 */
import shell from "../templates/kitchen-sink.html?raw";
import { primitiveNames } from "./api/primitives.ts";
import { readExample } from "./kit.ts";

/** The shell's placeholder line, indentation and all. */
const SECTIONS_MARKER = /^[ \t]*<!-- sections\b.*-->[ \t]*$/m;

const ACRONYMS: Record<string, string> = { otp: "OTP" };

/** A primitive's name as a sentence-case heading (`"alert-dialog"` → `"Alert dialog"`). */
export function primitiveLabel(name: string): string {
  if (ACRONYMS[name]) return ACRONYMS[name];
  const words = name.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const indent = (html: string, by: string): string =>
  html
    .trim()
    .split("\n")
    .map((line) => (line ? by + line : line))
    .join("\n");

export function kitchenSink(): string {
  const sections = primitiveNames()
    .sort()
    .flatMap((name) => {
      const example = readExample(`${name}/${name}`);
      if (example === null) return [];
      return `  <section id="${name}" style="--mt: 12; --pt: 12; --border-t: 1">
    <h2 data-ui="text-h6">${primitiveLabel(name)}</h2>
    <div style="--mt: 6; --display: flex; --flex-wrap: wrap; --gap: 6">
${indent(example, "      ")}
    </div>
  </section>`;
    });

  if (!SECTIONS_MARKER.test(shell)) {
    throw new Error("kitchenSink: src/templates/kitchen-sink.html lost its <!-- sections --> line");
  }
  return shell.replace(SECTIONS_MARKER, () => sections.join("\n"));
}
