"use strict";

/**
 * @fileoverview Staged, near-atomic application of a command's write plan.
 * @description Every prompt is answered and every merge resolved before a
 * transaction exists — `apply` only moves bytes. Writes stage to sibling
 * `<dest>.zazz-tmp` files (same directory → same filesystem → atomic rename);
 * a failure during staging unlinks the temps and leaves the project exactly
 * as it was. `zazz.json` is written once, last, so a crash mid-commit leaves
 * provenance at the old state and a re-run self-heals.
 */

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { type ZazzConfig, saveConfig } from "./config.ts";

export interface Write {
  /** Absolute destination path. */
  dest: string;
  content: Buffer | string;
  /** Provenance tag for the dry-run rendering: vendor | entry | head | merge… */
  note: string;
}

export interface Transaction {
  /** Directory that owns zazz.json. */
  root: string;
  writes: Write[];
  /** Absolute paths removed at commit (upstream-removed files, ADR-0009). */
  deletes?: string[];
  config: ZazzConfig;
}

const TMP_SUFFIX = ".zazz-tmp";

/** The --dry-run rendering: relative path + note, one line per write. */
export function describe(tx: Transaction): string {
  const lines = tx.writes.map(
    (write) => `  ${write.note.padEnd(7)} ${path.relative(tx.root, write.dest)}`,
  );
  const deletes = (tx.deletes ?? []).map(
    (dest) => `  ${"delete".padEnd(7)} ${path.relative(tx.root, dest)}`,
  );
  return [...lines, ...deletes, `  config  zazz.json`].join("\n");
}

export async function apply(tx: Transaction): Promise<void> {
  const staged: string[] = [];
  try {
    for (const write of tx.writes) {
      await mkdir(path.dirname(write.dest), { recursive: true });
      const tmp = write.dest + TMP_SUFFIX;
      await writeFile(tmp, write.content);
      staged.push(tmp);
    }
  } catch (error) {
    await Promise.all(staged.map((tmp) => rm(tmp, { force: true })));
    throw error;
  }

  // Commit: renames are atomic per file; zazz.json lands last.
  for (const [index, write] of tx.writes.entries()) {
    const tmp = staged[index];
    if (tmp) await rename(tmp, write.dest);
  }
  for (const dest of tx.deletes ?? []) {
    await rm(dest, { force: true });
  }
  await saveConfig(tx.root, tx.config);
}
