"use strict";

/**
 * @fileoverview Per-file update classification and 3-way merging (ADR-0009).
 * @description `classify` turns one file's three states — ours (on disk),
 * base (pristine bytes at the recorded version), theirs (pristine bytes at
 * the target version) — plus the recorded hash into a disposition. The
 * recorded hash is what makes edits detectable: it is always the hash of
 * pristine bytes at vendor time, never the on-disk state. Text conflicts are
 * merged through node-diff3 with diff3-style labeled markers; anything
 * containing NUL bytes is treated as binary and never machine-merged.
 */

import { mergeDiff3 } from "node-diff3";
import { sha256 } from "./vendor.ts";

export type Disposition =
  /** Ours already matches theirs byte-for-byte; only the record moves. */
  | { kind: "unchanged" }
  /** Pristine here, changed upstream: silently take the new bytes. */
  | { kind: "take-theirs" }
  /** Edited here, unchanged upstream: your file stays as it is. */
  | { kind: "keep-ours" }
  /** Edited here and upstream, no overlap: the clean 3-way result. */
  | { kind: "auto-merged"; content: string }
  /** Overlapping edits. `markers` is the diff3-labeled text, null for binary. */
  | { kind: "conflict"; markers: string | null }
  /** Locally deleted; upstream still ships it: restore theirs (and report). */
  | { kind: "restore" }
  /** Removed upstream, no local edits: safe to delete. */
  | { kind: "delete-pristine" }
  /** Removed upstream but edited locally: the user decides keep/delete. */
  | { kind: "removed-upstream-edited" }
  /** New upstream file this project has no record of yet. */
  | { kind: "create" };

export interface ClassifyInput {
  /** On-disk bytes, or null when the file is missing locally. */
  ours: Buffer | null;
  /** Pristine bytes at the recorded version, or null if it didn't exist then. */
  base: Buffer | string | null;
  /** Pristine bytes at the target version, or null when removed upstream. */
  theirs: Buffer | string | null;
  /** The zazz.json hash, or null for files with no provenance record. */
  recordedHash: string | null;
  /** Marker labels, e.g. `{ ours: "yours", base: "0.1.0", theirs: "0.2.0" }`. */
  labels: { ours: string; base: string; theirs: string };
}

export function classify(input: ClassifyInput): Disposition {
  const { ours, base, theirs, recordedHash } = input;

  if (theirs === null) {
    if (ours === null) return { kind: "delete-pristine" }; // both gone: drop the record
    if (recordedHash !== null && sha256(ours) === recordedHash) {
      return { kind: "delete-pristine" };
    }
    return { kind: "removed-upstream-edited" };
  }

  if (recordedHash === null) return { kind: "create" };
  if (ours === null) return { kind: "restore" };
  if (bytesEqual(ours, theirs)) return { kind: "unchanged" };

  const edited = sha256(ours) !== recordedHash;
  if (!edited) return { kind: "take-theirs" };
  if (base !== null && bytesEqual(base, theirs)) return { kind: "keep-ours" };

  // Both sides moved. Binary content is never machine-merged.
  if (isBinary(ours) || (base !== null && isBinary(base)) || isBinary(theirs)) {
    return { kind: "conflict", markers: null };
  }
  return merge3(
    ours.toString("utf8"),
    base === null ? "" : toText(base),
    toText(theirs),
    input.labels,
  );
}

/**
 * @description 3-way text merge. `excludeFalseConflicts` keeps identical
 * both-sides edits out of the conflict count; splitting on `\r?\n` and
 * joining with `\n` means merged output is LF-normalized.
 */
export function merge3(
  ours: string,
  base: string,
  theirs: string,
  labels: { ours: string; base: string; theirs: string },
): Disposition {
  const merged = mergeDiff3(ours, base, theirs, {
    excludeFalseConflicts: true,
    stringSeparator: /\r?\n/,
    label: { a: labels.ours, o: labels.base, b: labels.theirs },
  });
  const content = merged.result.join("\n");
  if (merged.conflict) return { kind: "conflict", markers: content };
  return { kind: "auto-merged", content };
}

/** NUL byte anywhere = binary; the same heuristic git uses. */
export function isBinary(content: Buffer | string): boolean {
  return typeof content === "string" ? content.includes("\0") : content.includes(0);
}

function toText(content: Buffer | string): string {
  return typeof content === "string" ? content : content.toString("utf8");
}

function bytesEqual(a: Buffer | string, b: Buffer | string): boolean {
  const bufA = typeof a === "string" ? Buffer.from(a) : a;
  const bufB = typeof b === "string" ? Buffer.from(b) : b;
  return bufA.equals(bufB);
}
