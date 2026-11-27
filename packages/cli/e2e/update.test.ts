"use strict";

/**
 * @fileoverview E2e for `zazz-ui update` against the fixture kit
 * (see fixture-kit.ts). Each test gets its own project because updates
 * mutate state; the fixture's `{version}` spec template temporarily replaces
 * global-setup's packed-kit `ZAZZ_UI_KIT` for this file.
 */

import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { ZazzConfig } from "../src/config.ts";
import { sha256 } from "../src/vendor.ts";
import { runAdd } from "../src/commands/add.ts";
import { runInit } from "../src/commands/init.ts";
import { importedStems, runUpdate, splitVersionArgs } from "../src/commands/update.ts";
import {
  V1,
  V1_VARIABLES,
  V2,
  V2_VARIABLES,
  V3,
  V3_BASE_CSS_POST,
  V3_BASE_CSS_PRE,
  buildFixtureKits,
} from "./fixture-kit.ts";

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

  it("narrowed update vendors a shared script the target version introduced", async () => {
    const root = await project();
    await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root, silent: true });

    // alpha at V2 imports behaviors/steps.js, which V1 (the base's version) never had.
    expect(await readFile(at(root, "behaviors/steps.js"), "utf8")).toContain(V2);
    const config = await readConfig(root);
    expect(config.base.files["behaviors/steps.js"]).toBeDefined();
    expect(await readFile(at(root, "index.js"), "utf8")).toContain(
      `import "./behaviors/steps.js";`,
    );
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("keeps a moved shared script that a skipped primitive still imports", async () => {
    const root = await project();
    // beta.js changes in V2; a local edit to the same line conflicts, so beta is skipped
    await writeFile(at(root, "primitives/beta/beta.js"), `export const beta = "mine";\n`);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await runUpdate([`@${V2}`], {}, { cwd: root });
      // It is beta's script at beta's version, not a removed file the entry holds on to.
      const printed = log.mock.calls.map((call) => String(call[0])).join("\n");
      expect(printed).not.toContain("engine.js: removed upstream");
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }

    expect(process.exitCode).toBe(2);
    let config = await readConfig(root);
    expect(config.primitives.beta?.version).toBe(V1);
    // beta at V1 imports base/engine.js, which V2 moved to behaviors/
    expect(existsSync(at(root, "base/engine.js"))).toBe(true);
    expect(config.base.files["base/engine.js"]).toBeDefined();
    expect(await readFile(at(root, "index.js"), "utf8")).toContain(`import "./base/engine.js";`);

    // Resolving the conflict moves beta, and the old script goes with it.
    process.exitCode = 0;
    await runUpdate([`@${V2}`], { theirs: true }, { cwd: root, silent: true });
    config = await readConfig(root);
    expect(config.primitives.beta?.version).toBe(V2);
    expect(existsSync(at(root, "base/engine.js"))).toBe(false);
    expect(config.base.files["base/engine.js"]).toBeUndefined();
    expect(existsSync(at(root, "behaviors/engine.js"))).toBe(true);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("vendors the shared scripts moved primitives import when the base unit is skipped", async () => {
    const root = await project();
    await writeFile(
      at(root, "base/_variables.css"),
      V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"),
    );

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode).toBe(2);
    let config = await readConfig(root);
    expect(config.base.version).toBe(V1);
    expect(config.primitives.alpha?.version).toBe(V2);
    expect(config.primitives.beta?.version).toBe(V2);
    // alpha and beta at V2 import these; without them no script on the page loads
    expect(existsSync(at(root, "behaviors/steps.js"))).toBe(true);
    expect(existsSync(at(root, "behaviors/engine.js"))).toBe(true);
    expect(config.base.files["behaviors/engine.js"]).toBeDefined();
    // the skipped base unit deleted nothing
    expect(existsSync(at(root, "base/engine.js"))).toBe(true);

    // The re-run finishes the base unit without tripping over the files it already wrote.
    process.exitCode = 0;
    await runUpdate([`@${V2}`], { theirs: true }, { cwd: root, silent: true });
    config = await readConfig(root);
    expect(config.base.version).toBeUndefined();
    expect(existsSync(at(root, "base/engine.js"))).toBe(false);
    expect(await readFile(at(root, "index.js"), "utf8")).toContain(
      `import "./behaviors/engine.js";`,
    );
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("keeps a moved shared script while a kept entry script still imports it", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    const line = `import "./base/engine.js";`;
    const edited = (await readFile(entry, "utf8")).replace(line, `${line} // mine`);
    expect(edited).toContain("// mine");
    await writeFile(entry, edited);

    await runUpdate([`@${V2}`], { keep: true }, { cwd: root, silent: true });

    expect(await readFile(entry, "utf8")).toContain(`${line} // mine`);
    // The entry you kept still imports it, so it stays on disk, and stays tracked.
    expect(existsSync(at(root, "base/engine.js"))).toBe(true);
    expect(existsSync(at(root, "behaviors/engine.js"))).toBe(true);
    let config = await readConfig(root);
    expect(config.base.files["base/engine.js"]).toBeDefined();
    expect(config.base.sources?.["base/engine.js"]).toBe(V1);

    // Once the entry stops importing it, the next update removes it.
    await writeFile(entry, edited.replace(`${line} // mine\n`, ""));
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });
    expect(existsSync(at(root, "base/engine.js"))).toBe(false);
    config = await readConfig(root);
    expect(config.base.files["base/engine.js"]).toBeUndefined();
    // (the V1 entry kept here still imports beta-legacy.js, which stays held)
    expect(config.base.sources?.["base/engine.js"]).toBeUndefined();
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("keeps a script a primitive dropped while a kept entry script still imports it", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    const line = `import "./primitives/beta/beta-legacy.js";`;
    const edited = (await readFile(entry, "utf8")).replace(line, `${line} // mine`);
    expect(edited).toContain("// mine");
    await writeFile(entry, edited);

    await runUpdate([`@${V2}`], { keep: true }, { cwd: root, silent: true });

    expect(existsSync(at(root, "primitives/beta/beta-legacy.js"))).toBe(true);
    expect(existsSync(at(root, "primitives/beta/beta-legacy.d.ts"))).toBe(true);
    let config = await readConfig(root);
    expect(config.primitives.beta?.version).toBe(V2);
    expect(config.primitives.beta?.files["primitives/beta/beta-legacy.js"]).toBeUndefined();
    // The base unit owns the entry, so it tracks what the entry holds on to.
    expect(config.base.sources?.["primitives/beta/beta-legacy.js"]).toBe(V1);

    await writeFile(entry, edited.replace(`${line} // mine\n`, ""));
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });
    expect(existsSync(at(root, "primitives/beta/beta-legacy.js"))).toBe(false);
    expect(existsSync(at(root, "primitives/beta/beta-legacy.d.ts"))).toBe(false);
    config = await readConfig(root);
    expect(config.base.files["primitives/beta/beta-legacy.js"]).toBeUndefined();
  });

  it("keeps a dropped primitive script the entry imports when the base unit is skipped", async () => {
    const root = await project();
    await writeFile(
      at(root, "base/_variables.css"),
      V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"),
    );

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode).toBe(2);
    // The base unit was skipped, so index.js is the old one and still imports it.
    expect(await readFile(at(root, "index.js"), "utf8")).toContain("beta-legacy.js");
    expect(existsSync(at(root, "primitives/beta/beta-legacy.js"))).toBe(true);

    process.exitCode = 0;
    await runUpdate([`@${V2}`], { theirs: true }, { cwd: root, silent: true });
    expect(await readFile(at(root, "index.js"), "utf8")).not.toContain("beta-legacy.js");
    expect(existsSync(at(root, "primitives/beta/beta-legacy.js"))).toBe(false);
    expect((await readConfig(root)).base.sources).toBeUndefined();
  });

  it("hands a held script back to its primitive when the kit ships it again", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    const line = `import "./primitives/beta/beta-legacy.js";`;
    await writeFile(entry, (await readFile(entry, "utf8")).replace(line, `${line} // mine`));
    await runUpdate([`@${V2}`], { keep: true }, { cwd: root, silent: true });

    await runUpdate([`@${V3}`], { keep: true }, { cwd: root, silent: true });

    const file = "primitives/beta/beta-legacy.js";
    expect(await readFile(at(root, file), "utf8")).toContain(V3);
    const config = await readConfig(root);
    expect(config.primitives.beta?.files[file]).toBeDefined();
    expect(config.base.files[file]).toBeUndefined();
    expect(config.base.sources?.[file]).toBeUndefined();
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("add records where a shared script came from when the base is behind the kit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-update-add-"));
    tmpDirs.push(root);
    await runInit(
      `@${V1}`,
      { dir: "zazz", fonts: true, themeScript: true },
      { cwd: root, silent: true },
    );
    await runAdd(["alpha"], {}, { cwd: root, silent: true });
    const variables = at(root, "base/_variables.css");
    await writeFile(variables, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });
    process.exitCode = 0;

    // The kit is at V2 and the base at V1: beta's engine script comes from V2.
    await runAdd(["beta"], {}, { cwd: root, silent: true });
    const config = await readConfig(root);
    expect(config.base.sources?.["behaviors/engine.js"]).toBe(V2);
    // add wrote beta into the entries, so the record of what they hold follows.
    expect(config.base.entries).toEqual({ alpha: V1, beta: V2, gamma: V2 });

    const file = at(root, "behaviors/engine.js");
    const mine = `${await readFile(file, "utf8")}// mine\n`;
    await writeFile(file, mine);
    await writeFile(variables, V1_VARIABLES);
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode ?? 0).toBe(0);
    expect(await readFile(file, "utf8")).toBe(mine);
  });

  it("does not keep a script for an import the entry has commented out", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    const line = `import "./base/engine.js";`;
    await writeFile(entry, (await readFile(entry, "utf8")).replace(line, `// ${line}`));

    await runUpdate([`@${V2}`], { keep: true }, { cwd: root, silent: true });

    expect(await readFile(entry, "utf8")).toContain(`// ${line}`);
    expect(existsSync(at(root, "base/engine.js"))).toBe(false);
  });

  it("reports the shared scripts it vendors while the base unit is skipped", async () => {
    const root = await project();
    await writeFile(
      at(root, "base/_variables.css"),
      V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await runUpdate([`@${V2}`], {}, { cwd: root });
      const printed = log.mock.calls.map((call) => String(call[0])).join("\n");
      expect(printed).toMatch(/vendored[^\n]*:\n(?:.*\n)*.*behaviors\/engine\.js/);
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("merges an edited shared script that a narrowed update vendored from a newer kit", async () => {
    const root = await project();
    await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root, silent: true });
    const file = at(root, "behaviors/steps.js");
    const mine = `${await readFile(file, "utf8")}// mine\n`;
    await writeFile(file, mine);

    // The base is still at V1, which never had the file: its ancestor is V2's copy.
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode ?? 0).toBe(0);
    expect(await readFile(file, "utf8")).toBe(mine);
    expect((await readConfig(root)).base.version).toBeUndefined();
  });

  it("merges an edited shared script after its primitive moved on again", async () => {
    const root = await project();
    await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root, silent: true });
    const file = at(root, "behaviors/steps.js");
    await writeFile(file, `${await readFile(file, "utf8")}// mine\n`);
    expect((await readConfig(root)).base.sources?.["behaviors/steps.js"]).toBe(V2);

    // alpha moves to V3: no primitive is recorded at V2 any more, and the base is still at V1.
    await runUpdate([`@${V3}`, "alpha"], {}, { cwd: root, silent: true });
    await runUpdate([`@${V3}`], {}, { cwd: root, silent: true });

    expect(process.exitCode ?? 0).toBe(0);
    const merged = await readFile(file, "utf8");
    expect(merged).toContain(V3);
    expect(merged).toContain("// mine");
    const config = await readConfig(root);
    expect(config.base.version).toBeUndefined();
    expect(config.base.sources).toBeUndefined();
  });

  it("re-running a narrowed update finishes a skipped base unit", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    const line = `import "./primitives/alpha/alpha.js";`;
    await writeFile(entry, (await readFile(entry, "utf8")).replace(line, `${line} // mine`));

    // alpha at V2 adds an import next to the edited line: the entry conflicts, base is skipped.
    await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root, silent: true });
    expect(process.exitCode).toBe(2);
    expect((await readConfig(root)).primitives.alpha?.version).toBe(V2);
    expect(await readFile(entry, "utf8")).not.toContain("behaviors/steps.js");

    expect((await readConfig(root)).base.entries).toEqual({ alpha: V1, beta: V1 });

    process.exitCode = 0;
    await runUpdate([`@${V2}`, "alpha"], { theirs: true }, { cwd: root, silent: true });
    expect((await readConfig(root)).base.entries).toBeUndefined();
    expect(await readFile(entry, "utf8")).toContain(`import "./behaviors/steps.js";`);
    expect(await readFile(at(root, "index.css"), "utf8")).toContain("alpha-extra.css");
    expect(process.exitCode ?? 0).toBe(0);

    // With the entries current, the same command has nothing left to do.
    const before = await readFile(path.join(root, "zazz.json"), "utf8");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await runUpdate([`@${V2}`, "alpha"], {}, { cwd: root });
      expect(log.mock.calls.map((call) => String(call[0])).join("\n")).toContain("Already at");
    } finally {
      log.mockRestore();
    }
    expect(await readFile(path.join(root, "zazz.json"), "utf8")).toBe(before);
  });

  it("a re-run merges an edited entry against the one the skipped run left behind", async () => {
    const root = await project();
    const entry = at(root, "index.js");
    await writeFile(entry, `// mine\n${await readFile(entry, "utf8")}`);
    const variables = at(root, "base/_variables.css");
    await writeFile(variables, V1_VARIABLES.replace("--beta: 2;", "--beta: 3;"));

    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });
    expect(process.exitCode).toBe(2);
    expect((await readConfig(root)).base.entries).toEqual({ alpha: V1, beta: V1 });

    process.exitCode = 0;
    await writeFile(variables, V1_VARIABLES);
    await runUpdate([`@${V2}`], {}, { cwd: root, silent: true });

    expect(process.exitCode ?? 0).toBe(0);
    const merged = await readFile(entry, "utf8");
    expect(merged).toContain("// mine");
    expect(merged).toContain(`import "./behaviors/steps.js";`);
    expect(merged).not.toContain("base/engine.js");
    expect((await readConfig(root)).base.entries).toBeUndefined();
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

describe("zazz-ui update across the manifest v1 → v2 shape change (0.4 → 0.5)", () => {
  it("drops the class layer, vendors the utilities layer and runtime, keeps the legacy wiring", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-update-v2-"));
    tmpDirs.push(root);
    await runInit(
      `@${V2}`,
      { dir: "zazz", fonts: true, themeScript: true, legacy: "../styles/old.css" },
      { cwd: root, silent: true },
    );
    await runAdd(["beta"], {}, { cwd: root, silent: true });
    expect(existsSync(at(root, "base/_utilities.css"))).toBe(true);

    await runUpdate([`@${V3}`], {}, { cwd: root, silent: true });

    expect(process.exitCode ?? 0).toBe(0);
    const config = await readConfig(root);
    expect(config.kit.version).toBe(V3);
    expect(config.base.version).toBeUndefined();

    // The 0.4 class layer is gone from disk and from the record.
    for (const file of ["base/_utilities.css", "base/_layout.css"]) {
      expect(existsSync(at(root, file)), file).toBe(false);
      expect(config.base.files[file], file).toBeUndefined();
    }
    // The manifest's exported inventory replaces the v1 fallback.
    for (const file of [
      ...V3_BASE_CSS_PRE,
      ...V3_BASE_CSS_POST,
      "base/navigation.js",
      "base/scroll-state.js",
      "base/scroll-state.d.ts",
    ]) {
      expect(existsSync(at(root, file)), file).toBe(true);
      expect(config.base.files[file], file).toBeDefined();
    }

    const indexCss = await readFile(at(root, "index.css"), "utf8");
    expect(indexCss).toContain(`@import "../styles/old.css" layer(legacy.imports);`);
    expect(indexCss).not.toContain("_utilities.css");
    expect(indexCss).not.toContain("_layout.css");
    const legacy = indexCss.indexOf("layer(legacy.imports)");
    const primitive = indexCss.indexOf("primitives/alpha/alpha.css");
    expect(indexCss.indexOf("base/_breakpoints.css")).toBeLessThan(legacy);
    expect(legacy).toBeLessThan(primitive);
    expect(primitive).toBeLessThan(indexCss.indexOf("base/_properties.css"));

    const indexJs = await readFile(at(root, "index.js"), "utf8");
    expect(indexJs).toContain(`import "./base/navigation.js";`);
    expect(indexJs).toContain(`void import("./base/scroll-state.js");`);
    expect(indexJs).toContain(`import "./primitives/beta/beta.js";`);
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

describe("importedStems", () => {
  it("reads static, from, and dynamic imports of kit files", () => {
    const stems = importedStems(
      [
        `import "./base/engine.js";`,
        `import { a } from './primitives/a/a.ts';`,
        `void import("./base/scroll-state.js");`,
        `import "signal-polyfill";`,
      ].join("\n"),
    );
    expect([...stems].sort()).toEqual(["base/engine", "base/scroll-state", "primitives/a/a"]);
  });

  it("ignores commented-out imports and counts both sides of a conflict", () => {
    const stems = importedStems(
      [
        `// import "./base/gone.js";`,
        `/* import "./base/also-gone.js"; */`,
        `<<<<<<< yours`,
        `import "./base/mine.js";`,
        `=======`,
        `import "./behaviors/theirs.js";`,
        `>>>>>>> 0.9.1`,
      ].join("\n"),
    );
    expect([...stems].sort()).toEqual(["base/mine", "behaviors/theirs"]);
  });
});
