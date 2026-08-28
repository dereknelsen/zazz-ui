"use strict";

/**
 * @fileoverview E2e for `zazz-ui update` against the two-version fixture kit
 * (see fixture-kit.ts). Each test gets its own project because updates
 * mutate state; the fixture's `{version}` spec template temporarily replaces
 * global-setup's packed-kit `ZAZZ_UI_KIT` for this file.
 */

import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";
import type { ZazzConfig } from "../src/config.ts";
import { sha256 } from "../src/vendor.ts";
import { runAdd } from "../src/commands/add.ts";
import { runInit } from "../src/commands/init.ts";
import { runUpdate, splitVersionArgs } from "../src/commands/update.ts";
import { V1, V1_VARIABLES, V2, V2_VARIABLES, buildFixtureKits } from "./fixture-kit.ts";

const tmpDirs: string[] = [];
let previousKitEnv: string | undefined;

beforeAll(async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-update-kit-"));
  tmpDirs.push(scratch);
  previousKitEnv = process.env.ZAZZ_UI_KIT;
  process.env.ZAZZ_UI_KIT = await buildFixtureKits(scratch);
});

afterAll(async () => {
  if (previousKitEnv === undefined) delete process.env.ZAZZ_UI_KIT;
  else process.env.ZAZZ_UI_KIT = previousKitEnv;
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

afterEach(() => {
  // update signals skips via the exit code; don't leak it into other tests.
  process.exitCode = 0;
});

/** A fresh project at fixture v1 with beta (→ alpha) vendored. */
async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-update-"));
  tmpDirs.push(dir);
  await runInit(
    `@${V1}`,
    { dir: "zazz", fonts: true, themeScript: true },
    { cwd: dir, silent: true },
  );
  await runAdd(["beta"], {}, { cwd: dir, silent: true });
  return dir;
}

async function readConfig(root: string): Promise<ZazzConfig> {
  return JSON.parse(await readFile(path.join(root, "zazz.json"), "utf8")) as ZazzConfig;
}

const at = (root: string, file: string): string => path.join(root, "zazz", ...file.split("/"));

describe("zazz-ui update (e2e, fixture kit)", () => {
  it("moves a pristine project wholesale: merges, creates, deletes, closure growth", async () => {
    const root = await project();
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    const config = await readConfig(root);
    expect(config.kit.version).toBe(V2);
    expect(config.base.version).toBeUndefined();
    for (const name of ["alpha", "beta", "gamma"]) {
      expect(config.primitives[name]?.version, name).toBe(V2);
    }

    // Changed upstream, pristine here → new bytes.
    expect(await readFile(at(root, "base/_variables.css"), "utf8")).toBe(V2_VARIABLES);
    // Added upstream → vendored, recorded.
    expect(existsSync(at(root, "primitives/alpha/alpha-extra.css"))).toBe(true);
    expect(config.primitives.alpha?.files["primitives/alpha/alpha-extra.css"]).toBeDefined();
    // New dependency in beta's closure → vendored fresh.
    expect(existsSync(at(root, "primitives/gamma/gamma.css"))).toBe(true);
    // Removed upstream, unedited → deleted, record dropped.
    expect(existsSync(at(root, "primitives/beta/beta-old.css"))).toBe(false);
    expect(config.primitives.beta?.files["primitives/beta/beta-old.css"]).toBeUndefined();

    // Entries regenerated for the new shape; head is CLI-owned.
    const indexCss = await readFile(at(root, "index.css"), "utf8");
    expect(indexCss).toContain("primitives/alpha/alpha-extra.css");
    expect(indexCss).toContain("primitives/gamma/gamma.css");
    expect(indexCss).not.toContain("beta-old");
    expect(indexCss.indexOf("gamma")).toBeLessThan(indexCss.indexOf("primitives/beta/"));
    expect(await readFile(at(root, "head.html"), "utf8")).toContain(`fixture head ${V2}`);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("auto-merges local edits that don't overlap upstream changes", async () => {
    const root = await project();
    const file = at(root, "primitives/alpha/alpha.css");
    const edited = (await readFile(file, "utf8")).replace("margin: 0;", "margin: 4px;");
    await writeFile(file, edited);

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    const merged = await readFile(file, "utf8");
    expect(merged).toContain(`/* alpha ${V2} */`); // upstream's change
    expect(merged).toContain("margin: 4px;"); // yours
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("skips the unit on an unresolved conflict (non-interactive) and exits 2", async () => {
    const root = await project();
    const file = at(root, "base/_variables.css");
    await writeFile(file, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode).toBe(2);
    const config = await readConfig(root);
    // The whole base unit stayed behind; skew is recorded.
    expect(config.kit.version).toBe(V2);
    expect(config.base.version).toBe(V1);
    expect(await readFile(file, "utf8")).toContain("--beta: 3;");
    expect(config.base.files["base/_variables.css"]).toBe(sha256(V1_VARIABLES));
    // Primitives still moved.
    expect(config.primitives.alpha?.version).toBe(V2);
  });

  it("re-offers the merge on a re-run after a skip", async () => {
    const root = await project();
    const file = at(root, "base/_variables.css");
    await writeFile(file, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });
    process.exitCode = 0;

    await runUpdate([`@${V2}`], { theirs: true }, { cwd: root, silent: true });
    const config = await readConfig(root);
    expect(config.base.version).toBeUndefined();
    expect(await readFile(file, "utf8")).toBe(V2_VARIABLES);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("--theirs resolves conflicts to the target version", async () => {
    const root = await project();
    const file = at(root, "base/_variables.css");
    await writeFile(file, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));

    await runUpdate([`@${V2}`], { theirs: true }, { cwd: root, silent: true });

    expect(await readFile(file, "utf8")).toBe(V2_VARIABLES);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("--markers writes diff3 conflict markers and records the new pristine hash", async () => {
    const root = await project();
    const file = at(root, "base/_variables.css");
    await writeFile(file, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));

    await runUpdate([`@${V2}`], { markers: true }, { cwd: root, silent: true });

    const content = await readFile(file, "utf8");
    expect(content).toContain("<<<<<<< yours");
    expect(content).toContain(`||||||| ${V1}`);
    expect(content).toContain(`>>>>>>> ${V2}`);
    expect(content).toContain("--beta: 3;");
    expect(content).toContain("--beta: 20;");
    const config = await readConfig(root);
    expect(config.base.files["base/_variables.css"]).toBe(sha256(V2_VARIABLES));
  });

  it("--keep keeps your bytes but re-records the new pristine base", async () => {
    const root = await project();
    const file = at(root, "base/_variables.css");
    const yours = V1_VARIABLES.replace("--beta: 2;", "--beta: 3;");
    await writeFile(file, yours);

    await runUpdate([`@${V2}`], { keep: true }, { cwd: root, silent: true });

    expect(await readFile(file, "utf8")).toBe(yours);
    const config = await readConfig(root);
    expect(config.kit.version).toBe(V2);
    expect(config.base.files["base/_variables.css"]).toBe(sha256(V2_VARIABLES));
  });

  it("keeps an edited upstream-removed file, untracked (non-interactive default)", async () => {
    const root = await project();
    const file = at(root, "primitives/beta/beta-old.css");
    await writeFile(file, ".ui-beta-old {\n  opacity: 0.5;\n}\n");

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(existsSync(file)).toBe(true);
    const config = await readConfig(root);
    expect(config.primitives.beta?.version).toBe(V2);
    expect(config.primitives.beta?.files["primitives/beta/beta-old.css"]).toBeUndefined();
  });

  it("restores a locally deleted file at the target version", async () => {
    const root = await project();
    await rm(at(root, "primitives/alpha/alpha.css"));

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(await readFile(at(root, "primitives/alpha/alpha.css"), "utf8")).toContain(
      `/* alpha ${V2} */`,
    );
  });

  it("narrowed update moves only the named primitive and its closure", async () => {
    const root = await project();
    await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root, silent: true });

    const config = await readConfig(root);
    expect(config.kit.version).toBe(V1);
    expect(config.primitives.alpha?.version).toBe(V2);
    expect(config.primitives.beta?.version).toBe(V1);
    expect(config.primitives.gamma).toBeUndefined();
    // Base platform untouched; entries reflect alpha's new file.
    expect(await readFile(at(root, "base/_variables.css"), "utf8")).toBe(V1_VARIABLES);
    expect(existsSync(at(root, "primitives/alpha/alpha-extra.css"))).toBe(true);
    const indexCss = await readFile(at(root, "index.css"), "utf8");
    expect(indexCss).toContain("primitives/alpha/alpha-extra.css");
    // beta-old is still vendored — beta didn't move.
    expect(existsSync(at(root, "primitives/beta/beta-old.css"))).toBe(true);
  });

  it("is a no-op when already at the target", async () => {
    const root = await project();
    const before = await readFile(path.join(root, "zazz.json"), "utf8");
    await runUpdate([`@${V1}`], {}, { cwd: root, silent: true });
    expect(await readFile(path.join(root, "zazz.json"), "utf8")).toBe(before);
  });

  it("rejects names that aren't vendored", async () => {
    const root = await project();
    await expect(runUpdate([`@${V2}`, "blorbo"], {}, { cwd: root, silent: true })).rejects.toThrow(
      /isn't vendored/,
    );
  });
});

describe("splitVersionArgs", () => {
  it("separates the @-version from names in any order", () => {
    expect(splitVersionArgs(["@0.2.0", "button"])).toEqual({
      version: "0.2.0",
      names: ["button"],
    });
    expect(splitVersionArgs(["button", "@0.2.0", "kbd"])).toEqual({
      version: "0.2.0",
      names: ["button", "kbd"],
    });
  });

  it("defaults to latest with no version", () => {
    expect(splitVersionArgs(["button"])).toEqual({ version: "latest", names: ["button"] });
    expect(splitVersionArgs([])).toEqual({ version: "latest", names: [] });
  });

  it("rejects two versions", () => {
    expect(() => splitVersionArgs(["@0.1.0", "@0.2.0"])).toThrow(/two version arguments/);
  });
});
