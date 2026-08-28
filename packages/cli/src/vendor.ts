"use strict";

/**
 * @fileoverview Vendoring: pristine tarball bytes → write entries + hashes.
 * @description Reads each planned file's exact published bytes from the
 * resolved kit and produces transaction writes plus the provenance hashes
 * zazz.json records. Hashes are always of the pristine bytes — never what
 * lands on disk — so a skipped overwrite or later edit reads as "edited"
 * against the recorded version (ADR-0009).
 */

import { createHash } from "node:crypto";
import path from "node:path";
import type { FileHashes } from "./config.ts";
import type { ResolvedKit } from "./kit.ts";
import type { Write } from "./transaction.ts";

/** SSRI-style content hash: `sha256-<base64>`. */
export function sha256(bytes: Buffer | string): string {
  return `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
}

/**
 * @description Builds writes + hashes for a list of `src/`-relative kit files.
 *
 * @param kit - The resolved kit to read pristine bytes from.
 * @param files - `src/`-relative paths (posix, straight from the manifest).
 * @param destRoot - Absolute path of the project's vendor directory.
 */
export async function vendorFiles(
  kit: ResolvedKit,
  files: string[],
  destRoot: string,
): Promise<{ writes: Write[]; hashes: FileHashes }> {
  const writes: Write[] = [];
  const hashes: FileHashes = {};
  for (const file of files) {
    const content = await kit.readFile(file);
    hashes[file] = sha256(content);
    writes.push({
      dest: path.join(destRoot, ...file.split("/")),
      content,
      note: "vendor",
    });
  }
  return { writes, hashes };
}
