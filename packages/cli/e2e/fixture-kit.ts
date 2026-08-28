"use strict";

/**
 * @fileoverview A hand-authored two-version fixture kit for the update/diff
 * e2e. Unlike the packed real kit (global-setup), these two tarballs give the
 * tests control over every upstream event: a changed base file (merge and
 * conflict target), a changed primitive file, an added file, a removed file,
 * a new primitive that joins a dependency closure, and a changelog with a
 * breaking entry. Consumed via `ZAZZ_UI_KIT=file:…/kit-{version}.tgz` — the
 * `{version}` placeholder routes each resolution to the right tarball.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";

export const V1 = "0.9.0";
export const V2 = "0.9.1";

/** v1 of the conflict/merge target. */
export const V1_VARIABLES = `:root {
  --alpha: 1;
  --beta: 2;
  --gamma: 3;
}
`;

/** v2 changes --beta (conflict bait) and appends --delta. */
export const V2_VARIABLES = `:root {
  --alpha: 1;
  --beta: 20;
  --gamma: 3;
  --delta: 4;
}
`;

export const V1_ALPHA_CSS = `/* alpha ${V1} */
.ui-alpha {
  color: red;
}

.ui-alpha-note {
  margin: 0;
}
`;

/** v2 touches only the header line — local edits below merge cleanly. */
export const V2_ALPHA_CSS = V1_ALPHA_CSS.replace(`/* alpha ${V1} */`, `/* alpha ${V2} */`);

const CHANGELOG_V2 = `# Changelog

## ${V2} (2026-08-28)

### base

- Variables gained \`--delta\`. **BREAKING** — the \`--beta\` scale changed.

### alpha

- Added alpha-extra.css.

### beta

- Dropped beta-old.css; beta now depends on gamma.

## ${V1} (2026-08-01)

### base

- Fixture first release.
`;

function manifestJs(version: string): string {
  const v2 = version === V2;
  return `export const MANIFEST_VERSION = 1;
export const PRIMITIVES = {
  alpha: {
    css: ["primitives/alpha/alpha.css"${v2 ? ', "primitives/alpha/alpha-extra.css"' : ""}],
    js: ["primitives/alpha/alpha.js"],
    base: [],
    primitives: [],
    bare: [],
    examples: ["primitives/alpha/alpha.html"],
  },
  beta: {
    css: ["primitives/beta/beta.css"${v2 ? "" : ', "primitives/beta/beta-old.css"'}],
    js: ["primitives/beta/beta.js"],
    base: ["base/engine.js"],
    primitives: ["alpha"${v2 ? ', "gamma"' : ""}],
    bare: [],
    examples: [],
  },
${
  v2
    ? `  gamma: {
    css: ["primitives/gamma/gamma.css"],
    js: [],
    base: [],
    primitives: [],
    bare: [],
    examples: [],
  },
`
    : ""
}};
export const CSS_CASCADE_ORDER = [${v2 ? '"alpha", "gamma", "beta"' : '"alpha", "beta"'}];
export function resolveClosure(names) {
  const out = new Set();
  const visit = (name) => {
    if (out.has(name) || !PRIMITIVES[name]) return;
    out.add(name);
    for (const dep of PRIMITIVES[name].primitives) visit(dep);
  };
  for (const name of names) visit(name);
  return CSS_CASCADE_ORDER.filter((name) => out.has(name));
}
`;
}

function headJs(version: string): string {
  return `export function buildHead(options = {}) {
  return "<!-- fixture head ${version} base=" + (options.base ?? "") + " theme=" + (options.theme ?? "") + " -->";
}
`;
}

/** Files every version ships (the CLI's v1 fallback inventory needs them). */
function commonFiles(version: string): Record<string, string> {
  const stubScript = (name: string) => `export const ${name} = "${version}";\n`;
  const stubTypes = (name: string) => `export declare const ${name}: string;\n`;
  return {
    "src/base/_layers.css": "@layer variables, reset, legacy, zazz, migrations;\n",
    "src/base/_reset.css": "* {\n  box-sizing: border-box;\n}\n",
    "src/base/_typography.css": "body {\n  font-family: fixture;\n}\n",
    "src/base/_view-transitions.css": "/* fixture view transitions */\n",
    "src/base/_utilities.css": "/* fixture utilities */\n",
    "src/base/_layout.css": "/* fixture layout */\n",
    "src/base/utils.js": stubScript("utils"),
    "src/base/utils.d.ts": stubTypes("utils"),
    "src/base/utils.ts": stubScript("utils"),
    "src/base/signals.js": stubScript("signals"),
    "src/base/signals.d.ts": stubTypes("signals"),
    "src/base/signals.ts": stubScript("signals"),
    "src/base/zazz-element.js": stubScript("zazzElement"),
    "src/base/zazz-element.d.ts": stubTypes("zazzElement"),
    "src/base/zazz-element.ts": stubScript("zazzElement"),
    "src/base/dialog-lifecycle.js": stubScript("dialogLifecycle"),
    "src/base/dialog-lifecycle.d.ts": stubTypes("dialogLifecycle"),
    "src/base/dialog-lifecycle.ts": stubScript("dialogLifecycle"),
    "src/base/engine.js": stubScript("engine"),
    "src/base/engine.d.ts": stubTypes("engine"),
    "src/base/engine.ts": stubScript("engine"),
    "src/primitives/alpha/alpha.js": stubScript("alpha"),
    "src/primitives/alpha/alpha.d.ts": stubTypes("alpha"),
    "src/primitives/alpha/alpha.html": '<div class="ui-alpha">alpha</div>\n',
    "src/primitives/beta/beta.css": ".ui-beta {\n  display: grid;\n}\n",
    "src/primitives/beta/beta.js": stubScript("beta"),
    "src/primitives/beta/beta.d.ts": stubTypes("beta"),
    "src/manifest.js": manifestJs(version),
    "src/head.js": headJs(version),
  };
}

function versionFiles(version: string): Record<string, string> {
  const files = commonFiles(version);
  files["package.json"] = `${JSON.stringify(
    { name: "@zazz-ui/core", version, type: "module" },
    null,
    2,
  )}\n`;
  if (version === V1) {
    files["src/base/_variables.css"] = V1_VARIABLES;
    files["src/primitives/alpha/alpha.css"] = V1_ALPHA_CSS;
    files["src/primitives/beta/beta-old.css"] = ".ui-beta-old {\n  opacity: 1;\n}\n";
    files["CHANGELOG.md"] =
      `# Changelog\n\n## ${V1} (2026-08-01)\n\n### base\n\n- Fixture first release.\n`;
  } else {
    files["src/base/_variables.css"] = V2_VARIABLES;
    files["src/primitives/alpha/alpha.css"] = V2_ALPHA_CSS;
    files["src/primitives/alpha/alpha-extra.css"] = ".ui-alpha-extra {\n  color: teal;\n}\n";
    files["src/primitives/gamma/gamma.css"] = ".ui-gamma {\n  display: flex;\n}\n";
    files["CHANGELOG.md"] = CHANGELOG_V2;
  }
  return files;
}

/**
 * @description Writes both fixture tarballs under `dir` and returns the
 * `ZAZZ_UI_KIT` value (a `file:` spec with the `{version}` placeholder).
 */
export async function buildFixtureKits(dir: string): Promise<string> {
  for (const version of [V1, V2]) {
    const tree = path.join(dir, `tree-${version}`);
    const files = versionFiles(version);
    for (const [file, content] of Object.entries(files)) {
      const dest = path.join(tree, ...file.split("/"));
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content);
    }
    // npm tarballs root their contents at "package/".
    await tar.create(
      { gzip: true, file: path.join(dir, `kit-${version}.tgz`), cwd: tree, prefix: "package" },
      Object.keys(files)
        .map((file) => file.split("/")[0] ?? file)
        .filter(unique),
    );
  }
  return `file:${path.join(dir, "kit-{version}.tgz")}`;
}

function unique(value: string, index: number, all: string[]): boolean {
  return all.indexOf(value) === index;
}
