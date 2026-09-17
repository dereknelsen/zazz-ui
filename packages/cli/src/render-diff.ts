"use strict";

/**
 * @fileoverview The one coloured unified-diff renderer the `diff` and
 * `migrate` commands share.
 * @description Renders `structuredPatch` hunks the way `git diff --color`
 * does: a bold heading, cyan `@@` hunk headers, green additions, red
 * removals, dim context. Text only — callers decide what a missing or binary
 * side means and what the heading carries (the `diff` command adds its
 * "edited locally" badge).
 */

import chalk from "chalk";
import { structuredPatch } from "diff";

/** Lines of unchanged context around each hunk. */
const CONTEXT = 3;

/**
 * @description Renders one file's coloured unified diff, or null when the
 * two texts produce no hunk.
 *
 * @param file - The path shown in the heading (and the patch's file names).
 * @param before - The old text.
 * @param after - The new text.
 * @param options - `heading` replaces the default bold file name.
 * @returns The diff block, or null when there is nothing to show.
 */
export function renderFileDiff(
  file: string,
  before: string,
  after: string,
  options: { heading?: string } = {},
): string | null {
  const patch = structuredPatch(file, file, before, after, undefined, undefined, {
    context: CONTEXT,
  });
  if (patch.hunks.length === 0) return null;
  const lines: string[] = [options.heading ?? chalk.bold(file)];
  for (const hunk of patch.hunks) {
    lines.push(
      chalk.cyan(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`),
    );
    for (const line of hunk.lines) {
      if (line.startsWith("+")) lines.push(chalk.green(line));
      else if (line.startsWith("-")) lines.push(chalk.red(line));
      else lines.push(chalk.dim(line));
    }
  }
  return lines.join("\n");
}
