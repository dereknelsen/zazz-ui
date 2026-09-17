"use strict";

/**
 * @fileoverview `zazz-ui migrate` — rewrite a project's sources for a new kit
 * version using the rename rules the kit ships.
 * @description Dry run by default: prints a coloured unified diff per file,
 * the hit count per rule, the files-changed total, and everything the rules
 * could not map (`file:line: snippet — note`). `--write` applies the same
 * rewrites in place and, in a vendored project, stamps `migrated: <to>` in
 * zazz.json so the next run refuses to shift the sources twice (the chain
 * shifts in the engine are simultaneous within a run, not idempotent across
 * runs). Rules come from `migrations/<to>.json` inside the resolved kit
 * tarball (read the way `update` reads CHANGELOG.md) or from `--rules <file>`.
 * Only the project's own sources are scanned: `node_modules`, `dist`, `.git`
 * and the vendored `dir` are skipped — vendored files move via `update`.
 */

import { type Dirent, existsSync, globSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { structuredPatch } from "diff";
import { compareVersions } from "../changelog.ts";
import { type ZazzConfig, loadConfig, saveConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { kitSpec, resolveKit } from "../kit.ts";
import { isBinary } from "../merge.ts";
import {
  type Compiled,
  type FileKind,
  type Rules,
  type Unmappable,
  applyToText,
  compile,
  loadRules,
  ruleId,
} from "../migrate.ts";
import { loadFetchOptions } from "../npmrc.ts";
import { type Ui, createUi } from "../ui.ts";
import { type GlobalFlags, parseVersionArg } from "./init.ts";

export interface MigrateFlags {
  /** Target kit version, @-prefixed or bare; default latest. */
  to?: string;
  /** The version the sources are on; default from zazz.json. */
  from?: string;
  /** A local rules file instead of the kit's `migrations/<to>.json`. */
  rules?: string;
  /** Apply the rewrites; default is a dry run. */
  write?: boolean;
  /** Only files matching one of these globs (relative to cwd). */
  include?: string[];
  /** Skip files matching one of these globs (relative to cwd). */
  exclude?: string[];
}

/** Extension → engine file kind; the scanned set is exactly these keys. */
const FILE_KINDS: Readonly<Record<string, FileKind>> = {
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".astro": "html",
  ".vue": "html",
  ".svelte": "html",
  ".md": "md",
  ".mdx": "md",
  ".js": "js",
  ".jsx": "js",
  ".ts": "js",
  ".tsx": "js",
};

const SCAN_GLOB = `**/*.{${Object.keys(FILE_KINDS)
  .map((ext) => ext.slice(1))
  .join(",")}}`;

/** Directory names never descended into, wherever they sit. */
const SKIPPED_DIRS: ReadonlySet<string> = new Set(["node_modules", "dist", ".git"]);

export async function runMigrate(
  paths: string[],
  flags: MigrateFlags,
  global: GlobalFlags,
): Promise<void> {
  const cwd = path.resolve(global.cwd);
  const ui = createUi({ silent: global.silent === true, yes: global.yes === true });
  const loaded = await loadConfig(cwd);

  ui.intro("zazz-ui migrate");
  const rules = await loadRuleSet(flags, { cwd, global, ui });
  const to = rules.to;
  const from = resolveFrom(flags.from, loaded?.config ?? null);
  if (compareVersions(from, to) >= 0) {
    throw new ZazzError(`already migrated: this project is at ${from}, the rules target ${to}`, {
      hint:
        loaded?.config.migrated !== undefined
          ? `zazz.json records migrated ${loaded.config.migrated}; pass --from <version> to override`
          : "pass --from <version> if the sources are older than zazz.json says",
    });
  }
  if (!inLine(from, rules.from)) {
    ui.warn(`these rules migrate from the ${rules.from} line; this project is at ${from}`);
  }

  const files = discoverFiles(paths, {
    cwd,
    vendoredDir: loaded ? path.join(loaded.root, loaded.config.dir) : null,
    include: flags.include ?? [],
    exclude: flags.exclude ?? [],
    warn: (message) => ui.warn(message),
  });
  if (files.length === 0) {
    ui.outro("No source files to scan.");
    return;
  }

  const compiled = compile(rules);
  const results = await ui.spinner(
    `Scanning ${files.length} file${files.length === 1 ? "" : "s"}…`,
    () => applyToFiles(files, compiled),
    (done) => `Scanned ${done.length} file${done.length === 1 ? "" : "s"} (${from} → ${to})`,
  );

  const changed = results.filter((result) => result.after !== result.before);
  const unmappable = results.filter((result) => result.unmappable.length > 0);

  for (const result of changed) {
    ui.step(renderFileDiff(path.relative(cwd, result.file), result.before, result.after));
  }
  const counts = renderRuleCounts(compiled, results);
  if (counts) ui.step(counts);
  ui.step(`${changed.length} of ${results.length} file${results.length === 1 ? "" : "s"} changed.`);
  if (unmappable.length > 0) {
    const total = unmappable.reduce((sum, result) => sum + result.unmappable.length, 0);
    ui.warn(
      `Could not map ${total} place${total === 1 ? "" : "s"} — migrate these by hand:\n` +
        unmappable
          .flatMap((result) =>
            result.unmappable.map(
              (entry) =>
                `  ${path.relative(cwd, result.file)}:${entry.line}: ${entry.snippet} ${chalk.dim(`— ${entry.note}`)}`,
            ),
          )
          .join("\n"),
    );
    process.exitCode = 2;
  }

  if (flags.write !== true) {
    ui.outro(
      changed.length > 0
        ? "Dry run — nothing written. Re-run with --write to apply."
        : `Dry run — nothing to rewrite for ${to}.`,
    );
    return;
  }

  for (const result of changed) {
    await writeFile(result.file, result.after);
  }
  if (loaded) {
    loaded.config.migrated = to;
    await saveConfig(loaded.root, loaded.config);
  } else {
    // CDN/npm projects have no stamp, so nothing refuses a second --write —
    // and the chain shifts would move every prefix one more step.
    ui.warn(
      `no zazz.json — nothing records that these sources are now at ${to}; ` +
        "run --write once (a second run would shift the chain shifts again)",
    );
  }
  ui.outro(
    `${changed.length > 0 ? `Rewrote ${changed.length} file${changed.length === 1 ? "" : "s"}` : "Nothing to rewrite"} for ${to}` +
      (loaded ? `; zazz.json now records migrated ${to}.` : ".") +
      (loaded && compareVersions(loaded.config.kit.version, to) < 0
        ? ` Next: \`zazz-ui update @${to}\`.`
        : ""),
  );
}

// --- Rules ---

/**
 * @description Loads the rule set: `--rules <file>` read locally (no network),
 * else `migrations/<version>.json` from the resolved kit at `--to`.
 */
async function loadRuleSet(
  flags: MigrateFlags,
  context: { cwd: string; global: GlobalFlags; ui: Ui },
): Promise<Rules> {
  const { cwd, global, ui } = context;

  if (flags.rules !== undefined) {
    const file = path.resolve(cwd, flags.rules);
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      throw new ZazzError(`cannot read rules file ${flags.rules}: ${(error as Error).message}`);
    }
    const rules = loadRules(text, path.relative(cwd, file) || flags.rules);
    if (flags.to !== undefined && parseVersionArg(flags.to) !== rules.to) {
      throw new ZazzError(
        `--to ${flags.to} disagrees with ${flags.rules}, which targets ${rules.to}`,
        { hint: "drop --to when passing --rules; the file names its own target" },
      );
    }
    return rules;
  }

  const fetch = await loadFetchOptions({
    cwd,
    registry: global.registry,
    offline: global.offline,
    preferOffline: global.preferOffline,
  });
  const version = parseVersionArg(flags.to);
  const kit = await ui.spinner(
    `Resolving @zazz-ui/core@${version}…`,
    () => resolveKit(kitSpec(version), fetch),
    (resolved) => `Migrating to @zazz-ui/core@${resolved.version}`,
  );
  const relPath = path.posix.join("migrations", `${kit.version}.json`);
  const file = path.join(kit.extractDir, "migrations", `${kit.version}.json`);
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new ZazzError(`@zazz-ui/core@${kit.version} ships no migration rules (${relPath})`, {
      hint: "pick a version that has a migration with --to @<version>, or pass --rules <file>",
    });
  }
  return loadRules(text, `@zazz-ui/core@${kit.version}/${relPath}`);
}

/**
 * @description The version the sources are on: `--from`, else zazz.json's
 * `migrated` stamp, else its kit version. Throws when none is available.
 *
 * @param explicit - The `--from` value, @-prefixed or bare.
 * @param config - The loaded zazz.json, or null outside a vendored project.
 */
export function resolveFrom(
  explicit: string | undefined,
  config: Pick<ZazzConfig, "kit" | "migrated"> | null,
): string {
  if (explicit !== undefined) return parseVersionArg(explicit);
  if (config) return config.migrated ?? config.kit.version;
  throw new ZazzError("cannot tell which kit version these sources are on", {
    hint: "pass --from <version> (e.g. --from 0.4.1), or run inside a project with zazz.json",
  });
}

/** True when `version` belongs to the `line` the rules migrate from (`0.4` ⊇ `0.4.1`). */
export function inLine(version: string, line: string): boolean {
  return version === line || version.startsWith(`${line}.`);
}

// --- Files ---

/** The engine kind for a file, or null when the extension is not scanned. */
export function fileKindOf(file: string): FileKind | null {
  return FILE_KINDS[path.extname(file).toLowerCase()] ?? null;
}

export interface DiscoverOptions {
  cwd: string;
  /** Path of the vendored directory (as zazz.json spells it, resolved here), skipped during walks. */
  vendoredDir: string | null;
  include: string[];
  exclude: string[];
  /** Receives the one warning a walk can raise: the vendored dir is the scan root. */
  warn?: (message: string) => void;
}

/**
 * @description Resolves positional paths (default: cwd) to the absolute files
 * to scan. Directories are walked for the scanned extensions, skipping
 * `node_modules`, `dist`, `.git`, and the vendored directory; a file named
 * explicitly is taken as-is when its extension is scanned. `include` narrows
 * and `exclude` drops by glob, matched against the cwd-relative posix path.
 * A vendored directory that *is* a scan root (`dir: "."`) cannot be pruned
 * without scanning nothing, so the walk warns and scans it — the path was
 * asked for.
 *
 * @returns Absolute paths, deduplicated and sorted.
 */
export function discoverFiles(paths: string[], options: DiscoverOptions): string[] {
  const { cwd } = options;
  const vendoredDir = options.vendoredDir === null ? null : path.resolve(options.vendoredDir);
  const targets = paths.length > 0 ? paths.map((p) => path.resolve(cwd, p)) : [cwd];
  const found = new Set<string>();

  for (const target of targets) {
    if (!existsSync(target)) {
      throw new ZazzError(`no such file or directory: ${path.relative(cwd, target) || target}`);
    }
    if (statSync(target).isFile()) {
      if (fileKindOf(target) !== null) found.add(target);
      continue;
    }
    if (vendoredDir === target) {
      options.warn?.(
        `the vendored directory (${path.relative(cwd, vendoredDir) || "."}) is the scan root, so its files are scanned too; ` +
          "name the paths to migrate, or --exclude the kit files",
      );
    }
    const entries = globSync(SCAN_GLOB, {
      cwd: target,
      withFileTypes: true,
      exclude: (entry: Dirent) => {
        if (SKIPPED_DIRS.has(entry.name)) return true;
        return vendoredDir !== null && path.resolve(entry.parentPath, entry.name) === vendoredDir;
      },
    });
    for (const entry of entries) {
      if (entry.isFile()) found.add(path.join(entry.parentPath, entry.name));
    }
  }

  const relPosix = (file: string): string => path.relative(cwd, file).split(path.sep).join("/");
  const matches = (file: string, globs: string[]): boolean =>
    globs.some((glob) => path.matchesGlob(relPosix(file), glob));

  return [...found]
    .filter((file) => options.include.length === 0 || matches(file, options.include))
    .filter((file) => !matches(file, options.exclude))
    .sort();
}

// --- Application ---

interface FileResult {
  file: string;
  kind: FileKind;
  before: string;
  after: string;
  counts: Record<string, number>;
  unmappable: Unmappable[];
}

/** Runs the compiled rules over every file; binary files are skipped. */
async function applyToFiles(files: string[], compiled: Compiled): Promise<FileResult[]> {
  const results: FileResult[] = [];
  for (const file of files) {
    const kind = fileKindOf(file);
    if (kind === null) continue;
    const buffer = await readFile(file);
    if (isBinary(buffer)) continue;
    const before = buffer.toString("utf8");
    const { text, counts, unmappable } = applyToText(before, compiled, { kind });
    results.push({ file, kind, before, after: text, counts, unmappable });
  }
  return results;
}

// --- Rendering ---

/** One file's coloured unified diff (the `diff` command's rendering, for text). */
function renderFileDiff(file: string, before: string, after: string): string {
  const patch = structuredPatch(file, file, before, after, undefined, undefined, { context: 3 });
  const lines: string[] = [chalk.bold(file)];
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

/** Hits per rule in declaration order; null when no rule fired. */
function renderRuleCounts(compiled: Compiled, results: FileResult[]): string | null {
  const totals = new Map<string, number>();
  for (const result of results) {
    for (const [id, count] of Object.entries(result.counts)) {
      totals.set(id, (totals.get(id) ?? 0) + count);
    }
  }
  const rows = compiled.rules
    .map((rule) => ({ rule, count: totals.get(ruleId(rule)) ?? 0 }))
    .filter((row) => row.count > 0);
  if (rows.length === 0) return null;

  const labels = rows.map(({ rule }) =>
    rule.kind === "manual" ? `${rule.from} ${chalk.dim("(by hand)")}` : `${rule.from} → ${rule.to}`,
  );
  const width = Math.max(...labels.map((label) => stripAnsi(label).length));
  return [
    "Rules applied:",
    ...rows.map(
      ({ count }, index) =>
        `  ${labels[index]}${" ".repeat(width - stripAnsi(labels[index] ?? "").length)}  ${chalk.bold(String(count))}`,
    ),
  ].join("\n");
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- terminal escape sequences
  return text.replace(/\[[0-9;]*m/g, "");
}
