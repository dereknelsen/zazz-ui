"use strict";

/**
 * @fileoverview E2e for `zazz-ui codemod small-sizes` against the packed kit:
 * removing the small sizes from the markup (the default), keeping them by
 * adding their rules to the vendored button and toggle, and keeping them in a
 * stylesheet of the project's own when there is no zazz.json.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vite-plus/test";
import { runAdd } from "../src/commands/add.ts";
import { SMALL_SIZES_FILE, runCodemod } from "../src/commands/codemod.ts";
import { runInit } from "../src/commands/init.ts";

const tmpDirs: string[] = [];
afterAll(async () => {
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});
afterEach(() => {
  process.exitCode = 0;
});

async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-small-sizes-"));
  tmpDirs.push(dir);
  return dir;
}

const OLD_PAGE = `<div data-ui="toolbar">
  <button data-ui="button" data-button-size="sm">Save</button>
  <button data-ui="button" data-button-size="icon-sm" aria-label="Close"></button>
  <label data-ui="toggle" data-toggle-size="sm"><input type="checkbox" name="b" />Bold</label>
  <dialog data-ui="dialog" data-dialog-size="sm"></dialog>
</div>
`;
const NEW_PAGE = `<div data-ui="toolbar">
  <button data-ui="button">Save</button>
  <button data-ui="button" data-button-size="icon" aria-label="Close"></button>
  <label data-ui="toggle"><input type="checkbox" name="b" />Bold</label>
  <dialog data-ui="dialog" data-dialog-size="sm"></dialog>
</div>
`;

/** A vendored project with button and toggle, and one page of small sizes. */
async function project(): Promise<string> {
  const dir = await tmpDir();
  await runInit(
    undefined,
    { dir: "zazz", fonts: true, themeScript: true },
    { cwd: dir, silent: true },
  );
  await runAdd(["button", "toggle"], {}, { cwd: dir, silent: true });
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src/page.html"), OLD_PAGE);
  return dir;
}

describe("zazz-ui codemod small-sizes (e2e, packed kit)", () => {
  it("removes the small sizes by default, and leaves the kit alone", async () => {
    const dir = await project();
    const buttonCss = await readFile(path.join(dir, "zazz/primitives/button/button.css"), "utf8");
    await writeFile(
      path.join(dir, "src/site.css"),
      `[data-button-size="sm"] {\n  color: red;\n}\n`,
    );
    await runCodemod("small-sizes", [], {}, { cwd: dir, silent: true });

    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(NEW_PAGE);
    // a selector is listed for review, not rewritten
    expect(await readFile(path.join(dir, "src/site.css"), "utf8")).toContain(
      '[data-button-size="sm"]',
    );
    expect(process.exitCode).toBe(2);
    expect(await readFile(path.join(dir, "zazz/primitives/button/button.css"), "utf8")).toBe(
      buttonCss,
    );
  });

  it("keeps them with --restore: the rules go into the vendored button and toggle, once", async () => {
    const dir = await project();
    await runCodemod("small-sizes", [], { restore: true }, { cwd: dir, silent: true });
    await runCodemod("small-sizes", [], { restore: true }, { cwd: dir, silent: true });

    expect(await readFile(path.join(dir, "src/page.html"), "utf8")).toBe(OLD_PAGE);
    for (const primitive of ["button", "toggle"]) {
      const css = await readFile(
        path.join(dir, `zazz/primitives/${primitive}/${primitive}.css`),
        "utf8",
      );
      expect(
        css.match(new RegExp(`\\[data-${primitive}-size="icon-sm"\\]\\)? \\{`, "g")),
      ).toHaveLength(1);
      expect(css).toContain("Added by `zazz-ui codemod small-sizes`");
    }
  });

  it("keeps them in a stylesheet of the project's own when there is no zazz.json", async () => {
    const dir = await tmpDir();
    await writeFile(path.join(dir, "page.html"), OLD_PAGE);
    await runCodemod("small-sizes", [], { restore: true }, { cwd: dir, silent: true });

    const css = await readFile(path.join(dir, SMALL_SIZES_FILE), "utf8");
    expect(css).toContain('[data-button-size="sm"]');
    expect(css).toContain('[data-toggle-size="icon-sm"]');
    expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(OLD_PAGE);
  });

  it("keeps them even when the vendored kit still ships its own copy, so an update can't drop them", async () => {
    const dir = await project();
    const file = path.join(dir, "zazz/primitives/button/button.css");
    // an older kit: its own small-size rule is in the vendored file
    await writeFile(
      file,
      `${await readFile(file, "utf8")}\n:where([data-ui~="button"][data-button-size="sm"]) {}\n`,
    );
    await runCodemod("small-sizes", [], { restore: true }, { cwd: dir, silent: true });
    expect(await readFile(file, "utf8")).toContain("Added by `zazz-ui codemod small-sizes`");
  });

  it("falls back to its own stylesheet for a primitive that isn't vendored, and appends to it", async () => {
    const dir = await tmpDir();
    await runInit(
      undefined,
      { dir: "zazz", fonts: true, themeScript: true },
      { cwd: dir, silent: true },
    );
    await runAdd(["button"], {}, { cwd: dir, silent: true });
    await writeFile(path.join(dir, SMALL_SIZES_FILE), "/* mine */\n");
    await runCodemod("small-sizes", [], { restore: true }, { cwd: dir, silent: true });

    const own = await readFile(path.join(dir, SMALL_SIZES_FILE), "utf8");
    expect(own.startsWith("/* mine */\n")).toBe(true);
    expect(own).toContain('[data-toggle-size="icon-sm"]');
    expect(own).not.toContain('[data-button-size="icon-sm"]');
    expect(await readFile(path.join(dir, "zazz/primitives/button/button.css"), "utf8")).toContain(
      '[data-button-size="icon-sm"]',
    );
  });

  it("ignores an @version argument instead of reading it as a path", async () => {
    const dir = await tmpDir();
    await writeFile(path.join(dir, "page.html"), OLD_PAGE);
    await runCodemod("small-sizes", ["@latest"], {}, { cwd: dir, silent: true });
    expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(NEW_PAGE);
  });

  it("writes nothing on a dry run", async () => {
    const dir = await tmpDir();
    await writeFile(path.join(dir, "page.html"), OLD_PAGE);
    await runCodemod("small-sizes", [], { dryRun: true }, { cwd: dir, silent: true });
    await runCodemod(
      "small-sizes",
      [],
      { dryRun: true, restore: true },
      { cwd: dir, silent: true },
    );

    expect(await readFile(path.join(dir, "page.html"), "utf8")).toBe(OLD_PAGE);
    expect(existsSync(path.join(dir, SMALL_SIZES_FILE))).toBe(false);
  });
});
