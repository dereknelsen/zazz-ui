"use strict";

/**
 * @fileoverview The stray-file collision prompt (ticket 01), shared by every
 * command that writes files it has no provenance record for.
 * @description A write whose destination already exists is a conflict: prompt
 * (default no), or overwrite everything under `--force`. Skipped paths are
 * reported by the caller and turn the exit code to 2 — the file's pristine
 * hash is still recorded, so repair/update can reason about it later.
 */

import { existsSync } from "node:fs";
import type { Write } from "./transaction.ts";
import type { Ui } from "./ui.ts";

export async function filterCollisions(
  writes: Write[],
  context: { ui: Ui; force: boolean },
): Promise<{ kept: Write[]; skipped: string[] }> {
  if (context.force) return { kept: writes, skipped: [] };
  const kept: Write[] = [];
  const skipped: string[] = [];
  for (const write of writes) {
    if (!existsSync(write.dest)) {
      kept.push(write);
      continue;
    }
    const overwrite = await context.ui.confirm(`${write.dest} already exists. Overwrite?`, false);
    if (overwrite) kept.push(write);
    else skipped.push(write.dest);
  }
  return { kept, skipped };
}
