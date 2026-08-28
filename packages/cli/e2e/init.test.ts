"use strict";

/**
 * @fileoverview E2e for `zazz-ui init` against the locally packed kit
 * tarball. Commands run in-process (non-interactive: no TTY in vitest, so
 * prompts resolve to their safe fallbacks); the kit engine resolves through
 * pacote exactly as it would against the registry.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { runInit } from "../src/commands/init.ts";
import type { ZazzConfig } from "../src/config.ts";
import { sha256 } from "../src/vendor.ts";

// global-setup.ts packs the kit and sets ZAZZ_UI_KIT + XDG_CACHE_HOME.

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-"));
  tmpDirs.push(dir);
  return dir;
}

async function readConfig(project: string): Promise<ZazzConfig> {
  return JSON.parse(await readFile(path.join(project, "zazz.json"), "utf8")) as ZazzConfig;
}

const BASE_FLAGS = { dir: "zazz", fonts: true, themeScript: true };

describe("zazz-ui init (e2e, packed kit)", () => {
  it("vendors the base platform with provenance", async () => {
    const project = await tmpDir();
    await runInit(undefined, BASE_FLAGS, { cwd: project, silent: true });

    // Base css + core runtime (.js + .d.ts) + generated entries.
    for (const file of [
      "zazz/base/_layers.css",
      "zazz/base/_variables.css",
      "zazz/base/utils.js",
      "zazz/base/utils.d.ts",
      "zazz/base/dialog-lifecycle.js",
      "zazz/index.css",
      "zazz/index.js",
      "zazz/head.html",
      "zazz.json",
    ]) {
      expect(existsSync(path.join(project, file)), file).toBe(true);
    }

    const config = await readConfig(project);
    expect(config.language).toBe("js");
    expect(config.kit.version).toMatch(/^\d+\.\d+\.\d+/);
    // 7 css + 4 runtime × (.js + .d.ts) + 3 generated artifacts.
    expect(Object.keys(config.base.files)).toHaveLength(18);

    // Recorded hashes are of pristine bytes — untouched files match on disk.
    const layers = await readFile(path.join(project, "zazz/base/_layers.css"));
    expect(sha256(layers)).toBe(config.base.files["base/_layers.css"]);

    const indexCss = await readFile(path.join(project, "zazz/index.css"), "utf8");
    expect(indexCss.indexOf("_layers.css")).toBeLessThan(indexCss.indexOf("_utilities.css"));
    const head = await readFile(path.join(project, "zazz/head.html"), "utf8");
    expect(head).toContain("importmap");
    expect(head).toContain("./zazz/index.css");
  });

  it("repair restores missing files and leaves edited ones alone", async () => {
    const project = await tmpDir();
    await runInit(undefined, BASE_FLAGS, { cwd: project, silent: true });

    const missing = path.join(project, "zazz/base/_reset.css");
    const edited = path.join(project, "zazz/base/_layers.css");
    await rm(missing);
    await writeFile(edited, "/* my edit */\n", { flag: "a" });

    await runInit(undefined, BASE_FLAGS, { cwd: project, silent: true });
    expect(existsSync(missing)).toBe(true);
    expect(await readFile(edited, "utf8")).toContain("/* my edit */");
  });

  it("vendors TypeScript sources with --ts and records the language", async () => {
    const project = await tmpDir();
    await runInit(undefined, { ...BASE_FLAGS, ts: true }, { cwd: project, silent: true });

    expect(existsSync(path.join(project, "zazz/base/utils.ts"))).toBe(true);
    expect(existsSync(path.join(project, "zazz/base/utils.js"))).toBe(false);
    const entry = await readFile(path.join(project, "zazz/index.ts"), "utf8");
    expect(entry).toContain(`import "./base/utils.ts";`);
    expect((await readConfig(project)).language).toBe("ts");
  });

  it("wires --legacy into the legacy layer", async () => {
    const project = await tmpDir();
    await runInit(
      undefined,
      { ...BASE_FLAGS, legacy: "../styles/old.css" },
      { cwd: project, silent: true },
    );
    const css = await readFile(path.join(project, "zazz/index.css"), "utf8");
    expect(css).toContain(`@import "../styles/old.css" layer(legacy);`);
    expect((await readConfig(project)).legacy).toBe("../styles/old.css");
  });

  it("--dry-run writes nothing", async () => {
    const project = await tmpDir();
    await runInit(undefined, { ...BASE_FLAGS, dryRun: true }, { cwd: project, silent: true });
    expect(existsSync(path.join(project, "zazz.json"))).toBe(false);
    expect(existsSync(path.join(project, "zazz"))).toBe(false);
  });

  it("keeps stray files non-interactively and exits 2", async () => {
    const project = await tmpDir();
    const stray = path.join(project, "zazz", "index.css");
    await mkdir(path.dirname(stray), { recursive: true });
    await writeFile(stray, "/* mine */\n");

    const previousExitCode = process.exitCode;
    await runInit(undefined, BASE_FLAGS, { cwd: project, silent: true });
    expect(await readFile(stray, "utf8")).toBe("/* mine */\n");
    expect(process.exitCode).toBe(2);
    process.exitCode = previousExitCode;

    // Provenance still records the generated hash, so the file reads as edited.
    const config = await readConfig(project);
    expect(config.base.files["index.css"]).toBeDefined();
    expect(sha256(await readFile(stray))).not.toBe(config.base.files["index.css"]);
  });
});
