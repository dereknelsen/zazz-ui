"use strict";

/**
 * @fileoverview Slices the kit's CHANGELOG.md down to what a project cares
 * about: versions in `(from, to]`, sections whose scope touches the vendored
 * set. The changelog format is the kit's contract (see its intro): `## x.y.z`
 * version headers, `### scope` sections named after a primitive or `base`,
 * bullet lines, breaking entries flagged **BREAKING**.
 */

import chalk from "chalk";

interface VersionBlock {
  version: string;
  /** The `## …` line plus any preamble before the first `### scope`. */
  header: string[];
  sections: { scope: string; lines: string[] }[];
}

/**
 * @description Renders the relevant changelog slice, or null when nothing in
 * the range touches the given scopes. `scopes` should contain the vendored
 * primitive names; `base` and the generic `primitives` bucket always match.
 */
export function sliceChangelog(
  markdown: string,
  range: { from: string; to: string },
  scopes: Set<string>,
): string | null {
  if (compareVersions(range.to, range.from) <= 0) return null;

  const relevant = (scope: string): boolean =>
    scope === "base" || scope === "primitives" || scopes.has(scope);

  const out: string[] = [];
  for (const block of parseChangelog(markdown)) {
    if (
      compareVersions(block.version, range.from) <= 0 ||
      compareVersions(block.version, range.to) > 0
    ) {
      continue;
    }
    const sections = block.sections.filter((section) => relevant(section.scope));
    if (sections.length === 0 && block.sections.length > 0) continue;
    out.push(...block.header.map(styleLine));
    for (const section of sections) {
      out.push(chalk.bold(`### ${section.scope}`));
      out.push(...section.lines.map(styleLine));
    }
  }

  const text = trimBlankRuns(out).join("\n").trim();
  return text.length > 0 ? text : null;
}

/** Splits the changelog into version blocks; tolerant of prose around them. */
export function parseChangelog(markdown: string): VersionBlock[] {
  const blocks: VersionBlock[] = [];
  let current: VersionBlock | null = null;
  let section: { scope: string; lines: string[] } | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const versionMatch = /^##\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b(.*)$/.exec(line);
    if (versionMatch?.[1] !== undefined) {
      current = { version: versionMatch[1], header: [line], sections: [] };
      section = null;
      blocks.push(current);
      continue;
    }
    if (current === null) continue;

    const scopeMatch = /^###\s+(\S+)\s*$/.exec(line);
    if (scopeMatch?.[1] !== undefined) {
      section = { scope: scopeMatch[1], lines: [] };
      current.sections.push(section);
      continue;
    }
    if (section) section.lines.push(line);
    else current.header.push(line);
  }
  return blocks;
}

/** Highlights breaking entries; everything else passes through. */
function styleLine(line: string): string {
  if (line.startsWith("## ")) return chalk.bold(line);
  if (line.includes("**BREAKING**")) return chalk.red.bold(line);
  return line;
}

function trimBlankRuns(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === "" && out[out.length - 1]?.trim() === "") continue;
    out.push(line);
  }
  return out;
}

/** Plain x.y.z(-pre) comparison: negative when a < b. */
export function compareVersions(a: string, b: string): number {
  const [coreA = "", preA] = a.split("-", 2);
  const [coreB = "", preB] = b.split("-", 2);
  const partsA = coreA.split(".").map(Number);
  const partsB = coreB.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const delta = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (delta !== 0) return delta;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1; // release > its own prerelease
  if (preB === undefined) return -1;
  return preA < preB ? -1 : 1;
}
