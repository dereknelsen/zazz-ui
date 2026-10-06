/**
 * @fileoverview Generates the VS Code custom-data files:
 * `editor/zazz.html-data.json` (every `data-ui` token, every `data-<name>-<key>`
 * attribute with its values, the tag forms) and `editor/zazz.css-data.json`
 * (every utility and tier form, the pseudo forms, the `--ui-*` hooks), and
 * `editor/zazz.lint-data.json` (the identities and state hooks the html lint
 * rules read where `<ui-debug>` reads the page's stylesheets).
 * Sources: `src/base/utilities.ts`, `src/manifest.ts`, and the kit's own
 * stylesheets, fragments, and scripts. Run: `vp run generate` (also writes the
 * utilities); the freshness test pins the committed files to this generator.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BREAKPOINTS,
  DISPLAY_SHORTHANDS,
  hasGroup,
  isState,
  UTILITIES,
  PSEUDO_SIDES,
  STUCK_STATE,
  tiersOf,
  type Utility,
} from "../src/base/utilities.ts";
import { PRIMITIVES } from "../src/manifest.ts";
import { languageData, type LanguageData } from "./language-data.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

// --- Formats (the subset VS Code reads) ---

export interface HtmlValue {
  name: string;
  description?: string;
}
export interface HtmlAttribute {
  name: string;
  description?: string;
  values: HtmlValue[];
}
export interface HtmlData {
  version: 1.1;
  tags: { name: string; description: string; attributes: HtmlAttribute[] }[];
  globalAttributes: HtmlAttribute[];
}
export interface CssProperty {
  name: string;
  description: string;
  values?: HtmlValue[];
}
export interface CssData {
  version: 1.1;
  properties: CssProperty[];
}
/** What `<ui-debug>` reads from the page's stylesheets, for the linter. */
export interface LintData {
  identities: string[];
  hooks: Record<string, string[]>;
}

// --- Sources ---

function filesUnder(dir: string, test: (path: string) => boolean): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter(test)
    .map((path) => join(dir, path))
    .sort();
}

const GLOBALS: HtmlAttribute[] = [
  {
    name: "data-ui-theme",
    description: "Color scheme for the subtree.",
    values: [{ name: "dark" }, { name: "light" }],
  },
  {
    name: "data-ui-navigation",
    description: "On <html>: swap the body in place on navigations between opted-in pages.",
    values: [{ name: "swap" }],
  },
  {
    name: "data-ui-persist",
    description:
      "Keep this element's live DOM and state across in-page navigations; the value is an id both pages share.",
    values: [],
  },
  {
    name: "data-ui-guard",
    description: "Opts an element out of the style guard.",
    values: [{ name: "off" }],
  },
  {
    name: "data-debug-domains",
    description: "<ui-debug>: comma-separated hostnames the audit runs on.",
    values: [],
  },
  {
    name: "data-debug-warnings",
    description: "<ui-debug>: silences the unlisted-domain warning.",
    values: [{ name: "false" }],
  },
];

/** `data-ui` tokens the stylesheets declare plus those the fragments use. */
function uiTokens(css: string[], html: string[]): string[] {
  const tokens = new Set<string>();
  for (const text of css)
    for (const m of text.matchAll(/\[data-ui~="([^"]+)"\]/g)) tokens.add(m[1]!);
  for (const text of html) {
    for (const m of text.matchAll(/\sdata-ui="([^"]*)"/g)) {
      for (const token of m[1]!.split(/\s+/).filter(Boolean)) tokens.add(token);
    }
  }
  return [...tokens].sort();
}

/**
 * `data-<name>-<key>` attributes with their values. Values come from stylesheet
 * selectors (presets, slots, states) and, for those same attributes, from the
 * fragments; free-text config attributes (`data-autocomplete-value="Apple"`)
 * list no values. Script literals add names only under a known identity prefix,
 * with comments stripped.
 */
function dataAttributes(
  css: string[],
  html: string[],
  ts: string[],
  identities: string[],
): HtmlAttribute[] {
  const values = new Map<string, Set<string>>();
  const add = (name: string, value?: string) => {
    if (name === "data-ui" || name.startsWith("data-ui-") || name.startsWith("data-debug-")) return;
    const set = values.get(name) ?? new Set<string>();
    if (value !== undefined) for (const v of value.split(/\s+/).filter(Boolean)) set.add(v);
    values.set(name, set);
  };
  const enumerated = new Set<string>();
  const owned = (name: string) =>
    identities.some((id) => name.startsWith(`data-${id.split("-")[0]}-`) || name === `data-${id}`);
  for (const text of css) {
    for (const m of text.matchAll(/\[(data-[a-z0-9-]+)(?:~?=)"([^"]+)"\]/g)) {
      if (!owned(m[1]!)) continue;
      add(m[1]!, m[2]);
      enumerated.add(m[1]!);
    }
    for (const m of text.matchAll(/\[(data-[a-z0-9-]+)\]/g)) if (owned(m[1]!)) add(m[1]!);
  }
  for (const text of html) {
    for (const m of text.matchAll(/\s(data-[a-z0-9-]+)(?:="([^"]*)")?/g)) {
      const name = m[1]!;
      if (name === "data-ui" || !owned(name)) continue;
      const value = m[2];
      const listed =
        enumerated.has(name) && value !== undefined && /^[a-z0-9][a-z0-9 -]*$/.test(value);
      add(name, listed ? value : undefined);
    }
  }
  for (const text of ts) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const m of code.matchAll(/["'`](data-[a-z0-9]+(?:-[a-z0-9]+)+)["'`]/g)) {
      if (owned(m[1]!)) add(m[1]!);
    }
  }
  return [...values]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, set]) => ({
      name,
      description: describeAttribute(name),
      values: [...set].sort().map((v) => ({ name: v })),
    }));
}

function describeAttribute(name: string): string {
  if (name.endsWith("-slot")) return "Slot: a part inside the primitive.";
  if (name.endsWith("-state")) return "State: tokens the primitive's script writes.";
  const owner = Object.keys(PRIMITIVES)
    .sort((a, b) => b.length - a.length)
    .find(
      (primitive) =>
        name.startsWith(`data-${primitive}-`) ||
        name.startsWith(`data-${primitive.replace(/s$/, "")}-`),
    );
  return owner ? `Preset or config of the ${owner} primitive.` : "Data attribute the kit reads.";
}

function tags(ts: string[]): HtmlData["tags"] {
  const names = new Set<string>();
  for (const entry of Object.values(PRIMITIVES)) for (const tag of entry.tags ?? []) names.add(tag);
  for (const text of ts)
    for (const m of text.matchAll(/defineZazzElement\("([a-z-]+)"/g)) names.add(m[1]!);
  return [...names].sort().map((name) => ({
    name,
    description: `Zazz ${name.replace(/^ui-/, "")} (tag form; the attribute form is data-ui="${name.replace(/^ui-/, "")}").`,
    attributes: [],
  }));
}

/** Gradient utilities emit through a composite, so they describe themselves. */
const GRADIENT_DESCRIPTIONS: Record<string, string> = {
  "bg-linear":
    "background-image: linear-gradient(<this>, <--bg-stops>) — the prelude: a direction (to bottom, 45deg) and/or `in <color-space> [<hue> hue]`; color family.",
  "bg-radial":
    "background-image: radial-gradient(<this>, <--bg-stops>) — the prelude: shape, size, `at <position>`, and/or `in <color-space>`; color family.",
  "bg-conic":
    "background-image: conic-gradient(<this>, <--bg-stops>) — the prelude: `from <angle>`, `at <position>`, and/or `in <color-space> [<hue> hue]`; color family.",
  "bg-stops":
    "the color stops for --bg-linear, --bg-radial, or --bg-conic (normal gradient stop syntax); color family.",
};

function describeUtility(utility: Utility): string {
  if (GRADIENT_DESCRIPTIONS[utility.name]) return GRADIENT_DESCRIPTIONS[utility.name]!;
  if (utility.name === "bg") {
    return "background-color — any color, or `none` (transparent, and clears background-image); color family.";
  }
  if (utility.emit === "border") {
    return `border shorthand — a color (1px wide), a number (that many px), or a length (in --color-border); --border-width and --border-color win; ${utility.family} family.`;
  }
  const mode =
    utility.mode === "dual"
      ? "a scale number (× --spacing) or any length"
      : utility.mode === "integer"
        ? "an integer"
        : utility.mode === "keyword"
          ? "a keyword"
          : "any value";
  return `${utility.properties.join(", ")} — ${mode}; ${utility.family} family.`;
}

function tierDescription(tier: string): string {
  if (tier === "starting")
    return "in the element's starting style (@starting-style): the value a --transition animates from on first render or when leaving display: none";
  if (tier === "stuck")
    return `while the nearest sticky ancestor is stuck to its --${STUCK_STATE.modifier} side (default ${STUCK_STATE.fallback}); descendants only; experimental`;
  return (BREAKPOINTS as readonly string[]).includes(tier)
    ? `at the ${tier} breakpoint and up`
    : `in the ${tier} state`;
}

// --- Values (offered after the colon) ---

/** CSS keywords for keyword-mode utilities, by the CSS property they set. */
const KEYWORDS: Record<string, readonly string[]> = {
  display: [
    "block",
    "inline",
    "inline-block",
    "flex",
    "inline-flex",
    "grid",
    "inline-grid",
    "contents",
    "none",
  ],
  "flex-direction": ["row", "row-reverse", "column", "column-reverse"],
  "flex-wrap": ["wrap", "nowrap", "wrap-reverse"],
  "grid-auto-flow": ["row", "column", "dense", "row dense", "column dense"],
  "align-items": ["start", "center", "end", "stretch", "baseline", "normal"],
  "justify-content": [
    "start",
    "center",
    "end",
    "space-between",
    "space-around",
    "space-evenly",
    "stretch",
    "normal",
  ],
  "place-items": ["start", "center", "end", "stretch", "normal"],
  "align-self": ["auto", "start", "center", "end", "stretch", "baseline"],
  "font-style": ["normal", "italic", "oblique"],
  "text-align": ["start", "center", "end", "justify"],
  "text-transform": ["none", "uppercase", "lowercase", "capitalize"],
  "text-wrap": ["wrap", "nowrap", "balance", "pretty", "stable"],
  "white-space": ["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"],
  "text-decoration-line": ["none", "underline", "overline", "line-through"],
  "border-style": ["solid", "dashed", "dotted", "double", "none"],
  overflow: ["visible", "hidden", "clip", "scroll", "auto"],
  "overflow-x": ["visible", "hidden", "clip", "scroll", "auto"],
  "overflow-y": ["visible", "hidden", "clip", "scroll", "auto"],
  cursor: [
    "auto",
    "default",
    "pointer",
    "text",
    "move",
    "grab",
    "grabbing",
    "not-allowed",
    "wait",
    "help",
  ],
  "pointer-events": ["auto", "none"],
  visibility: ["visible", "hidden", "collapse"],
  position: ["static", "relative", "absolute", "fixed", "sticky"],
  "object-fit": ["fill", "contain", "cover", "none", "scale-down"],
};

/** Design-token families per utility: the `--<family>-*` names in the kit's stylesheets. */
function tokenFamilies(utility: Utility): string[] {
  if (utility.name === "rounded") return ["radius"];
  if (utility.name === "leading" || utility.name === "tracking" || utility.name === "shadow")
    return [utility.name];
  if (["font-size", "font-weight", "font-family", "aspect"].includes(utility.name))
    return [utility.name];
  if (utility.name === "max-w" || utility.name === "w") return ["breakpoint", "article"];
  if (utility.emit === "border") return ["color"];
  if (
    utility.family === "color" &&
    !["bg-alpha", "bg-linear", "bg-radial", "bg-conic"].includes(utility.name)
  )
    return ["color"];
  if (utility.name === "ring-color" || utility.name === "ring-offset-color") return ["color"];
  return [];
}

/** The `--space-*` scale as the numbers a utility takes (`--p: 4`); `--basis` is length-only. */
const SPACE_STEPS = ["1", "2", "4", "6", "11", "24", "40"];

function takesSpaceSteps(utility: Utility): boolean {
  return (
    ["spacing", "margin", "sizing"].includes(utility.family) ||
    utility.name === "w" ||
    utility.name === "max-w"
  );
}

/** Common preludes offered for the gradient type utilities. */
const GRADIENT_PRELUDES: Record<string, readonly string[]> = {
  "bg-linear": [
    "to top",
    "to right",
    "to bottom",
    "to left",
    "to bottom right",
    "in oklch",
    "to bottom in oklch",
    "to right in oklch longer hue",
  ],
  "bg-radial": ["circle", "ellipse", "circle at center", "closest-side", "in oklch"],
  "bg-conic": ["from 0deg", "from 0deg at center", "in oklch longer hue"],
};

function valuesFor(utility: Utility, tokens: Map<string, string[]>): HtmlValue[] | undefined {
  const names = new Set<string>(utility.keywords ?? []);
  // keyword shorthands first (--shadow: md, --font-weight: strong), then the display ones
  for (const alias of Object.keys(utility.aliases ?? {})) names.add(alias);
  if (utility.name === "display")
    for (const shorthand of Object.keys(DISPLAY_SHORTHANDS)) names.add(shorthand);
  if (utility.mode === "keyword")
    for (const property of utility.properties)
      for (const k of KEYWORDS[property] ?? []) names.add(k);
  if (utility.name === "col") {
    for (const band of ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "full", "bleed"])
      names.add(`layout-${band}`);
    names.add("1 / -1");
  }
  if (utility.name === "bg") names.add("none");
  for (const prelude of GRADIENT_PRELUDES[utility.name] ?? []) names.add(prelude);
  if (takesSpaceSteps(utility)) for (const step of SPACE_STEPS) names.add(step);
  for (const family of tokenFamilies(utility))
    for (const token of tokens.get(family) ?? []) names.add(`var(${token})`);
  return names.size ? [...names].map((name) => ({ name })) : undefined;
}

/** `--space-md`, `--color-primary`, … grouped by family, from top-level token declarations. */
function designTokens(css: string[]): Map<string, string[]> {
  const families = [
    "space",
    "color",
    "radius",
    "font-size",
    "leading",
    "tracking",
    "font-weight",
    "font-family",
    "shadow",
    "aspect",
    "breakpoint",
    "article",
  ];
  const tokens = new Map<string, Set<string>>();
  for (const text of css) {
    for (const m of text.matchAll(
      /(?:^|[\s;{])(--([a-z]+(?:-[a-z]+)?)-[a-z0-9_]+(?:-[a-z0-9_]+)*)\s*:/g,
    )) {
      const name = m[1]!;
      const family = families
        .filter((f) => name.startsWith(`--${f}-`))
        .sort((a, b) => b.length - a.length)[0];
      if (!family || name.startsWith("--_")) continue;
      if (family === "color" && name.endsWith("-color")) continue;
      if (name.endsWith("-multiplier")) continue;
      (tokens.get(family) ?? tokens.set(family, new Set()).get(family)!).add(name);
    }
  }
  // t-shirt sizes in scale order, everything else alphabetical
  const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];
  const rank = (name: string) => {
    const index = SIZES.indexOf(name.slice(name.lastIndexOf("-") + 1));
    return index === -1 ? SIZES.length : index;
  };
  const order = (a: string, b: string) => rank(a) - rank(b) || a.localeCompare(b);
  return new Map([...tokens].map(([family, set]) => [family, [...set].sort(order)]));
}

function cssProperties(css: string[]): CssProperty[] {
  const properties: CssProperty[] = [];
  const tokens = designTokens(css);
  for (const utility of UTILITIES) {
    const values = valuesFor(utility, tokens);
    properties.push({
      name: `--${utility.name}`,
      description: describeUtility(utility),
      ...(values ? { values } : {}),
    });
    for (const tier of tiersOf(utility)) {
      properties.push({
        name: `--${utility.name}--${tier}`,
        description: `--${utility.name} ${tierDescription(tier)}.`,
        ...(values ? { values } : {}),
      });
    }
    for (const tier of tiersOf(utility)) {
      if (!isState(tier) || !hasGroup(tier)) continue;
      properties.push({
        name: `--group-${utility.name}--${tier}`,
        description: `--${utility.name} while an ancestor with data-ui="group" is ${tier === "focus-within" ? "focus-within" : tier}.`,
        ...(values ? { values } : {}),
      });
    }
    if (utility.pseudo) {
      for (const side of PSEUDO_SIDES) {
        properties.push({
          name: `--${side}-${utility.name}`,
          description: `--${utility.name} on the ::${side} pseudo-element.`,
        });
      }
    }
  }
  properties.push({
    name: `--${STUCK_STATE.modifier}`,
    description: `On a sticky element: the side its descendants' --<utility>--stuck tiers track (default ${STUCK_STATE.fallback}). No tiers; switch --position to drop the state at a breakpoint. Experimental: container scroll-state queries, polyfilled where unsupported.`,
    values: STUCK_STATE.sides.map((name) => ({ name })),
  });
  const hooks = new Set<string>();
  for (const text of css) for (const m of text.matchAll(/(--ui-[a-z0-9-]+)\s*:/g)) hooks.add(m[1]!);
  for (const hook of [...hooks].sort()) {
    properties.push({
      name: hook,
      description: "Primitive hook: the public override surface.",
    });
  }
  return properties;
}

/**
 * Identity tokens and state-bearing hooks from the stylesheets, with the
 * patterns `<ui-debug>`'s `fromStylesheets` applies to the live CSSOM.
 */
function lintData(css: string[]): LintData {
  const identities = new Set<string>();
  const hooks = new Map<string, Set<string>>();
  const hookPattern =
    /--ui-([a-z]+(?:-[a-z]+)*?)-([a-z-]+?)--(hover|active|focus-visible|focus-within|checked|open|disabled)\b/g;
  for (const text of css) {
    for (const m of text.matchAll(/\[data-ui~="([^"]+)"\]/g)) identities.add(m[1]!);
    for (const m of text.matchAll(hookPattern)) {
      const set = hooks.get(m[1]!) ?? new Set<string>();
      set.add(`${m[2]}--${m[3]}`);
      hooks.set(m[1]!, set);
    }
  }
  return {
    identities: [...identities].sort(),
    hooks: Object.fromEntries(
      [...hooks].sort(([a], [b]) => a.localeCompare(b)).map(([id, set]) => [id, [...set].sort()]),
    ),
  };
}

// --- Generate ---

export function generateEditorData(): {
  html: HtmlData;
  css: CssData;
  lint: LintData;
  language: LanguageData;
} {
  const read = (paths: string[]) => paths.map((path) => readFileSync(path, "utf8"));
  const css = read(filesUnder(SRC, (path) => path.endsWith(".css")));
  const html = read(filesUnder(join(SRC, "primitives"), (path) => path.endsWith(".html")));
  const ts = read(
    filesUnder(
      SRC,
      (path) => path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith(".d.ts"),
    ),
  );
  const tokens = uiTokens(css, html);
  return {
    html: {
      version: 1.1,
      tags: tags(ts),
      globalAttributes: [
        {
          name: "data-ui",
          description: "Identity tokens: primitives, switches, and typography roles.",
          values: tokens.map((token) => ({ name: token })),
        },
        ...GLOBALS,
        ...dataAttributes(css, html, ts, [
          ...tokens,
          ...tags(ts).map((tag) => tag.name.replace(/^ui-/, "")),
          ...Object.keys(PRIMITIVES),
        ]),
      ],
    },
    css: { version: 1.1, properties: cssProperties(css) },
    lint: lintData(css),
    language: languageData(
      filesUnder(SRC, (path) => path.endsWith(".css")),
      SRC,
    ),
  };
}

/** The committed files, keyed by path relative to the package root. */
export function EDITOR_FILES(data: {
  html: HtmlData;
  css: CssData;
  lint: LintData;
  language: LanguageData;
}): Record<string, string> {
  return {
    "editor/zazz.html-data.json": `${JSON.stringify(data.html, null, 2)}\n`,
    "editor/zazz.css-data.json": `${JSON.stringify(data.css, null, 2)}\n`,
    "editor/zazz.lint-data.json": `${JSON.stringify(data.lint, null, 2)}\n`,
    "editor/zazz.language-data.json": `${JSON.stringify(data.language, null, 2)}\n`,
  };
}

function main(): void {
  mkdirSync(join(ROOT, "editor"), { recursive: true });
  for (const [path, text] of Object.entries(EDITOR_FILES(generateEditorData()))) {
    writeFileSync(join(ROOT, path), text);
    console.log(`wrote ${relative(ROOT, join(ROOT, path))}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
