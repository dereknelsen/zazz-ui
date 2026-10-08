/**
 * The playground's kitchen-sink template: every primitive's main example (its
 * `<name>/<name>.html` fragment), one section each, in alphabetical order.
 * Built from the kit at build time, so a new primitive shows up on its own.
 */
import { primitiveNames } from "./api/primitives.ts";
import { readExample } from "./kit.ts";

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

  return `<main data-ui="layout" style="--py: 12">
  <hgroup>
    <p data-ui="text-eyebrow">Playground</p>
    <h1 data-ui="text-h4" style="--mt: 1">Kitchen sink</h1>
    <p style="--mt: 4; --max-w: var(--article-sm); --text: var(--color-muted-foreground)">
      Every primitive's main example, one per section, in alphabetical order.
    </p>
  </hgroup>
${sections.join("\n")}
</main>
`;
}
