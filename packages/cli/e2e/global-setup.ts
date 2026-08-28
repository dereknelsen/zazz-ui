"use strict";

/**
 * @fileoverview Vitest global setup: packs the workspace's @zazz-ui/core into
 * a tarball once per run and points the kit engine at it through the
 * environment (`ZAZZ_UI_KIT=file:<tgz>`, plus an isolated `XDG_CACHE_HOME` so
 * tests never touch the user's cache). Workers inherit the env, so tests need
 * no wiring — this is the spec's "e2e tests vendor from a locally packed
 * tarball" seam.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default function setup(): () => void {
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

  // vp can't nest (vp test → vp pack fails to spawn), so the kit build is a
  // prerequisite rather than a setup step. The repo `ready` script builds
  // before testing; a fresh checkout needs one `vp run core#build` first.
  const compiled = path.join(repoRoot, "packages/core/src/manifest.js");
  if (!existsSync(compiled)) {
    throw new Error(
      "the kit isn't built (packages/core/src/manifest.js missing) — run `vp run core#build` once, then re-run tests",
    );
  }

  const scratch = mkdtempSync(path.join(os.tmpdir(), "zazz-cli-e2e-"));
  execSync(`pnpm --filter @zazz-ui/core pack --pack-destination "${scratch}"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });
  const tarball = readdirSync(scratch).find((name) => name.endsWith(".tgz"));
  if (!tarball) throw new Error("packing @zazz-ui/core produced no tarball");

  process.env.ZAZZ_UI_KIT = `file:${path.join(scratch, tarball)}`;
  process.env.XDG_CACHE_HOME = path.join(scratch, "cache");

  return () => {
    delete process.env.ZAZZ_UI_KIT;
    delete process.env.XDG_CACHE_HOME;
    rmSync(scratch, { recursive: true, force: true });
  };
}
