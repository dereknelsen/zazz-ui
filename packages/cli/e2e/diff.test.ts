"use strict";

/**
 * @fileoverview E2e for `zazz-ui diff` against the two-version fixture kit:
 * read-only, prints per-unit patches and the changelog slice.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { runAdd } from "../src/commands/add.ts";
import { runDiff } from "../src/commands/diff.ts";
import { runInit } from "../src/commands/init.ts";
import { V1, V1_VARIABLES, V2, buildFixtureKits } from "./fixture-kit.ts";

const tmpDirs: string[] = [];
let previousKitEnv: string | undefined;
let root: string;

beforeAll(async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-diff-kit-"));
  tmpDirs.push(scratch);
  previousKitEnv = process.env.ZAZZ_UI_KIT;
  process.env.ZAZZ_UI_KIT = await buildFixtureKits(scratch);

  root = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-diff-"));
  tmpDirs.push(root);
  await runInit(
    `@${V1}`,
    { dir: "zazz", fonts: true, themeScript: true },
    { cwd: root, silent: true },
  );
  await runAdd(["beta"], {}, { cwd: root, silent: true });
});

afterAll(async () => {
  if (previousKitEnv === undefined) delete process.env.ZAZZ_UI_KIT;
  else process.env.ZAZZ_UI_KIT = previousKitEnv;
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

/** Runs diff with output captured from the non-interactive console path. */
async function capturedDiff(args: string[], flags: { upstream?: boolean } = {}): Promise<string> {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await runDiff(args, flags, { cwd: root });
  return log.mock.calls.map((call) => call.join(" ")).join("\n");
}

describe("zazz-ui diff (e2e, fixture kit)", () => {
  it("shows upstream changes, additions, and removals without writing anything", async () => {
    const configBefore = await readFile(path.join(root, "zazz.json"), "utf8");
    const output = await capturedDiff([`@${V2}`]);

    expect(output).toContain("base/_variables.css");
    expect(output).toContain("+  --delta: 4;");
    expect(output).toContain("alpha-extra.css");
    expect(output).toContain("new at this version");
    expect(output).toContain("beta-old.css");
    expect(output).toContain("removed upstream");
    // The changelog slice rides along, breaking entry included.
    expect(output).toContain("BREAKING");

    expect(await readFile(path.join(root, "zazz.json"), "utf8")).toBe(configBefore);
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("narrows to one unit and flags local edits", async () => {
    const file = path.join(root, "zazz", "base", "_variables.css");
    const pristine = await readFile(file, "utf8");
    await writeFile(file, V1_VARIABLES.replace("--gamma: 3;", "--gamma: 30;"));
    try {
      const output = await capturedDiff([`@${V2}`, "base"]);
      expect(output).toContain("edited locally");
      expect(output).toContain("-  --gamma: 30;");
      // alpha's own diff is out of scope (its hunks would carry the v2 header).
      expect(output).not.toContain(`/* alpha ${V2} */`);
    } finally {
      await writeFile(file, pristine);
    }
  });

  it("--upstream compares pristine recorded against pristine target", async () => {
    const file = path.join(root, "zazz", "base", "_variables.css");
    const pristine = await readFile(file, "utf8");
    await writeFile(file, V1_VARIABLES.replace("--gamma: 3;", "--gamma: 30;"));
    try {
      const output = await capturedDiff([`@${V2}`, "base"], { upstream: true });
      // Local edits are invisible upstream-vs-upstream.
      expect(output).not.toContain("--gamma: 30;");
      expect(output).toContain("+  --beta: 20;");
    } finally {
      await writeFile(file, pristine);
    }
  });

  it("reports nothing to show at the recorded version", async () => {
    const output = await capturedDiff([`@${V1}`]);
    expect(output).toContain(`No differences against ${V1}`);
  });
});
