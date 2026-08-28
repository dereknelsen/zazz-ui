"use strict";

/**
 * @fileoverview E2e for `zazz-ui add` against the locally packed kit tarball
 * (env wired by global-setup). Exercises real dependency closures from the
 * published manifest: combobox pulls badge/kbd/button/popover/fields/select
 * plus the typeahead engine stack.
 */

import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { runAdd } from "../src/commands/add.ts";
import { runInit } from "../src/commands/init.ts";
import type { ZazzConfig } from "../src/config.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-add-"));
  tmpDirs.push(dir);
  return dir;
}

async function readConfig(project: string): Promise<ZazzConfig> {
  return JSON.parse(await readFile(path.join(project, "zazz.json"), "utf8")) as ZazzConfig;
}

const BASE_FLAGS = { dir: "zazz", fonts: true, themeScript: true };

let project: string;
beforeAll(async () => {
  project = await tmpDir();
  await runInit(undefined, BASE_FLAGS, { cwd: project, silent: true });
});

describe("zazz-ui add (e2e, packed kit)", () => {
  it("vendors the dependency closure with per-primitive provenance", async () => {
    await runAdd(["combobox"], {}, { cwd: project, silent: true });

    const config = await readConfig(project);
    // combobox → popover, button(→kbd), fields, badge, select(→popover…).
    for (const name of ["combobox", "select", "fields", "popover", "button", "kbd", "badge"]) {
      expect(config.primitives[name], name).toBeDefined();
      expect(config.primitives[name]?.version).toBe(config.kit.version);
    }
    for (const file of [
      "zazz/primitives/combobox/combobox.css",
      "zazz/primitives/combobox/combobox.js",
      "zazz/primitives/combobox/combobox.d.ts",
      "zazz/primitives/select/select.css",
      "zazz/primitives/button/button.css",
      "zazz/base/typeahead.js",
      "zazz/base/command-score.js",
      "zazz/base/hotkeys.js",
    ]) {
      expect(existsSync(path.join(project, file)), file).toBe(true);
    }
    // The engine stack rode into base provenance, not a primitive's.
    expect(config.base.files["base/typeahead.js"]).toBeDefined();

    // No examples without --examples.
    expect(existsSync(path.join(project, "zazz/primitives/combobox/combobox.html"))).toBe(false);
  });

  it("wires entry imports in cascade order and dependency order", async () => {
    const css = await readFile(path.join(project, "zazz/index.css"), "utf8");
    const positions = ["kbd", "badge", "button", "popover", "fields", "select", "combobox"].map(
      (name) => ({ name, index: css.indexOf(`./primitives/${name}/`) }),
    );
    for (const { name, index } of positions) expect(index, name).toBeGreaterThan(-1);
    // badge before kbd? No: kit cascade order is separator, badge, kbd, button…
    const badge = positions.find((p) => p.name === "badge");
    const kbd = positions.find((p) => p.name === "kbd");
    const combobox = positions.find((p) => p.name === "combobox");
    expect(badge && kbd && badge.index < kbd.index).toBe(true);
    expect(combobox?.index).toBeGreaterThan(kbd?.index ?? Infinity);
    expect(css.indexOf("combobox")).toBeLessThan(css.indexOf("base/_utilities.css"));

    const entry = await readFile(path.join(project, "zazz/index.js"), "utf8");
    expect(entry.indexOf(`import "./base/typeahead.js";`)).toBeGreaterThan(-1);
    expect(entry.indexOf("base/typeahead.js")).toBeLessThan(
      entry.indexOf("primitives/combobox/combobox.js"),
    );
  });

  it("is a no-op when everything is already vendored", async () => {
    const before = await readFile(path.join(project, "zazz.json"), "utf8");
    await runAdd(["button"], {}, { cwd: project, silent: true });
    expect(await readFile(path.join(project, "zazz.json"), "utf8")).toBe(before);
  });

  it("slots later additions at their cascade position", async () => {
    await runAdd(["separator", "tabs"], {}, { cwd: project, silent: true });
    const css = await readFile(path.join(project, "zazz/index.css"), "utf8");
    // separator leads the cascade; tabs sits after select/combobox block.
    expect(css.indexOf("primitives/separator/")).toBeLessThan(css.indexOf("primitives/badge/"));
    expect(css.indexOf("primitives/tabs/")).toBeGreaterThan(css.indexOf("primitives/combobox/"));
  });

  it("copies examples only for requested primitives with --examples", async () => {
    await runAdd(["carousel"], { examples: true }, { cwd: project, silent: true });
    expect(existsSync(path.join(project, "zazz/primitives/carousel/carousel.html"))).toBe(true);
    // carousel's embla base dep landed too.
    expect(existsSync(path.join(project, "zazz/base/embla.js"))).toBe(true);
  });

  it("records markup-only primitives without css imports", async () => {
    await runAdd(["card"], {}, { cwd: project, silent: true });
    const config = await readConfig(project);
    expect(config.primitives.card).toBeDefined();
    const css = await readFile(path.join(project, "zazz/index.css"), "utf8");
    expect(css).not.toContain("primitives/card/");
  });

  it("rejects unknown primitives with the valid list", async () => {
    await expect(runAdd(["blorbo"], {}, { cwd: project, silent: true })).rejects.toThrow(
      /unknown primitive "blorbo"/,
    );
  });

  it("requires an initialized project", async () => {
    const empty = await tmpDir();
    await expect(runAdd(["button"], {}, { cwd: empty, silent: true })).rejects.toThrow(
      /isn't initialized/,
    );
  });
});
