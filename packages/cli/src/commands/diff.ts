"use strict";

/**
 * @fileoverview `zazz-ui diff` — preview what an update would change.
 * @description Read-only, always exit 0. Default compares your on-disk files
 * against the target version's exact pristine bytes; `--upstream` compares
 * pristine-at-recorded against pristine-at-target instead (what upstream
 * changed, regardless of your edits). Ends with the relevant changelog slice.
 * Generated entries diff against a regeneration at the target, mirroring what
 * `update` would produce.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { structuredPatch } from "diff";
import { compareVersions, sliceChangelog } from "../changelog.ts";
import { type ZazzConfig, loadConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { type ResolvedKit, kitSpec, resolveKit } from "../kit.ts";
import { loadFetchOptions } from "../npmrc.ts";
import { isBinary } from "../merge.ts";
import { baseFiles, primitiveFiles } from "../plan.ts";
import { createUi } from "../ui.ts";
import { sha256 } from "../vendor.ts";
import { appendJsImports, renderHead, renderIndexCss, renderIndexJs } from "../wiring.ts";
import type { GlobalFlags } from "./init.ts";
import { readChangelog, splitVersionArgs } from "./update.ts";

export interface DiffFlags {
  upstream?: boolean;
}

export async function runDiff(
  args: string[],
  flags: DiffFlags,
  global: GlobalFlags,
): Promise<void> {
  const cwd = path.resolve(global.cwd);
  const ui = createUi({ silent: global.silent === true, yes: global.yes === true });
  const fetch = await loadFetchOptions({
    cwd,
    registry: global.registry,
    offline: global.offline,
    preferOffline: global.preferOffline,
  });

  const loaded = await loadConfig(cwd);
  if (!loaded) {
    throw new ZazzError("no zazz.json found — this project isn't initialized", {
      hint: "run `zazz-ui init` first",
    });
  }
  const { config, root } = loaded;
  const { version, names } = splitVersionArgs(args);

  for (const name of names) {
    if (name !== "base" && !config.primitives[name]) {
      throw new ZazzError(`"${name}" isn't vendored in this project`, {
        hint: `vendored: ${["base", ...Object.keys(config.primitives).sort()].join(", ")}`,
      });
    }
  }

  ui.intro("zazz-ui diff");
  const target = await ui.spinner(
    `Resolving @zazz-ui/core@${version}…`,
    () => resolveKit(kitSpec(version), fetch),
    (resolved) => `Comparing against @zazz-ui/core@${resolved.version}`,
  );

  const kitCache = new Map<string, Promise<ResolvedKit>>();
  kitCache.set(target.version, Promise.resolve(target));
  const kitAt = (v: string): Promise<ResolvedKit> => {
    let kit = kitCache.get(v);
    if (!kit) {
      kit = resolveKit(kitSpec(v), fetch);
      kitCache.set(v, kit);
    }
    return kit;
  };

  const vendoredNames = Object.keys(config.primitives);
  const scope = names.length > 0 ? names : ["base", ...sortedByCascade(vendoredNames, target)];

  let changes = 0;
  for (const unit of scope) {
    const files = await unitFiles(unit, { config, target });
    const recordedVersion =
      unit === "base"
        ? (config.base.version ?? config.kit.version)
        : (config.primitives[unit]?.version ?? config.kit.version);
    const oldKit = flags.upstream === true ? await kitAt(recordedVersion) : null;

    const lines: string[] = [];
    for (const spec of files) {
      const theirs = await spec.theirs();
      const mine =
        flags.upstream === true
          ? oldKit === null
            ? null
            : await upstreamSource(spec, oldKit, { config, target: oldKit })
          : await localSource(spec, root, config);
      const rendered = renderFileDiff(spec.file, mine, theirs, {
        editedLocally:
          flags.upstream !== true &&
          mine !== null &&
          spec.recordedHash !== null &&
          sha256(mine) !== spec.recordedHash,
      });
      if (rendered) lines.push(rendered);
    }
    if (lines.length > 0) {
      changes += lines.length;
      ui.step(
        `${chalk.bold(unit)} ${chalk.dim(`(${recordedVersion} → ${target.version})`)}\n${lines.join("\n")}`,
      );
    }
  }

  if (changes === 0) {
    ui.step(`No differences against ${target.version}.`);
  }

  const changelog = await readChangelog(target);
  if (changelog && compareVersions(target.version, config.kit.version) > 0) {
    const slice = sliceChangelog(
      changelog,
      { from: config.kit.version, to: target.version },
      new Set(vendoredNames),
    );
    if (slice) ui.step(slice);
  }
  ui.outro(`Read-only — run \`zazz-ui update @${target.version}\` to apply.`);
}

interface FileSpec {
  file: string;
  recordedHash: string | null;
  theirs: () => Promise<Buffer | string | null>;
}

/** The file set for one unit, with target-pristine (or regenerated) sources. */
async function unitFiles(
  unit: string,
  context: { config: ZazzConfig; target: ResolvedKit },
): Promise<FileSpec[]> {
  const { config, target } = context;
  const fromKit = (file: string) => async () => (target.has(file) ? target.readFile(file) : null);

  if (unit !== "base") {
    const record = config.primitives[unit];
    const entry = target.manifest.primitives[unit];
    const recorded = record ? Object.keys(record.files) : [];
    const wantExamples =
      entry !== undefined && entry.examples.some((file) => record && file in record.files);
    const needed = entry ? primitiveFiles(entry, config.language, { examples: wantExamples }) : [];
    return [...new Set([...recorded, ...needed])].map((file) => ({
      file,
      recordedHash: record?.files[file] ?? null,
      theirs: fromKit(file),
    }));
  }

  const generated = new Set(["index.css", "index.js", "index.ts", "head.html"]);
  const entryScript = config.language === "ts" ? "index.ts" : "index.js";
  const vendorable = [
    ...new Set([
      ...Object.keys(config.base.files).filter((file) => !generated.has(file)),
      ...baseFiles(target.manifest, config.language),
    ]),
  ];
  const entries = generateEntries(target, config);
  return [
    ...vendorable.map((file) => ({
      file,
      recordedHash: config.base.files[file] ?? null,
      theirs: fromKit(file),
    })),
    {
      file: "index.css",
      recordedHash: config.base.files["index.css"] ?? null,
      theirs: async () => entries.css,
    },
    {
      file: entryScript,
      recordedHash: config.base.files[entryScript] ?? null,
      theirs: async () => entries.js,
    },
    {
      file: "head.html",
      recordedHash: config.base.files["head.html"] ?? null,
      theirs: async () => renderHead(target, config),
    },
  ];
}

/** Entry pair regenerated at the target with the currently vendored set. */
function generateEntries(target: ResolvedKit, config: ZazzConfig): { css: string; js: string } {
  const cascade = new Map(target.manifest.cssCascadeOrder.map((name, index) => [name, index]));
  const ordered = Object.keys(config.primitives)
    .filter((name) => target.manifest.primitives[name])
    .sort((a, b) => (cascade.get(a) ?? Infinity) - (cascade.get(b) ?? Infinity));
  const css = renderIndexCss({
    kit: target,
    legacy: config.legacy,
    primitives: ordered.map((name) => ({
      name,
      css: target.manifest.primitives[name]?.css ?? [],
    })),
  });
  const scripts = ordered.flatMap((name) => {
    const entry = target.manifest.primitives[name];
    return entry ? [...entry.base, ...entry.js] : [];
  });
  const js = appendJsImports(
    renderIndexJs({ kit: target, language: config.language }),
    [...new Set(scripts)],
    config.language,
  );
  return { css, js };
}

async function localSource(
  spec: FileSpec,
  root: string,
  config: { dir: string },
): Promise<Buffer | null> {
  const dest = path.join(root, config.dir, ...spec.file.split("/"));
  return existsSync(dest) ? readFile(dest) : null;
}

/** `--upstream` left side: pristine at the recorded version (or regenerated). */
async function upstreamSource(
  spec: FileSpec,
  oldKit: ResolvedKit,
  context: { config: ZazzConfig; target: ResolvedKit },
): Promise<Buffer | string | null> {
  if (oldKit.has(spec.file)) return oldKit.readFile(spec.file);
  const entries = generateEntries(oldKit, context.config);
  if (spec.file === "index.css") return entries.css;
  if (spec.file === "index.js" || spec.file === "index.ts") return entries.js;
  if (spec.file === "head.html") return renderHead(oldKit, context.config);
  return null;
}

/** One file's colorized diff block, or null when there is nothing to show. */
function renderFileDiff(
  file: string,
  mine: Buffer | string | null,
  theirs: Buffer | string | null,
  options: { editedLocally: boolean },
): string | null {
  if (mine === null && theirs === null) return null;
  const badge = options.editedLocally ? chalk.yellow(" (edited locally)") : "";
  if (theirs === null) {
    return `${chalk.bold(file)}${badge} ${chalk.red("— removed upstream")}`;
  }
  if (mine === null) {
    return `${chalk.bold(file)} ${chalk.green("— new at this version")}`;
  }
  const mineBuf = typeof mine === "string" ? Buffer.from(mine) : mine;
  const theirsBuf = typeof theirs === "string" ? Buffer.from(theirs) : theirs;
  if (mineBuf.equals(theirsBuf)) return null;
  if (isBinary(mineBuf) || isBinary(theirsBuf)) {
    return `${chalk.bold(file)}${badge} ${chalk.yellow("— binary files differ")}`;
  }

  const patch = structuredPatch(
    file,
    file,
    mineBuf.toString("utf8"),
    theirsBuf.toString("utf8"),
    undefined,
    undefined,
    { context: 3 },
  );
  if (patch.hunks.length === 0) return null;
  const lines: string[] = [`${chalk.bold(file)}${badge}`];
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

function sortedByCascade(names: string[], kit: ResolvedKit): string[] {
  const cascade = new Map(kit.manifest.cssCascadeOrder.map((name, index) => [name, index]));
  return [...names].sort((a, b) => (cascade.get(a) ?? Infinity) - (cascade.get(b) ?? Infinity));
}
