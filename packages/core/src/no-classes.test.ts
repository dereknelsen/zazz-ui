"use strict";

/**
 * @fileoverview Migration guard, ratcheted by `MIGRATED`:
 * a migrated primitive's stylesheets carry no class selector and no unscoped
 * preset attribute (`data-slot`, `data-variant`, `data-orientation`, …); every `data-<name>-*` selector
 * is compounded with the primitive's identity; every `--_<name>-*` private is
 * registered in the file that uses it; its example fragments carry only
 * `data-ui*`, `data-<name>-*`, and utilities; and its scripts never touch `class`.
 * Kit-wide: stylesheets read theme colors through the `--color-*`
 * aliases, never a bare Shadcn role name.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { UTILITIES } from "./base/utilities.ts";
import { BASE_CSS_POST, PRIMITIVES } from "./manifest.ts";

const SRC = dirname(fileURLToPath(import.meta.url));

/** Primitives migrated to `data-ui`. */
const MIGRATED = [
  "button",
  "separator",
  "fields",
  "badge",
  "kbd",
  "button-group",
  "toggle",
  "toggle-group",
  "accordion",
  "table",
  "progress",
  "meter",
  "popover",
  "tooltip",
  "dialog",
  "alert-dialog",
  "menu",
  "navigation-menu",
  "mobile-menu",
  "input",
  "textarea",
  "select",
  "autocomplete",
  "combobox",
  "command",
  "checkbox",
  "slider",
  "switch",
  "input-group",
  "password-group",
  "otp",
  "radio",
  "tabs",
  "carousel",
  "lightbox",
  "toaster",
  "reveal",
  "card",
  "avatar",
  "breadcrumbs",
  "menubar",
  "toolbar",
  "prose",
  "layout",
  "scroll-fade",
] as const;

/**
 * Primitives whose attribute prefix or identity selectors differ from their
 * manifest name: fields owns `data-field-*` on three identities; the popover's
 * identity is the native attribute.
 */
const IDENTITY: Record<string, { prefix: string; selectors: string[] }> = {
  fields: {
    prefix: "field",
    selectors: ['[data-ui~="field"]', '[data-ui~="field-group"]', '[data-ui~="radio-group"]'],
  },
  popover: { prefix: "popover", selectors: ["[popover]"] },
  reveal: { prefix: "reveal", selectors: ["[data-reveal", "[data-reveal-each"] },
};

/** Classes still allowed in a migrated fragment. */
const PENDING: string[] = [];

/** Unscoped preset attributes; scoped form is `data-<primitive>-<key>`. */
const UNSCOPED_PRESET = /[[\s]data-(slot|variant|size|orientation|side|align|animation|state)\b/;

function read(path: string): string {
  return readFileSync(join(SRC, path.replace(/\.js$/, ".ts")), "utf8");
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Every selector prelude in `css` (the text before a `{`, at-rules excluded). */
function selectors(css: string): string[] {
  return [...stripComments(css).matchAll(/([^{};]+)\{/g)]
    .map((m) => m[1]!.trim())
    .filter((prelude) => !prelude.startsWith("@"));
}

describe.each(MIGRATED)("%s is migrated", (name) => {
  const entry = PRIMITIVES[name];
  if (!entry) throw new Error(`no manifest entry for ${name}`);
  const stylesheets = entry.css.map((path) => [path, read(path)] as const);
  const { prefix, selectors: identities } = IDENTITY[name] ?? {
    prefix: name,
    selectors: [`[data-ui~="${name}"]`],
  };

  it("has no class selector and no unscoped preset attribute in its stylesheets", () => {
    for (const [path, css] of stylesheets) {
      const preludes = selectors(css).join("\n");
      expect(preludes, path).not.toMatch(/\.ui-/);
      expect(preludes, path).not.toMatch(UNSCOPED_PRESET);
    }
  });

  it(`compounds every data-${prefix}-* selector with the identity`, () => {
    for (const [path, css] of stylesheets) {
      for (const prelude of selectors(css)) {
        // A nested prelude (`&…`, `> …`) rides on its already-compounded parent.
        if (/^[&>]/.test(prelude)) continue;
        if (prelude.includes(`[data-${prefix}-`)) {
          expect(
            identities.some((identity) => prelude.includes(identity)),
            `${path}: ${prelude}`,
          ).toBe(true);
        }
      }
    }
  });

  it(`registers every --_${prefix}-* private it reads or writes`, () => {
    for (const [path, css] of stylesheets) {
      const registered = [...css.matchAll(/@property\s+(--_[\w-]+)/g)].map((m) => m[1]);
      const used = new Set(
        [...stripComments(css).matchAll(new RegExp(`--_${prefix}-[\\w-]+`, "g"))].map((m) => m[0]),
      );
      for (const privateName of used) {
        // a longer-named primitive's private (button writes --_button-group-rounded) is registered by its owner
        const owner = readdirSync(join(SRC, "primitives")).find(
          (name) => name.startsWith(`${prefix}-`) && privateName.startsWith(`--_${name}-`),
        );
        if (owner) {
          const ownerCss = join(SRC, "primitives", owner, `${owner}.css`);
          expect(readFileSync(ownerCss, "utf8"), ownerCss).toMatch(
            new RegExp(`@property\\s+${privateName}\\b`),
          );
          continue;
        }
        expect(registered, path).toContain(privateName);
      }
    }
  });

  it("carries only data-ui, data-<name>-*, and utilities in its example fragments", () => {
    for (const path of entry.examples) {
      const html = read(path).replace(/<!--[\s\S]*?-->/g, "");
      // Until every primitive migrates, a fragment may still carry the class form
      // of an unmigrated primitive; nothing else may sit in `class`.
      for (const [, tokens] of html.matchAll(/\sclass="([^"]*)"/g)) {
        for (const token of tokens!.split(/\s+/).filter(Boolean)) {
          const unmigrated =
            (token.startsWith("ui-") &&
              !(MIGRATED as readonly string[]).includes(token.slice(3))) ||
            PENDING.includes(token);
          expect(unmigrated, `${path}: class token "${token}"`).toBe(true);
        }
      }
      // Slots and presets of unmigrated primitives are theirs to migrate later.
      for (const [, slot] of html.matchAll(/\sdata-slot="([^"]*)"/g)) {
        // The owner is the longest primitive name prefixing the slot (input-group, not input).
        const owner = Object.keys(PRIMITIVES)
          .filter((name) => slot!.startsWith(`${name}-`))
          .sort((a, b) => b.length - a.length)[0];
        expect(
          owner !== undefined && (MIGRATED as readonly string[]).includes(owner),
          `${path}: data-slot="${slot}" belongs to migrated ${owner}`,
        ).toBe(false);
      }
      const migratedElements = html
        .replace(/<[^<>]*\sclass="ui-[^"]*"[^<>]*>/g, "")
        .replace(/<[^<>]*\sdata-slot="[^"]*"[^<>]*>/g, "");
      expect(migratedElements, path).not.toMatch(UNSCOPED_PRESET);
      // Values are utilities: every declaration in a migrated element's style is a custom property.
      for (const [, css] of migratedElements.matchAll(/\sstyle="([^"]*)"/g)) {
        for (const declaration of css!
          .split(";")
          .map((d) => d.trim())
          .filter(Boolean)) {
          expect(declaration.startsWith("--"), `${path}: style declaration "${declaration}"`).toBe(
            true,
          );
        }
      }
    }
  });

  it("never touches class in its scripts", () => {
    for (const path of [...entry.js, ...entry.base].filter((p) => p.endsWith(".js"))) {
      expect(read(path), path).not.toMatch(/\bclassName\b|classList/);
    }
  });
});

/** Every `.css` file under `src/`, as `src/`-relative paths. */
function stylesheetsUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".css"))
    .map((path) => relative(SRC, join(dir, path)));
}

/** Every kit script (compiled-in-place TypeScript, tests excluded). */
function scriptsUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
    .map((path) => relative(SRC, join(dir, path)));
}

describe("theme colors", () => {
  const variables = read("base/_variables.css");
  /** The theme role names, from the `--color-<role>:` declarations. */
  const roles = [...variables.matchAll(/^\s*--color-([\w-]+):/gm)].map((m) => m[1]!);
  const bare = new RegExp(`(?:var\\(|^\\s*)--(${roles.join("|")})(?:[,)]|\\s*:)`, "gm");

  it("declares at least the primary and ring roles", () => {
    expect(roles).toContain("primary");
    expect(roles).toContain("ring");
  });

  it("no hand-written kit stylesheet declares or reads a bare role name", () => {
    const offenders: string[] = [];
    for (const path of stylesheetsUnder(SRC)) {
      // Generated files register the `--ring` utility, which shares its name with the role.
      if (/^base\/_(utilities-|properties|breakpoints)/.test(path)) continue;
      for (const m of stripComments(read(path)).matchAll(bare))
        offenders.push(`${path}: ${m[0].trim()}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("generated privates", () => {
  /** `--_<utility>` is the utilities layer's own; a stylesheet reads `--_<utility>-resolved` instead. */
  const reserved = new RegExp(
    `--_(${UTILITIES.map((utility) => utility.name).join("|")})(?![\\w-])`,
    "g",
  );

  it("no hand-written stylesheet uses a generated private name", () => {
    const offenders: string[] = [];
    for (const path of stylesheetsUnder(SRC)) {
      if (/^base\/_(utilities-|properties|breakpoints)/.test(path)) continue;
      for (const m of stripComments(read(path)).matchAll(reserved))
        offenders.push(`${path}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("no class layer", () => {
  /** A class selector anywhere in a prelude: `.name` after a start, space, combinator, comma, or paren. */
  const classSelector = /(^|[\s,>+~(])\.[a-zA-Z_-]/;

  it("ships no stylesheet with a class selector", () => {
    const offenders: string[] = [];
    for (const path of stylesheetsUnder(SRC)) {
      for (const prelude of selectors(read(path))) {
        if (classSelector.test(prelude)) offenders.push(`${path}: ${prelude}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ships no example fragment with a class attribute", () => {
    const offenders: string[] = [];
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      for (const path of entry.examples) {
        const html = read(path).replace(/<!--[\s\S]*?-->/g, "");
        for (const [, tokens] of html.matchAll(/\sclass="([^"]*)"/g)) {
          offenders.push(`${name} ${path}: class="${tokens}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ships no script that touches className or classList", () => {
    const offenders = scriptsUnder(SRC).filter((path) =>
      /\bclassName\b|classList/.test(read(path)),
    );
    expect(offenders).toEqual([]);
  });

  it("has deleted the 0.4 class layer", () => {
    expect(BASE_CSS_POST).not.toContain("base/_utilities.css");
    expect(existsSync(join(SRC, "base/_utilities.css"))).toBe(false);
  });
});

describe("variables resolve (no misnamed or undeclared reads)", () => {
  const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  const generated = (path: string) => /^base\/_(utilities-|properties|breakpoints)/.test(path);

  it("every var() read without a fallback is declared in a kit stylesheet or set by a kit script", () => {
    const declared = new Set<string>();
    for (const path of stylesheetsUnder(SRC)) {
      const css = strip(read(path));
      for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]!);
      for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) declared.add(m[1]!);
    }
    // custom properties kit scripts write with style.setProperty
    for (const path of scriptsUnder(SRC)) {
      for (const m of read(path).matchAll(/setProperty\(\s*["'`](--[\w-]+)["'`]/g))
        declared.add(m[1]!);
    }
    const offenders: string[] = [];
    for (const path of stylesheetsUnder(SRC)) {
      if (generated(path)) continue;
      for (const m of strip(read(path)).matchAll(/var\((--[\w-]+)\s*\)/g)) {
        if (!declared.has(m[1]!)) offenders.push(`${path}: ${m[1]}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
