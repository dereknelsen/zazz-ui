"use strict";

/**
 * @fileoverview The CLI's one error type and its canonical messages.
 * @description Commands and modules throw `ZazzError` for every expected
 * failure; the boundary in `cli.ts` renders `message` (and `hint`, dimmed)
 * and exits with `exitCode`. Exit codes: 1 = hard error, 2 = completed with
 * skipped files (CI can tell "broken" from "needs a human merge").
 */

export class ZazzError extends Error {
  readonly exitCode: number;
  readonly hint: string | undefined;

  constructor(message: string, options: { exitCode?: number; hint?: string } = {}) {
    super(message);
    this.name = "ZazzError";
    this.exitCode = options.exitCode ?? 1;
    this.hint = options.hint;
  }
}

/** The offline cache-miss error (ticket 02's canonical wording). */
export function offlineMiss(spec: string): ZazzError {
  return new ZazzError(`cannot reach npm and ${spec} is not cached`, {
    hint: "reconnect, or drop --offline; exact versions cache after the first fetch",
  });
}

/** The kit-newer-than-CLI error (ADR-0010's graceful failure). */
export function kitTooNew(version: string, detail: string): ZazzError {
  return new ZazzError(`@zazz-ui/core@${version} is newer than this CLI understands (${detail})`, {
    hint: "upgrade with: pnpm dlx zazz-ui@latest (or npm i -g zazz-ui@latest)",
  });
}
