"use strict";

/**
 * @fileoverview Tests for zazz.json load/validate/save.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { type ZazzConfig, loadConfig, serializeConfig, validateConfig } from "./config.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

function validConfig(): ZazzConfig {
  return {
    $schema: "https://zazz.sh/schema.json",
    kit: { version: "0.1.0", integrity: "sha512-x" },
    dir: "zazz",
    language: "js",
    legacy: null,
    head: { fonts: true, themeScript: true },
    base: { files: { "base/_layers.css": "sha256-a" } },
    primitives: {
      button: { version: "0.1.0", files: { "primitives/button/button.css": "sha256-b" } },
    },
  };
}

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    expect(() => validateConfig(validConfig(), "zazz.json")).not.toThrow();
  });

  it.each([
    ["missing kit", (c: ZazzConfig) => Reflect.deleteProperty(c, "kit"), /kit\.version/],
    ["bad language", (c: ZazzConfig) => Object.assign(c, { language: "jsx" }), /language/],
    ["bad legacy", (c: ZazzConfig) => Object.assign(c, { legacy: 4 }), /legacy/],
    ["missing head", (c: ZazzConfig) => Reflect.deleteProperty(c, "head"), /head\.fonts/],
    ["bad primitive", (c: ZazzConfig) => Object.assign(c.primitives, { x: {} }), /primitives\.x/],
  ])("rejects %s with a pointed message", (_label, mutate, pattern) => {
    const config = validConfig();
    mutate(config);
    expect(() => validateConfig(config, "zazz.json")).toThrow(pattern);
  });
});

describe("loadConfig", () => {
  it("walks up from a nested cwd and reports the config root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zazz-config-"));
    tmpDirs.push(root);
    await writeFile(path.join(root, "zazz.json"), serializeConfig(validConfig()));
    const nested = path.join(root, "src", "components");
    await mkdir(nested, { recursive: true });

    const loaded = await loadConfig(nested);
    expect(loaded?.root).toBe(root);
    expect(loaded?.config.dir).toBe("zazz");
  });

  it("returns null when no config exists", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-noconfig-"));
    tmpDirs.push(dir);
    expect(await loadConfig(dir)).toBeNull();
  });

  it("throws on malformed JSON instead of treating it as uninitialized", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-badjson-"));
    tmpDirs.push(dir);
    await writeFile(path.join(dir, "zazz.json"), "{ not json");
    await expect(loadConfig(dir)).rejects.toThrow(/not valid JSON/);
  });
});

describe("serializeConfig", () => {
  it("emits stable key order regardless of insertion order", () => {
    const a = validConfig();
    const b = validConfig();
    b.base.files = { "base/_layers.css": "sha256-a" };
    b.primitives = { button: b.primitives.button! };
    // Scramble insertion order in a.
    a.base.files = Object.fromEntries(Object.entries(a.base.files).reverse());
    expect(serializeConfig(a)).toBe(serializeConfig(b));
    expect(serializeConfig(a).endsWith("\n")).toBe(true);
  });
});
