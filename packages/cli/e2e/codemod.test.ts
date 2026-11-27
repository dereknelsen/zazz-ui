"use strict";

/**
 * @fileoverview E2e for `zazz-ui codemod data-font` against the packed kit:
 * the markup rewrite, the primitives it vendors for what the markup uses, the
 * directories it stays out of, and the update it runs first on a kit that
 * predates `data-font` (the fixture kit, which never gains the primitive).
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vite-plus/test";
import { runAdd } from "../src/commands/add.ts";
import { runCodemod } from "../src/commands/codemod.ts";
import { runInit } from "../src/commands/init.ts";
import type { ZazzConfig } from "../src/config.ts";
import { V1, V3, buildFixtureKits } from "./fixture-kit.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
afterEach(() => {
  process.exitCode = 0;
});

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-codemod-"));
  tmpDirs.push(dir);
  return dir;
}

const BASE_FLAGS = { dir: "zazz", fonts: true, themeScript: true };
const OLD_PAGE = `<main data-ui="layout">
  <span data-ui="text-eyebrow">News</span>
  <span data-ui="badge text-xs">New</span>
  <a data-ui="text-sm text-link" href="/terms">Terms</a>
</main>
`;
const NEW_PAGE = `<main data-ui="layout">
  <span data-font="eyebrow">News</span>
  <span data-ui="badge" data-font="xs">New</span>
  <a data-ui="link" data-font="sm" href="/terms">Terms</a>
</main>
`;

/** A project on the packed kit with badge vendored and one page of old markup. */
async function project(): Promise<string> {
  const dir = await tmpDir();
  await runInit(undefined, BASE_FLAGS, { cwd: dir, silent: true });
  await runAdd(["badge"], {}, { cwd: dir, silent: true });
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src/page.html"), OLD_PAGE);
  return dir;
}

async function readConfig(root: string): Promise<ZazzConfig> {
  return JSON.parse(await readFile(path.join(root, "zazz.json"), "utf8")) as ZazzConfig;
}

describe("zazz-ui codemod data-font (e2e, packed kit)", () => {
  it("rewrites the markup and vendors the primitives it now uses", async () => {
    const dir = await project();
    await writeFile(
      path.join(dir, "src/site.css"),
      `[data-ui~="text-eyebrow"] {\n  color: red;\n}\n`,
    );
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });

    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(NEW_PAGE);
    expect(await readFile(path.join(dir, "src/site.css"), "utf8")).toBe(
      `[data-font="eyebrow"] {\n  color: red;\n}\n`,
    );
    const config = await readConfig(dir);
    expect(config.primitives["font"]?.version).toBe(config.kit.version);
    expect(config.primitives["link"]).toBeDefined();
    // nothing on the page is prose
    expect(config.primitives["prose"]).toBeUndefined();
    expect(existsSync(path.join(dir, "zazz/primitives/font/font.css"))).toBe(true);
    const css = await readFile(path.join(dir, "zazz/index.css"), "utf8");
    expect(css).toContain("./primitives/font/font.css");
    expect(css.indexOf("./primitives/badge/")).toBeLessThan(css.indexOf("./primitives/font/"));
  });

  it("stays out of the vendored kit, node_modules, and build output", async () => {
    const dir = await project();
    for (const skipped of ["node_modules/pkg", "dist", "zazz/primitives/badge"]) {
      await mkdir(path.join(dir, skipped), { recursive: true });
      await writeFile(path.join(dir, skipped, "old.html"), OLD_PAGE);
    }
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    for (const skipped of ["node_modules/pkg", "dist", "zazz/primitives/badge"]) {
      expect(await readFile(path.join(dir, skipped, "old.html"), "utf8"), skipped).toBe(OLD_PAGE);
    }
  });

  it("never rewrites a vendored kit: a trailing slash in dir, a path into it, or a nested project", async () => {
    const dir = await tmpDir();
    await runInit(undefined, { ...BASE_FLAGS, dir: "zazz/" }, { cwd: dir, silent: true });
    const kitFile = path.join(dir, "zazz/base/old.css");
    await writeFile(kitFile, `[data-ui~="text-sm"] {}\n`);
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    await runCodemod("data-font", ["zazz", "zazz/base/old.css"], {}, { cwd: dir, silent: true });
    expect(await readFile(kitFile, "utf8")).toBe(`[data-ui~="text-sm"] {}\n`);

    // from a monorepo root, the app's own zazz.json marks its kit directory
    const mono = await tmpDir();
    const app = path.join(mono, "apps/web");
    await mkdir(app, { recursive: true });
    await runInit(undefined, BASE_FLAGS, { cwd: app, silent: true });
    await writeFile(path.join(app, "zazz/base/old.css"), `[data-ui~="text-sm"] {}\n`);
    await writeFile(path.join(app, "page.html"), OLD_PAGE);
    await runCodemod("data-font", [], {}, { cwd: mono, silent: true });
    expect(await readFile(path.join(app, "page.html"), "utf8")).toBe(NEW_PAGE);
    expect(await readFile(path.join(app, "zazz/base/old.css"), "utf8")).toBe(
      `[data-ui~="text-sm"] {}\n`,
    );
  });

  it("leaves a file that is not UTF-8, minified bundles, and prose docs alone", async () => {
    const dir = await tmpDir();
    const latin1 = Buffer.concat([
      Buffer.from(`<p data-ui="text-sm">caf`),
      Buffer.from([0xe9]),
      Buffer.from(`</p>\n`),
    ]);
    await writeFile(path.join(dir, "legacy.php"), latin1);
    await writeFile(path.join(dir, "app.min.js"), `x='<p data-ui="text-sm">'`);
    await writeFile(
      path.join(dir, "CHANGELOG.md"),
      'Use `data-ui="text-sm"` before this release.\n',
    );
    await writeFile(path.join(dir, "page.html"), OLD_PAGE);
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    expect((await readFile(path.join(dir, "legacy.php"))).equals(latin1)).toBe(true);
    expect(await readFile(path.join(dir, "app.min.js"), "utf8")).toBe(`x='<p data-ui="text-sm">'`);
    expect(await readFile(path.join(dir, "CHANGELOG.md"), "utf8")).toContain(`data-ui="text-sm"`);
    expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(NEW_PAGE);
  });

  it("narrows to the paths it is given", async () => {
    const dir = await project();
    await mkdir(path.join(dir, "other"), { recursive: true });
    await writeFile(path.join(dir, "other/page.html"), OLD_PAGE);
    await runCodemod("data-font", ["src"], {}, { cwd: dir, silent: true });
    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(NEW_PAGE);
    expect(await readFile(path.join(dir, "other/page.html"), "utf8")).toBe(OLD_PAGE);
  });

  it("--dry-run writes nothing", async () => {
    const dir = await project();
    await runCodemod("data-font", [], { dryRun: true }, { cwd: dir, silent: true });
    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(OLD_PAGE);
    expect((await readConfig(dir)).primitives["font"]).toBeUndefined();
  });

  it("is a no-op the second time", async () => {
    const dir = await project();
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    const config = await readFile(path.join(dir, "zazz.json"), "utf8");
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(NEW_PAGE);
    expect(await readFile(path.join(dir, "zazz.json"), "utf8")).toBe(config);
  });

  it("rewrites markup in a project that does not vendor the kit", async () => {
    const dir = await tmpDir();
    await writeFile(path.join(dir, "page.html"), OLD_PAGE);
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(NEW_PAGE);
    expect(existsSync(path.join(dir, "zazz.json"))).toBe(false);
  });

  it("flags what needs a hand through the exit code", async () => {
    const dir = await tmpDir();
    await writeFile(path.join(dir, "app.js"), `el.setAttribute("data-ui", "text-xs");\n`);
    await runCodemod("data-font", [], {}, { cwd: dir, silent: true });
    expect(process.exitCode).toBe(2);
  });

  it("rejects a codemod it does not have", async () => {
    await expect(runCodemod("nope", [], {}, { cwd: await tmpDir(), silent: true })).rejects.toThrow(
      /unknown codemod "nope"/,
    );
  });

  it("updates a kit that predates data-font before it rewrites anything", async () => {
    const scratch = await tmpDir();
    const previous = process.env.ZAZZ_UI_KIT;
    process.env.ZAZZ_UI_KIT = await buildFixtureKits(scratch);
    try {
      const dir = await tmpDir();
      await runInit(`@${V1}`, BASE_FLAGS, { cwd: dir, silent: true });
      await writeFile(path.join(dir, "page.html"), OLD_PAGE);
      // the fixture's newest kit still has no font primitive, so the codemod stops there
      await expect(
        runCodemod("data-font", [`@${V3}`], {}, { cwd: dir, silent: true }),
      ).rejects.toThrow(/has no `font` primitive/);
      expect((await readConfig(dir)).kit.version).toBe(V3);
      expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(OLD_PAGE);
    } finally {
      if (previous === undefined) delete process.env.ZAZZ_UI_KIT;
      else process.env.ZAZZ_UI_KIT = previous;
    }
  });
});
