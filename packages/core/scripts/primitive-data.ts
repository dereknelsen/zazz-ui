/**
 * @fileoverview `src/primitives/<name>/<name>.json`: one self-contained file per
 * primitive with its identities, tag forms, `--ui-*` hooks and their defaults,
 * `data-*` attributes, slots, states, dependencies, and files. Written by
 * `generate-editor-data.ts`, and kept fresh by its test.
 *
 * Nothing here is extracted a second time: each file is the primitive's share
 * of the editor data (`zazz.html-data.json`, `zazz.language-data.json`) plus its
 * manifest entry, so the per-primitive files can't disagree with the editor's.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UTILITIES } from "../src/base/utilities.ts";
import { PRIMITIVES } from "../src/manifest.ts";
import type { HtmlData } from "./generate-editor-data.ts";
import { ownerOf, type LanguageData } from "./language-data.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

export interface PrimitiveData {
  /** Manifest key: the directory under `src/primitives/`. */
  name: string;
  /** The stylesheet header's summary line; absent for a primitive without a stylesheet. */
  summary?: string;
  /** `data-ui` tokens the primitive styles. */
  identities: string[];
  /** Tag forms (`ui-card`). */
  tags: string[];
  /** Each `--ui-*` hook with its default value, under its CSS property category (`hookCategory`). */
  hooks: Record<string, Record<string, string>>;
  /** Presets and config attributes with their known values; empty = free text or boolean. */
  attributes: Record<string, string[]>;
  /** Slot attributes with the parts they name. */
  slots: Record<string, string[]>;
  /** State attributes with the tokens the primitive's script writes. */
  states: Record<string, string[]>;
  /** Other primitives this one needs loaded. */
  requires: string[];
  /** `src/`-relative files, as the manifest lists them; `base` holds the shared scripts its behavior needs. */
  files: { css: string[]; js: string[]; base: string[]; examples: string[] };
}

/** Page-level attributes: they configure the page or any element, not one primitive. */
const PAGE_ATTRIBUTE = /^data-(?:draggable$|navigation(?:-persist(?:-mode)?)?$|theme$|ui(?:-|$))/;

// --- Hook categories ---

/** The category for a hook that backs no utility and names no CSS property. */
const MISC = "Misc";

/** The property behind a utility that emits through a composite, so it lists none itself. */
const COMPOSITE_PROPERTIES: Record<string, string> = {
  border: "border",
  "ring-color": "box-shadow",
  shadow: "box-shadow",
};

/** The kit's own words for a property, where a hook backs no utility. */
const ENDING_PROPERTIES: Record<string, string> = {
  accent: "color",
  backing: "background-color",
  cols: "grid-template-columns",
  distance: "translate",
  duration: "transition-duration",
  ease: "transition-timing-function",
  "font-settings": "font-variation-settings",
  origin: "transform-origin",
  "scale-step": "scale",
  "snap-align": "scroll-snap-align",
  "stagger-step": "transition-delay",
  thickness: "block-size",
  "timing-function": "transition-timing-function",
  wait: "transition-delay",
};

/**
 * Hooks pinned to the category of the property they are applied to, where the
 * name does not say it: a utility's name on something else (reveal's grow and
 * shrink are scale factors), or a word of the primitive's own (the drawer's
 * lift is a translate).
 */
const HOOK_CATEGORIES: Record<string, string> = {
  "--ui-drawer-indent-offset": "Transforms & Animation",
  "--ui-drawer-stack-lift": "Transforms & Animation",
  "--ui-layout-available": "Box Model & Sizing",
  "--ui-layout-gutters": "Layout & Positioning",
  "--ui-prose-flow": "Layout & Positioning",
  "--ui-reveal-global-grow": "Transforms & Animation",
  "--ui-reveal-global-shrink": "Transforms & Animation",
  // the animation-range the fade plays over
  "--ui-scroll-fade-reveal": "Transforms & Animation",
  // a style-query switch that swaps the track's fill and rest colors
  "--ui-slider-fill-side": "Color & Backgrounds",
  "--ui-slider-thumb-offset": "Layout & Positioning",
  "--ui-tabs-underline-width": "Borders & Outlines",
};

/** Hook endings that name a part or a quantity, not the CSS property spelled the same (`offset` is motion path). */
const NOT_PROPERTIES = new Set(["offset"]);

/** Each CSS property's top-level category in `src/css-properties.json`, and the categories in file order. */
function propertyCategories(): { of: Map<string, string>; order: string[] } {
  const groups = JSON.parse(readFileSync(join(SRC, "css-properties.json"), "utf8")) as Record<
    string,
    Record<string, Record<string, string[]>>
  >;
  const of = new Map<string, string>();
  const order: string[] = [];
  for (const [category, sections] of Object.entries(groups)) {
    if (category.startsWith("$")) continue;
    order.push(category);
    for (const section of Object.values(sections))
      for (const properties of Object.values(section))
        for (const property of properties) of.set(property, category);
  }
  return { of, order };
}

const CATEGORIES = propertyCategories();
for (const [hook, category] of Object.entries(HOOK_CATEGORIES))
  if (!CATEGORIES.order.includes(category))
    throw new Error(`primitive data: ${hook} is pinned to an unknown category "${category}"`);
const UTILITY_PROPERTIES = new Map(
  UTILITIES.map((utility) => [
    utility.name,
    utility.properties[0] ?? COMPOSITE_PROPERTIES[utility.name],
  ]),
);

/**
 * The CSS property category of a hook (`--ui-card-header-w--hover` → sizing):
 * the longest ending of its name, after the primitive and before the state,
 * that is a utility, one of the kit's own words, or a CSS property.
 */
export function hookCategory(hook: string): string {
  const pinned = HOOK_CATEGORIES[hook];
  if (pinned) return pinned;
  const parts = hook
    .replace(/^--ui-/, "")
    .replace(/--[a-z-]+$/, "")
    .split("-");
  for (let start = 1; start < parts.length; start++) {
    const ending = parts.slice(start).join("-");
    const property =
      UTILITY_PROPERTIES.get(ending) ??
      ENDING_PROPERTIES[ending] ??
      (NOT_PROPERTIES.has(ending) ? undefined : ending);
    const category = property && CATEGORIES.of.get(property);
    if (category) return category;
  }
  return MISC;
}

/** `hooks` (name → default) under their categories, in `css-properties.json` order, `Misc` last. */
function groupHooks(hooks: Record<string, string>): PrimitiveData["hooks"] {
  const grouped: PrimitiveData["hooks"] = {};
  for (const category of [...CATEGORIES.order, MISC]) {
    const own = Object.entries(hooks).filter(([hook]) => hookCategory(hook) === category);
    if (own.length) grouped[category] = Object.fromEntries(own);
  }
  return grouped;
}

// --- Generate ---

/** Every manifest primitive's data, keyed by name, in name order. */
export function primitiveData(
  html: HtmlData,
  language: LanguageData,
): Record<string, PrimitiveData> {
  const blank = (name: string, summary?: string): PrimitiveData => ({
    name,
    ...(summary ? { summary } : {}),
    identities: [],
    tags: [],
    hooks: {},
    attributes: {},
    slots: {},
    states: {},
    requires: [],
    files: { css: [], js: [], base: [], examples: [] },
  });
  const data: Record<string, PrimitiveData> = {};
  for (const name of Object.keys(PRIMITIVES).sort()) {
    const entry = PRIMITIVES[name]!;
    const summary = entry.css.map((file) => language.primitives[file]?.summary).find(Boolean);
    data[name] = {
      ...blank(name, summary),
      requires: entry.primitives,
      files: { css: entry.css, js: entry.js, base: entry.base, examples: entry.examples },
    };
  }

  for (const [token, { primitive }] of Object.entries(language.identities)) {
    const owner = primitive ?? (PRIMITIVES[token] ? token : undefined);
    if (!owner) throw new Error(`primitive data: no primitive owns data-ui="${token}"`);
    data[owner]!.identities.push(token);
  }

  for (const { name } of html.tags) {
    const owner = language.tags[name] ?? ownerOf(name.replace(/^ui-/, ""), language);
    if (!owner) throw new Error(`primitive data: no primitive owns <${name}>`);
    data[owner]!.tags.push(name);
  }

  const hooks = new Map<string, Record<string, string>>();
  for (const [hook, { value, file }] of Object.entries(language.hooks)) {
    // a hook named for no primitive (--ui-option-*) belongs to the stylesheet declaring it
    const owner =
      ownerOf(hook.replace(/^--ui-/, ""), language) ?? /^primitives\/([^/]+)\//.exec(file)?.[1];
    if (!owner || !data[owner]) throw new Error(`primitive data: no primitive owns ${hook}`);
    hooks.set(owner, { ...hooks.get(owner), [hook]: value });
  }
  for (const [owner, own] of hooks) data[owner]!.hooks = groupHooks(own);

  for (const { name, values } of html.globalAttributes) {
    const owner = ownerOf(name.replace(/^data-/, ""), language);
    if (!owner) {
      if (PAGE_ATTRIBUTE.test(name)) continue;
      throw new Error(`primitive data: no primitive owns ${name}`);
    }
    const kind = name.endsWith("-slot")
      ? "slots"
      : name.endsWith("-state")
        ? "states"
        : "attributes";
    data[owner]![kind][name] = values.map((value) => value.name);
  }

  for (const primitive of Object.values(data)) {
    primitive.identities.sort();
    primitive.tags.sort();
  }
  return data;
}

/** The generated files, keyed by path relative to the package root. */
export function PRIMITIVE_FILES(data: Record<string, PrimitiveData>): Record<string, string> {
  return Object.fromEntries(
    Object.values(data).map((primitive) => [
      `src/primitives/${primitive.name}/${primitive.name}.json`,
      `${JSON.stringify(primitive, null, 2)}\n`,
    ]),
  );
}
