"use strict";

/**
 * @fileoverview Tests for the kit engine — module loading and manifest
 * gating against fixture extract directories (no tarball), plus one real
 * pacote round-trip through a `file:` tarball.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { ZazzError } from "./errors.ts";
import { loadKitFromDir, resolveKit } from "./kit.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-cli-test-"));
  tmpDirs.push(dir);
  return dir;
}

const VALID_MANIFEST_JS = `
export const MANIFEST_VERSION = 1;
export const PRIMITIVES = {
  kbd: { css: ["primitives/kbd/kbd.css"], js: [], base: [], primitives: [], bare: [], examples: [] },
  button: { css: ["primitives/button/button.css"], js: [], base: [], primitives: ["kbd"], bare: [], examples: [] },
};
export const CSS_CASCADE_ORDER = ["kbd", "button"];
export function resolveClosure(names) {
  const out = new Set();
  const visit = (name) => {
    if (out.has(name)) return;
    out.add(name);
    for (const dep of PRIMITIVES[name].primitives) visit(dep);
  };
  for (const name of names) visit(name);
  return CSS_CASCADE_ORDER.filter((name) => out.has(name));
}
`;

const VALID_HEAD_JS = `
import { MANIFEST_VERSION } from "./manifest.js";
export function buildHead(options = {}) {
  return "<!-- fixture head v" + MANIFEST_VERSION + " base=" + (options.base ?? "") + " -->";
}
`;

/** Builds a fixture extracted-package directory. */
async function fixtureKitDir(overrides: { manifestJs?: string; omitManifest?: boolean } = {}) {
  const dir = await tmpDir();
  await mkdir(path.join(dir, "src", "primitives", "button"), { recursive: true });
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "@zazz-ui/core", version: "0.0.0-fixture", type: "module" }),
  );
  if (!overrides.omitManifest) {
    await writeFile(
      path.join(dir, "src", "manifest.js"),
      overrides.manifestJs ?? VALID_MANIFEST_JS,
    );
  }
  await writeFile(path.join(dir, "src", "head.js"), VALID_HEAD_JS);
  await writeFile(
    path.join(dir, "src", "primitives", "button", "button.css"),
    ".ui-button { color: red; }\n",
  );
  return dir;
}

describe("loadKitFromDir", () => {
  it("loads a valid kit: manifest, closure resolver, head builder, file access", async () => {
    const dir = await fixtureKitDir();
    const kit = await loadKitFromDir(dir, { version: "9.9.9", integrity: "sha512-x" });

    expect(kit.version).toBe("9.9.9");
    expect(kit.manifest.manifestVersion).toBe(1);
    expect(kit.manifest.cssCascadeOrder).toEqual(["kbd", "button"]);
    expect(kit.manifest.resolveClosure(["button"])).toEqual(["kbd", "button"]);
    expect(kit.buildHead({ base: "./zazz" })).toContain("base=./zazz");
    expect(kit.has("primitives/button/button.css")).toBe(true);
    expect(kit.has("primitives/ghost/ghost.css")).toBe(false);
    const css = await kit.readFile("primitives/button/button.css");
    expect(css.toString()).toContain(".ui-button");
  });

  it("rejects a manifest version newer than the CLI supports", async () => {
    const dir = await fixtureKitDir({
      manifestJs: VALID_MANIFEST_JS.replace("MANIFEST_VERSION = 1", "MANIFEST_VERSION = 2"),
    });
    await expect(loadKitFromDir(dir, { version: "9.9.9", integrity: "" })).rejects.toThrow(
      /newer than this CLI/,
    );
  });

  it("rejects a kit whose modules fail to load, with the upgrade hint", async () => {
    const dir = await fixtureKitDir({ omitManifest: true });
    const failure = await loadKitFromDir(dir, { version: "9.9.9", integrity: "" }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ZazzError);
    expect((failure as ZazzError).hint).toContain("zazz-ui@latest");
  });

  it("rejects an unrecognized manifest shape", async () => {
    const dir = await fixtureKitDir({ manifestJs: "export const MANIFEST_VERSION = 1;" });
    await expect(loadKitFromDir(dir, { version: "9.9.9", integrity: "" })).rejects.toThrow(
      /unrecognized/,
    );
  });

  it("blocks path traversal through manifest-supplied paths", async () => {
    const dir = await fixtureKitDir();
    const kit = await loadKitFromDir(dir, { version: "9.9.9", integrity: "" });
    await expect(kit.readFile("../package.json")).rejects.toThrow(/outside the package/);
  });
});

describe("resolveKit with a file: tarball", () => {
  it("extracts through pacote and loads the kit", async () => {
    const kitDir = await fixtureKitDir();
    const scratch = await tmpDir();
    const tarball = path.join(scratch, "fixture-kit.tgz");
    // npm tarballs root their contents at "package/".
    await tar.create({ gzip: true, file: tarball, cwd: kitDir, prefix: "package" }, [
      "package.json",
      "src",
    ]);

    const kit = await resolveKit(`file:${tarball}`, { cache: path.join(scratch, "cache") });
    expect(kit.manifest.manifestVersion).toBe(1);
    expect(kit.manifest.resolveClosure(["button"])).toEqual(["kbd", "button"]);
    expect(kit.has("primitives/button/button.css")).toBe(true);
  });
});
