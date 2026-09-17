"use strict";

/**
 * @fileoverview Tests for the migrate command's pure seams: where `--from`
 * comes from, which files a walk picks up, and the extension → kind map.
 * The end-to-end run (kit tarball, diff output, stamp) is ticket 25's e2e.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { ZazzError } from "../errors.ts";
import { discoverFiles, fileKindOf, inLine, locateRules, resolveFrom } from "./migrate.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolveFrom", () => {
  const config = { kit: { version: "0.4.1", integrity: "sha512-x" } };

  it("prefers --from, stripping an @ prefix", () => {
    expect(resolveFrom("@0.3.0", { ...config, migrated: "0.5.0" })).toBe("0.3.0");
    expect(resolveFrom("0.3.0", null)).toBe("0.3.0");
  });

  it("falls back to the migrated stamp before the kit version", () => {
    expect(resolveFrom(undefined, { ...config, migrated: "0.5.0" })).toBe("0.5.0");
    expect(resolveFrom(undefined, config)).toBe("0.4.1");
  });

  it("fails outside a vendored project without --from, pointing at the flag", () => {
    let error: unknown;
    try {
      resolveFrom(undefined, null);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ZazzError);
    expect((error as ZazzError).message).toMatch(/which kit version/);
    expect((error as ZazzError).hint).toMatch(/--from/);
  });
});

describe("inLine", () => {
  it("matches a version to the release line the rules start from", () => {
    expect(inLine("0.4.1", "0.4")).toBe(true);
    expect(inLine("0.4", "0.4")).toBe(true);
    expect(inLine("0.41.0", "0.4")).toBe(false);
    expect(inLine("0.3.9", "0.4")).toBe(false);
  });
});

describe("locateRules", () => {
  /** A fake extracted kit whose `migrations/` holds the given rules files. */
  async function kit(files: string[]): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-migrate-kit-"));
    tmpDirs.push(dir);
    await mkdir(path.join(dir, "migrations"));
    for (const file of files) await writeFile(path.join(dir, "migrations", file), "{}");
    return dir;
  }

  it("takes the kit version's own file when it exists, whatever from is", async () => {
    const dir = await kit(["0.4.0.json", "0.5.0.json"]);
    expect(await locateRules(dir, { version: "0.5.0", from: "0.4.1" })).toBe(
      "migrations/0.5.0.json",
    );
    // `from` at the target still finds it: the command then reports "already migrated".
    expect(await locateRules(dir, { version: "0.5.0", from: "0.5.0" })).toBe(
      "migrations/0.5.0.json",
    );
  });

  it("falls back to the newest file below the kit version and above from", async () => {
    const dir = await kit(["0.4.0.json", "0.5.0.json", "0.7.0.json", "README.md"]);
    expect(await locateRules(dir, { version: "0.5.1", from: "0.4.1" })).toBe(
      "migrations/0.5.0.json",
    );
    expect(await locateRules(dir, { version: "0.6.2", from: "0.3.0" })).toBe(
      "migrations/0.5.0.json",
    );
    // 0.4.0 applies to a 0.3 project on a kit that predates 0.5.
    expect(await locateRules(dir, { version: "0.4.9", from: "0.3.0" })).toBe(
      "migrations/0.4.0.json",
    );
  });

  it("returns null when no file applies, or the kit ships none", async () => {
    const dir = await kit(["0.5.0.json"]);
    // Already at or past every migration the kit carries.
    expect(await locateRules(dir, { version: "0.5.1", from: "0.5.0" })).toBeNull();
    // Only a newer file than the kit itself (never shipped, but never picked).
    expect(
      await locateRules(await kit(["0.7.0.json"]), { version: "0.6.0", from: "0.5.0" }),
    ).toBeNull();
    expect(await locateRules(await kit([]), { version: "0.5.0", from: "0.4.1" })).toBeNull();
    const bare = await mkdtemp(path.join(os.tmpdir(), "zazz-migrate-nokit-"));
    tmpDirs.push(bare);
    expect(await locateRules(bare, { version: "0.5.0", from: "0.4.1" })).toBeNull();
  });
});

describe("fileKindOf", () => {
  it.each([
    ["a.css", "css"],
    ["a.html", "html"],
    ["a.htm", "html"],
    ["a.astro", "html"],
    ["a.vue", "html"],
    ["a.svelte", "html"],
    ["a.md", "md"],
    ["a.mdx", "md"],
    ["a.js", "js"],
    ["a.jsx", "js"],
    ["a.ts", "js"],
    ["a.TSX", "js"],
  ])("%s → %s", (file, kind) => {
    expect(fileKindOf(file)).toBe(kind);
  });

  it("returns null for extensions the scan does not cover", () => {
    expect(fileKindOf("a.json")).toBeNull();
    expect(fileKindOf("a.scss")).toBeNull();
    expect(fileKindOf("Makefile")).toBeNull();
  });
});

describe("discoverFiles", () => {
  async function project(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "zazz-migrate-"));
    tmpDirs.push(root);
    const files = [
      "src/app.css",
      "src/pages/index.html",
      "src/components/Card.tsx",
      "docs/guide.mdx",
      "notes.txt",
      "node_modules/dep/index.js",
      "dist/bundle.js",
      ".git/HEAD.md",
      "zazz/base/_layers.css",
      "src/zazz/local.css",
    ];
    for (const file of files) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), "");
    }
    return root;
  }

  const rel = (root: string, files: string[]) =>
    files.map((file) => path.relative(root, file).split(path.sep).join("/"));

  it("walks the cwd for scanned extensions, skipping build dirs and the vendored dir", async () => {
    const root = await project();
    const found = discoverFiles([], {
      cwd: root,
      vendoredDir: path.join(root, "zazz"),
      include: [],
      exclude: [],
    });
    expect(rel(root, found)).toEqual([
      "docs/guide.mdx",
      "src/app.css",
      "src/components/Card.tsx",
      "src/pages/index.html",
      "src/zazz/local.css",
    ]);
  });

  it("keeps a same-named nested directory when the vendored dir is elsewhere", async () => {
    const root = await project();
    const found = discoverFiles([], {
      cwd: root,
      vendoredDir: path.join(root, "src", "zazz"),
      include: [],
      exclude: [],
    });
    expect(rel(root, found)).toContain("zazz/base/_layers.css");
    expect(rel(root, found)).not.toContain("src/zazz/local.css");
  });

  it("prunes the vendored dir however zazz.json spells it (trailing slash)", async () => {
    const root = await project();
    const warnings: string[] = [];
    const found = discoverFiles([], {
      cwd: root,
      // The command builds this with path.join(root, config.dir); `dir: "zazz/"` keeps the slash.
      vendoredDir: path.join(root, "zazz/"),
      include: [],
      exclude: [],
      warn: (message) => warnings.push(message),
    });
    expect(rel(root, found)).not.toContain("zazz/base/_layers.css");
    expect(rel(root, found)).toContain("src/zazz/local.css");
    expect(warnings).toEqual([]);
  });

  it('warns and prunes nothing when the vendored dir is the scan root (dir: ".")', async () => {
    const root = await project();
    const warnings: string[] = [];
    const found = discoverFiles([], {
      cwd: root,
      vendoredDir: path.join(root, "."),
      include: [],
      exclude: [],
      warn: (message) => warnings.push(message),
    });
    expect(rel(root, found)).toContain("zazz/base/_layers.css");
    expect(rel(root, found)).toContain("src/app.css");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/vendored directory \(\.\) is the scan root/);
    expect(warnings[0]).toMatch(/--exclude/);
  });

  it("takes named files as-is and walks named directories", async () => {
    const root = await project();
    const found = discoverFiles(["docs", "src/app.css", "notes.txt"], {
      cwd: root,
      vendoredDir: null,
      include: [],
      exclude: [],
    });
    expect(rel(root, found)).toEqual(["docs/guide.mdx", "src/app.css"]);
  });

  it("narrows with --include and drops with --exclude, relative to cwd", async () => {
    const root = await project();
    const options = { cwd: root, vendoredDir: null };
    expect(rel(root, discoverFiles([], { ...options, include: ["src/**"], exclude: [] }))).toEqual([
      "src/app.css",
      "src/components/Card.tsx",
      "src/pages/index.html",
      "src/zazz/local.css",
    ]);
    expect(
      rel(root, discoverFiles([], { ...options, include: [], exclude: ["**/*.css", "docs/**"] })),
    ).toEqual(["src/components/Card.tsx", "src/pages/index.html"]);
  });

  it("fails on a path that does not exist", () => {
    expect(() =>
      discoverFiles(["missing"], { cwd: os.tmpdir(), vendoredDir: null, include: [], exclude: [] }),
    ).toThrow(/no such file or directory: missing/);
  });
});
