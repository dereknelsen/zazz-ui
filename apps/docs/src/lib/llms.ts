/**
 * Markdown twins of the content pages for LLM consumers. Markdoc is a
 * Markdown superset, so a page's body is already Markdown apart from its tags;
 * each tag expands to the Markdown version of what the component renders
 * (a fenced fragment, a table, a blockquote) from the same kit data.
 */
import { buildHead } from "@zazz-ui/core/head.ts";
import { globalAttributes, switches, tokenGroup, typographyRoles } from "./api/foundations.ts";
import { primitiveApi } from "./api/primitives.ts";
import { utilityRows } from "./api/utilities.ts";
import { sectionById } from "./api/utility-sections.ts";
import { kitVersion, readExample } from "./kit.ts";

type Attrs = Record<string, string | boolean | number>;

/** Parses `key="value"`, `key=true`, `key=3` pairs from a tag's attribute text. */
export function parseAttrs(text: string): Attrs {
  const out: Attrs = {};
  for (const m of text.matchAll(
    /([a-zA-Z_][\w-]*)=(?:"([^"]*)"|(true|false)|(-?\d+(?:\.\d+)?))/g,
  )) {
    const [, key, str, bool, num] = m;
    out[key] = str !== undefined ? str : bool !== undefined ? bool === "true" : Number(num);
  }
  return out;
}

const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function table(columns: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.map(cell).join(" | ")} |`;
  return [line(columns), `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map(line)].join(
    "\n",
  );
}

const fence = (lang: string, code: string): string => `\`\`\`${lang}\n${code}\n\`\`\``;

function previewMarkdown(src: string): string {
  const html = readExample(src);
  return html === null ? `_Example \`${src}\` not found._` : fence("html", html);
}

function examplesMarkdown(name: string): string {
  const api = primitiveApi(name);
  return api.examples
    .map((id) => {
      const file = id.split("/")[1];
      const title = file === name ? "Default" : file.replace(`${name}-`, "").replace(/-/g, " ");
      return `### ${title.charAt(0).toUpperCase() + title.slice(1)}\n\n${previewMarkdown(id)}`;
    })
    .join("\n\n");
}

function attributesMarkdown(name: string): string {
  const api = primitiveApi(name);
  if (api.attributes.length === 0) {
    return "This primitive is a composition of other primitives and utilities; it has no presets, slots, or hooks of its own.";
  }
  const rows = api.attributes.map((a) => [
    `\`${a.name}\``,
    a.kind,
    a.values.length
      ? a.values.map((v) => `\`${v}\``).join(" ")
      : a.kind === "slot" || a.kind === "state"
        ? "—"
        : "free value",
  ]);
  const deps = api.dependencies.length ? `\n\nRequires: ${api.dependencies.join(", ")}.` : "";
  return table(["Attribute", "Kind", "Values"], rows) + deps;
}

function hooksMarkdown(name: string): string {
  const api = primitiveApi(name);
  if (api.hooks.length === 0) return "No hooks: this primitive has no stylesheet of its own.";
  return table(
    ["Hook", "Default", "State"],
    api.hooks.map((h) => [`\`${h.name}\``, `\`${h.value}\``, h.state ?? "—"]),
  );
}

function behaviorMarkdown(name: string): string {
  const api = primitiveApi(name);
  if (api.behavior.length === 0) return "No script: this primitive is CSS and markup only.";
  const docs = api.behavior.map(
    (b) => `\`${b.file.replace(/\.ts$/, ".js")}\`\n\n${b.lines.join("\n")}`,
  );
  const events = api.events.length
    ? `\n\nEvents: ${api.events.map((e) => `\`${e}\``).join(", ")}`
    : "";
  return docs.join("\n\n") + events;
}

function utilitiesMarkdown(sectionId: string): string {
  const section = sectionById(sectionId);
  if (!section) return `_Unknown utility section \`${sectionId}\`._`;
  const rows = utilityRows(section.utilities).map((r) => [
    `\`--${r.name}\``,
    `\`${r.properties}\``,
    r.value,
    r.tiers.join(", ") || "—",
    [
      r.keywords.length ? `keywords: ${r.keywords.map((k) => `\`${k}\``).join(", ")}` : "",
      r.tierOnly ? "works tier-only" : "",
      r.pseudo ? `\`--before-${r.name}\` / \`--after-${r.name}\`` : "",
    ]
      .filter(Boolean)
      .join("; "),
  ]);
  return table(["Utility", "Writes", "Value", "Tiers", "Notes"], rows);
}

function tokensMarkdown(groupId: string): string {
  const group = tokenGroup(groupId);
  if (!group) return `_Unknown token group \`${groupId}\`._`;
  const color = group.id.startsWith("color");
  return color
    ? table(
        ["Token", "Light", "Dark"],
        group.tokens.map((t) => [
          `\`${t.name}\``,
          `\`${t.light ?? t.value}\``,
          `\`${t.dark ?? t.value}\``,
        ]),
      )
    : table(
        ["Token", "Value"],
        group.tokens.map((t) => [
          `\`${t.name}\``,
          `\`${t.min && t.max && t.min !== t.max ? `${t.min} – ${t.max}` : t.value}\``,
        ]),
      );
}

function headMarkdown(attrs: Attrs): string {
  const list =
    typeof attrs.primitives === "string"
      ? attrs.primitives.split(/[\s,]+/).filter(Boolean)
      : undefined;
  const scripts = attrs.scripts !== false;
  const theme = attrs.theme !== false;
  const fontDisplay = attrs.fonts === false ? (false as const) : ("swap" as const);
  const head =
    attrs.mode === "cdn"
      ? buildHead({
          cdn: { version: kitVersion(), ...(list ? { primitives: list } : {}) },
          scripts,
          theme,
          fontDisplay,
        })
      : buildHead({ scripts, theme, fontDisplay, ...(list ? { primitives: list } : {}) });
  return fence("html", head);
}

/** Expands one self-closing tag to Markdown. Unknown tags become an HTML comment. */
export function expandTag(name: string, attrs: Attrs): string {
  const str = (key: string) => (typeof attrs[key] === "string" ? (attrs[key] as string) : "");
  switch (name) {
    case "preview":
      return previewMarkdown(str("src"));
    case "examples":
      return examplesMarkdown(str("primitive"));
    case "attributes":
      return attributesMarkdown(str("primitive"));
    case "hooks":
      return hooksMarkdown(str("primitive"));
    case "behavior":
      return behaviorMarkdown(str("primitive"));
    case "utilities":
      return utilitiesMarkdown(str("section"));
    case "tokens":
      return tokensMarkdown(str("group"));
    case "head":
      return headMarkdown(attrs);
    case "switches":
      return table(
        ["Token", "Effect"],
        switches().map((s) => [s.tokens.map((t) => `\`data-ui="${t}"\``).join(" "), s.description]),
      );
    case "roles":
      return typographyRoles()
        .map((r) => `- \`${r}\``)
        .join("\n");
    case "globals":
      return table(
        ["Attribute", "Values", "What it does"],
        globalAttributes().map((a) => [
          `\`${a.name}\``,
          a.values.map((v) => `\`${v}\``).join(" ") || "free value",
          a.description,
        ]),
      );
    default:
      return `<!-- ${name} -->`;
  }
}

/** Converts a Markdoc body to plain Markdown: tags expanded, everything else as written. */
export function toMarkdown(body: string): string {
  // Block tags with content: only callout is used; it becomes a blockquote.
  const ATTRS = String.raw`((?:"[^"]*"|[^%"])*?)`; // attribute text; a % inside quotes is fine
  let out = body.replace(
    new RegExp(String.raw`\{%\s*callout${ATTRS}%\}([\s\S]*?)\{%\s*\/callout\s*%\}`, "g"),
    (_, attrText: string, inner: string) => {
      const attrs = parseAttrs(attrText);
      const title =
        typeof attrs.title === "string"
          ? attrs.title
          : typeof attrs.type === "string"
            ? attrs.type[0].toUpperCase() + attrs.type.slice(1)
            : "Note";
      const lines = inner
        .trim()
        .split("\n")
        .map((l) => `> ${l}`.trimEnd());
      return [`> **${title}**`, ">", ...lines].join("\n");
    },
  );
  // Self-closing tags.
  out = out.replace(
    new RegExp(String.raw`\{%\s*([a-z-]+)${ATTRS}\/%\}`, "g"),
    (_, name: string, attrText: string) => expandTag(name, parseAttrs(attrText)),
  );
  return out.trim() + "\n";
}

export interface PageForLlm {
  title: string;
  description?: string;
  section: string;
  url: string;
  body: string;
}

/** One page as a Markdown document with a title block. */
export function pageMarkdown(page: PageForLlm, siteUrl = ""): string {
  const head = [
    `# ${page.title}`,
    page.description ? `\n${page.description}` : "",
    `\nSource: ${siteUrl}${page.url}`,
  ].join("\n");
  return `${head}\n\n${toMarkdown(page.body)}`;
}

/** The `/llms.txt` index: orientation plus every page as a Markdown link. */
export function llmsIndex(pages: PageForLlm[], siteUrl: string): string {
  const groups = new Map<string, PageForLlm[]>();
  for (const p of pages) groups.set(p.section, [...(groups.get(p.section) ?? []), p]);
  const lines = [
    "# Zazz",
    "",
    "> Zazz is a UI kit for plain HTML (version " +
      kitVersion() +
      ", alpha). Markup has no classes: an identity in `data-ui`, presets in `data-<primitive>-*`, and style utilities as custom properties in `style` (`--px: 6; --w--md: fit-content`). Hooks (`--ui-<primitive>-*`) theme primitives; design tokens on `:root` theme everything.",
    "",
    'Read `AUTHORING.md` (ships in `@zazz-ui/core`) before writing markup. Copy a primitive\'s anatomy from its API page; never reconstruct one from memory. Never use 0.4 syntax (`class="ui-button"`, `data-variant`, utility classes).',
    "",
    `Full text of every page: ${siteUrl}/llms-full.txt`,
    "",
  ];
  for (const [section, items] of groups) {
    lines.push(`## ${section}`, "");
    for (const p of items)
      lines.push(
        `- [${p.title}](${siteUrl}${p.url}index.md)${p.description ? `: ${p.description}` : ""}`,
      );
    lines.push("");
  }
  return lines.join("\n");
}
