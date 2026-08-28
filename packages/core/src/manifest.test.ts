"use strict";

/**
 * @fileoverview Drift guard for the distribution manifest (`manifest.ts`) —
 * the invariants that make `PRIMITIVES` safe for the CLI, the docs, and the
 * granular CDN head to trust: every primitive directory has an entry, every
 * listed file exists, dependencies resolve and stay acyclic, the cascade
 * order mirrors `index.css`, and every bare specifier is pinned in the
 * import map.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { ESM_DEPENDENCIES } from "./head.ts";
import {
  CSS_CASCADE_ORDER,
  MANIFEST_VERSION,
  PRIMITIVES,
  WEB_COMPONENT_SCRIPT_FILES,
} from "./manifest.ts";

const SRC = dirname(fileURLToPath(import.meta.url));

/** Emitted `.js` paths are authored as `.ts`; tests check the source tree. */
function sourcePath(jsPath: string): string {
  return join(SRC, jsPath.replace(/\.js$/, ".ts"));
}

/** Last path segment, typed as a plain string for lint-friendly sorting. */
function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

describe("manifest version", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(MANIFEST_VERSION)).toBe(true);
    expect(MANIFEST_VERSION).toBeGreaterThan(0);
  });
});

describe("primitive coverage", () => {
  const dirs = readdirSync(join(SRC, "primitives"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  it("has one entry per src/primitives/ directory, and no orphans", () => {
    expect(Object.keys(PRIMITIVES).sort()).toEqual(dirs);
  });

  it("lists every file the primitive owns (nothing missing, nothing phantom)", () => {
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      const dir = join(SRC, "primitives", name);
      const files = readdirSync(dir);

      const ownedCss = files.filter((f) => f.endsWith(".css"));
      expect(entry.css.map(basename).sort(), `${name} css`).toEqual(ownedCss.sort());

      const ownedScripts = files.filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"),
      );
      expect(entry.js.map((p) => basename(p).replace(/\.js$/, ".ts")).sort(), `${name} js`).toEqual(
        ownedScripts.sort(),
      );

      const ownedExamples = files.filter((f) => f.endsWith(".html"));
      expect(entry.examples.map(basename).sort(), `${name} examples`).toEqual(ownedExamples.sort());
    }
  });

  it("references only files that exist", () => {
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      for (const path of [...entry.css, ...entry.examples]) {
        expect(existsSync(join(SRC, path)), `${name}: ${path}`).toBe(true);
      }
      for (const path of [...entry.js, ...entry.base]) {
        expect(existsSync(sourcePath(path)), `${name}: ${path}`).toBe(true);
      }
    }
  });
});

describe("dependency graph", () => {
  it("resolves every primitives reference, with no self-references", () => {
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      for (const dep of entry.primitives) {
        expect(PRIMITIVES[dep], `${name} -> ${dep}`).toBeDefined();
        expect(dep, `${name} depends on itself`).not.toBe(name);
      }
    }
  });

  it("is acyclic", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (name: string, trail: string[]): void => {
      if (done.has(name)) return;
      expect(visiting.has(name), `cycle: ${[...trail, name].join(" -> ")}`).toBe(false);
      visiting.add(name);
      for (const dep of PRIMITIVES[name]?.primitives ?? []) visit(dep, [...trail, name]);
      visiting.delete(name);
      done.add(name);
    };
    for (const name of Object.keys(PRIMITIVES)) visit(name, []);
  });

  it("never lists core runtime scripts as base dependencies", () => {
    const core = ["utils", "signals", "zazz-element", "dialog-lifecycle"].map(
      (n) => `base/${n}.js`,
    );
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      for (const path of entry.base) {
        expect(core, `${name}: ${path} is core runtime`).not.toContain(path);
      }
    }
  });
});

describe("cascade order", () => {
  it("matches the @import order of index.css exactly", () => {
    const indexCss = readFileSync(join(SRC, "index.css"), "utf8");
    const imported = [...indexCss.matchAll(/@import "\.\/primitives\/([a-z-]+)\//g)].map(
      (m) => m[1],
    );
    expect(CSS_CASCADE_ORDER).toEqual(imported);
  });

  it("covers exactly the primitives that own css", () => {
    const withCss = Object.entries(PRIMITIVES)
      .filter(([, entry]) => entry.css.length > 0)
      .map(([name]) => name)
      .sort();
    expect([...CSS_CASCADE_ORDER].sort()).toEqual(withCss);
  });
});

describe("bare specifiers", () => {
  it("are all pinned in head.ts's import map", () => {
    const pinned = new Set(ESM_DEPENDENCIES.map((dep) => dep.name));
    for (const [name, entry] of Object.entries(PRIMITIVES)) {
      for (const spec of entry.bare) {
        expect(pinned.has(spec), `${name}: ${spec} has no import-map pin`).toBe(true);
      }
    }
  });
});

describe("web-component script map", () => {
  it("only lists files reachable from a PRIMITIVES entry", () => {
    const known = new Set(
      Object.values(PRIMITIVES).flatMap((entry) => [...entry.js, ...entry.base]),
    );
    for (const [id, files] of Object.entries(WEB_COMPONENT_SCRIPT_FILES)) {
      for (const file of files ?? []) {
        expect(known.has(file), `${id}: ${file} not in PRIMITIVES`).toBe(true);
      }
    }
  });
});
