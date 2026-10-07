/**
 * One primitive's API, assembled from the kit's own data: the manifest
 * (examples, dependencies, scripts), the editor language data (CSSDoc header,
 * identities, tag forms, hooks with defaults), the HTML custom data (presets,
 * slots, states, and config attributes with their values), and the script
 * headers (behavior prose and events). Nothing here is hand-maintained.
 */
import { PRIMITIVES } from "@zazz-ui/core/manifest.ts";
import htmlData from "@zazz-ui/core/editor/zazz.html-data.json";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json";
import { readKitFile } from "../kit.ts";

export type AttributeKind = "identity" | "tag" | "preset" | "slot" | "state" | "config";

export interface AttributeRow {
  name: string;
  kind: AttributeKind;
  values: string[];
  description: string;
}

export interface HookRow {
  name: string;
  value: string;
  /** The state suffix (`hover`), when the hook is a state hook. */
  state?: string;
}

export interface BehaviorDoc {
  /** `src/`-relative script path. */
  file: string;
  /** The header's prose, markdown-ish lines (paragraphs and `- ` bullets). */
  lines: string[];
}

export interface PrimitiveApi {
  name: string;
  summary: string;
  header: Record<string, string[]>;
  /** `data-ui` tokens this primitive owns. */
  identities: string[];
  /** Tag forms (`ui-tabs`). */
  tags: string[];
  attributes: AttributeRow[];
  hooks: HookRow[];
  /** Example ids (`button/button`) from the manifest. */
  examples: string[];
  /** Other primitives whose contract this one requires. */
  dependencies: string[];
  behavior: BehaviorDoc[];
  events: string[];
}

type Identities = Record<string, { primitive: string | null; file: string }>;
type Hooks = Record<string, { value: string; file: string }>;
type Primitives = Record<string, { summary: string; tags: Record<string, string[]> }>;
interface HtmlAttribute {
  name: string;
  description: string;
  values: { name: string }[];
}

const identities = languageData.identities as Identities;
const hooks = languageData.hooks as Hooks;
const primitives = languageData.primitives as Primitives;
const tags = languageData.tags as Record<string, string>;
const attributes = htmlData.globalAttributes as HtmlAttribute[];

/**
 * Prefixes a primitive's attributes and hooks are named with: its own name,
 * the identities it owns, and the short names a few scripts use (`password`
 * for password-group, `multiselect` for select). `PREFIX_OWNER` inverts it.
 */
const EXTRA_PREFIXES: Record<string, string[]> = {
  select: ["multiselect"],
  "password-group": ["password"],
};

function prefixesOf(name: string): string[] {
  const own = Object.entries(identities)
    .filter(([, v]) => v.primitive === name)
    .map(([id]) => id);
  return [...new Set([name, ...own, ...(EXTRA_PREFIXES[name] ?? [])])];
}

const PREFIX_OWNER = new Map<string, string>(
  Object.keys(PRIMITIVES).flatMap((name) => prefixesOf(name).map((p) => [p, name] as const)),
);

/** Every known prefix, so a shorter name never claims a longer one's attributes. */
const ALL_PREFIXES: string[] = [...PREFIX_OWNER.keys()];

/** The owner prefix of `data-<x>` or `data-<x>-<key>`: the longest known prefix it starts with. */
function ownerOf(attribute: string): string | undefined {
  return ALL_PREFIXES.filter(
    (p) => attribute === `data-${p}` || attribute.startsWith(`data-${p}-`),
  ).sort((a, b) => b.length - a.length)[0];
}

/** The prefix a `--ui-<x>-…` hook is named for: the longest known prefix it starts with. */
function hookOwnerOf(hook: string): string | undefined {
  return ALL_PREFIXES.filter((p) => hook.startsWith(`--ui-${p}-`)).sort(
    (a, b) => b.length - a.length,
  )[0];
}

function kindOf(a: HtmlAttribute): AttributeKind {
  if (a.name.endsWith("-slot")) return "slot";
  if (a.name.endsWith("-state")) return "state";
  if (a.description.startsWith("Preset") && a.values.length > 0) return "preset";
  return "config";
}

const KIND_DESCRIPTION: Record<AttributeKind, string> = {
  identity: "Identity token in data-ui.",
  tag: "Tag form; styled and, when scripted, registered under this name.",
  preset: "Preset: a named bundle of values.",
  slot: "Slot: a part inside the primitive.",
  state: "State the kit's script writes; read it in selectors, never author it.",
  config: "Configuration the kit's script reads.",
};

/** Strips a JSDoc block to prose lines: no tags, no `@example` block, no ` * ` gutters. */
export function headerProse(source: string): string[] {
  const match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return [];
  const lines = match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*? ?/, ""))
    .map((l) => l.replace(/^@fileoverview\s*/, "").replace(/^@description\s*/, ""));
  const out: string[] = [];
  for (const line of lines) {
    if (/^@example\b/.test(line)) break;
    if (/^@\w+/.test(line)) continue;
    out.push(line);
  }
  while (out.length && out[0].trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

export function primitiveNames(): string[] {
  return Object.keys(PRIMITIVES).filter((n) => n !== "utilities");
}

export function primitiveApi(name: string): PrimitiveApi {
  const entry = PRIMITIVES[name];
  if (!entry) throw new Error(`primitiveApi: unknown primitive "${name}"`);
  const prefixes = prefixesOf(name);
  const own = Object.entries(identities)
    .filter(([, v]) => v.primitive === name)
    .map(([id]) => id);
  const tagForms = Object.entries(tags)
    .filter(([, owner]) => owner === name)
    .map(([tag]) => tag);
  const header =
    Object.values(primitives).find((p) => p.summary.startsWith(`${name}.css`)) ??
    Object.entries(primitives).find(([file]) => file.startsWith(`primitives/${name}/`))?.[1];

  const rows: AttributeRow[] = [
    ...own.map((id) => ({
      name: `data-ui="${id}"`,
      kind: "identity" as const,
      values: [],
      description: KIND_DESCRIPTION.identity,
    })),
    ...tagForms.map((tag) => ({
      name: `<${tag}>`,
      kind: "tag" as const,
      values: [],
      description: KIND_DESCRIPTION.tag,
    })),
    ...attributes
      .filter((a) => prefixes.includes(ownerOf(a.name) ?? ""))
      .map((a) => {
        const kind = kindOf(a);
        return {
          name: a.name,
          kind,
          values: a.values.map((v) => v.name),
          description: KIND_DESCRIPTION[kind],
        };
      }),
  ];
  const order: AttributeKind[] = ["identity", "tag", "preset", "slot", "state", "config"];
  rows.sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name),
  );

  // A hook belongs to the primitive it is named for, wherever it is declared
  // (navigation-menu.css declares --ui-popover-*; button.css sizes --ui-kbd-*
  // for the kbd inside a button; _typography.css holds --ui-prose-*). A hook
  // with an unknown prefix (--ui-option-*) belongs to the file that declares it.
  const hookRows: HookRow[] = Object.entries(hooks)
    .filter(([hook, h]) => {
      const owner = hookOwnerOf(hook);
      if (owner !== undefined) return PREFIX_OWNER.get(owner) === name;
      return h.file.startsWith(`primitives/${name}/`);
    })
    .map(([hook, h]) => {
      const state = hook.match(/[a-z0-9]--([a-z][a-z-]*)$/)?.[1];
      return { name: hook, value: h.value, ...(state ? { state } : {}) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const scripts = entry.js.map((js) => js.replace(/\.js$/, ".ts"));
  const sources = scripts.map((file) => ({ file, text: readKitFile(file) ?? "" }));
  const behavior: BehaviorDoc[] = sources
    .map(({ file, text }) => ({ file, lines: headerProse(text) }))
    .filter((b) => b.lines.length > 0);
  const events = [
    ...new Set(
      sources.flatMap(({ text }) => [...text.matchAll(/"(zazz:[a-z-]+)"/g)].map((m) => m[1])),
    ),
  ].sort();

  return {
    name,
    summary: header?.summary ?? "",
    header: header?.tags ?? {},
    identities: own,
    tags: tagForms,
    attributes: rows,
    hooks: hookRows,
    examples: entry.examples.map((e) => e.replace(/^primitives\//, "").replace(/\.html$/, "")),
    dependencies: entry.primitives,
    behavior,
    events,
  };
}
