"use strict";

/**
 * @fileoverview `zazz-ui update` — move vendored files to a new kit version
 * with provenance-recorded 3-way merges (ADR-0009).
 * @description Whole-kit by default; naming primitives narrows the update
 * (base files stay put, skew recorded via per-primitive versions). Every
 * file is classified against its pristine bytes at the *recorded* version
 * (the merge ancestor) and at the target: pristine files silently take
 * theirs, edited-but-upstream-unchanged files stay yours, real conflicts
 * prompt (keep / theirs / markers / skip). A skip rolls back the whole unit —
 * that primitive (or the base platform) stays at its recorded version so a
 * re-run can offer the merge again — and turns the exit code to 2. Generated
 * entries (index.css / index.js / head.html) belong to the base unit; their
 * merge ancestor and target are regenerated, not read from the tarball.
 * head.html is CLI-owned: it always takes the regenerated version.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compareVersions, sliceChangelog } from "../changelog.ts";
import { filterCollisions } from "../collisions.ts";
import { type FileHashes, type ZazzConfig, loadConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { type ResolvedKit, kitSpec, resolveKit } from "../kit.ts";
import { loadFetchOptions } from "../npmrc.ts";
import { classify } from "../merge.ts";
import { baseFiles, baseScriptFiles, primitiveFiles } from "../plan.ts";
import { type Transaction, type Write, apply, describe } from "../transaction.ts";
import { type Ui, createUi } from "../ui.ts";
import { sha256 } from "../vendor.ts";
import { appendJsImports, renderHead, renderIndexCss, renderIndexJs } from "../wiring.ts";
import { type GlobalFlags, parseVersionArg } from "./init.ts";

export interface UpdateFlags {
  keep?: boolean;
  theirs?: boolean;
  markers?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

type Strategy = "keep" | "theirs" | "markers";

/** Splits positional args: the @-prefixed one is the version, the rest names. */
export function splitVersionArgs(args: string[]): { version: string; names: string[] } {
  let version: string | undefined;
  const names: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("@")) {
      if (version !== undefined) {
        throw new ZazzError(`two version arguments: @${version} and ${arg}`);
      }
      version = parseVersionArg(arg);
    } else {
      names.push(arg);
    }
  }
  return { version: version ?? "latest", names };
}

/** One update unit: the base platform, or one primitive. All-or-nothing. */
interface UnitPlan {
  unit: string;
  fromVersion: string;
  writes: Write[];
  deletes: string[];
  hashes: FileHashes;
  skipped: boolean;
  /** The primitive no longer exists in the target kit. */
  removedFromKit: boolean;
  /** Per-file reporting lines (merged, restored, kept, …). */
  notes: string[];
  /** New upstream files that kept a stray on-disk file instead (exit 2). */
  straySkips: number;
}

export async function runUpdate(
  args: string[],
  flags: UpdateFlags,
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
  const strategy: Strategy | null =
    flags.keep === true
      ? "keep"
      : flags.theirs === true
        ? "theirs"
        : flags.markers === true
          ? "markers"
          : null;

  for (const name of names) {
    if (!config.primitives[name]) {
      throw new ZazzError(`"${name}" isn't vendored in this project`, {
        hint: `vendored: ${Object.keys(config.primitives).sort().join(", ") || "(none — run zazz-ui add)"}`,
      });
    }
  }

  ui.intro("zazz-ui update");
  const target = await ui.spinner(
    `Resolving @zazz-ui/core@${version}…`,
    () => resolveKit(kitSpec(version), fetch),
    (resolved) => `Target @zazz-ui/core@${resolved.version}`,
  );

  const wholeKit = names.length === 0;
  const vendoredNames = Object.keys(config.primitives);
  const scopeNames = wholeKit ? vendoredNames : names;

  // Dependency closure at the target: new dependencies vendor fresh.
  const survivors = scopeNames.filter((name) => target.manifest.primitives[name]);
  const closure = target.manifest.resolveClosure(survivors);
  const freshDeps = closure.filter((name) => !config.primitives[name]);

  const pending =
    freshDeps.length > 0 ||
    scopeNames.some((name) => config.primitives[name]?.version !== target.version) ||
    (wholeKit &&
      (config.kit.version !== target.version ||
        (config.base.version ?? config.kit.version) !== target.version));
  if (!pending) {
    ui.outro(`Already at ${target.version} — nothing to update.`);
    return;
  }

  // The relevant changelog slice, before any prompts.
  const changelog = await readChangelog(target);
  if (changelog && compareVersions(target.version, config.kit.version) > 0) {
    const slice = sliceChangelog(
      changelog,
      { from: config.kit.version, to: target.version },
      new Set([...vendoredNames, ...freshDeps]),
    );
    if (slice) ui.step(slice);
  }

  // Kits at recorded versions are the merge ancestors; cache by version.
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

  const context: UpdateContext = {
    config,
    root,
    target,
    kitAt,
    ui,
    strategy,
    interactive: ui.interactive,
  };

  // Primitives first (their outcomes decide what the entries import), base last.
  const units: UnitPlan[] = [];
  for (const name of scopeNames) {
    units.push(await planPrimitiveUnit(name, context));
  }
  const primitiveVersionAfter = new Map<string, string>(
    vendoredNames.map((name) => [name, config.primitives[name]?.version ?? target.version]),
  );
  for (const unit of units) {
    if (!unit.skipped) primitiveVersionAfter.set(unit.unit, target.version);
  }
  for (const dep of freshDeps) primitiveVersionAfter.set(dep, target.version);

  const freshWrites: Write[] = [];
  const freshHashes = new Map<string, FileHashes>();
  for (const dep of freshDeps) {
    const entry = target.manifest.primitives[dep];
    if (!entry) continue;
    const hashes: FileHashes = {};
    for (const file of primitiveFiles(entry, config.language, { examples: false })) {
      const content = await target.readFile(file);
      hashes[file] = sha256(content);
      freshWrites.push({
        dest: path.join(root, config.dir, ...file.split("/")),
        content,
        note: "vendor",
      });
    }
    freshHashes.set(dep, hashes);
  }

  const baseUnit = await planBaseUnit(context, {
    wholeKit,
    primitiveVersionAfter,
    removedPrimitives: units.filter((unit) => unit.removedFromKit && !unit.skipped),
  });
  units.push(baseUnit);

  // Fresh-dep files landing on stray disk files get the collision prompt.
  const { kept: keptFresh, skipped: freshSkipped } = await filterCollisions(freshWrites, {
    ui,
    force: flags.force === true,
  });

  // Commit bookkeeping: apply per-unit outcomes to the config.
  const applied = units.filter((unit) => !unit.skipped);
  const skippedUnits = units.filter((unit) => unit.skipped);
  for (const unit of applied) {
    if (unit.unit === "base") continue;
    if (unit.removedFromKit) {
      delete config.primitives[unit.unit];
    } else {
      config.primitives[unit.unit] = { version: target.version, files: unit.hashes };
    }
  }
  if (!baseUnit.skipped) {
    config.base.files = baseUnit.hashes;
  }
  for (const dep of freshDeps) {
    config.primitives[dep] = { version: target.version, files: freshHashes.get(dep) ?? {} };
  }
  if (wholeKit) {
    const oldBaseVersion = config.base.version ?? config.kit.version;
    config.kit = { version: target.version, integrity: target.integrity };
    if (baseUnit.skipped) config.base.version = oldBaseVersion;
    else delete config.base.version;
  }

  const writes = [...applied.flatMap((unit) => unit.writes), ...keptFresh];
  const deletes = applied.flatMap((unit) => unit.deletes);
  const tx: Transaction = { root, writes, deletes, config };

  if (flags.dryRun === true) {
    ui.step(`plan:\n${describe(tx)}`);
    ui.outro("Dry run — nothing written.");
    return;
  }
  await apply(tx);

  for (const unit of applied) {
    for (const note of unit.notes) ui.step(note);
  }
  if (freshDeps.length > 0) {
    ui.step(`New dependencies vendored at ${target.version}: ${freshDeps.join(", ")}`);
  }
  const straySkips = applied.reduce((count, unit) => count + unit.straySkips, 0);
  if (skippedUnits.length > 0 || freshSkipped.length > 0 || straySkips > 0) {
    if (skippedUnits.length > 0) {
      ui.warn(
        `Skipped (left at their recorded version): ${skippedUnits.map((unit) => unit.unit).join(", ")}\n` +
          `  re-run \`zazz-ui update\` to resolve, or pass --keep / --theirs / --markers`,
      );
    }
    if (freshSkipped.length > 0) {
      ui.warn(
        `Skipped ${freshSkipped.length} existing file(s) (kept yours; --force overwrites):\n  ${freshSkipped
          .map((dest) => path.relative(root, dest))
          .join("\n  ")}`,
      );
    }
    process.exitCode = 2;
  }
  const updatedPrimitives = applied.filter((unit) => unit.unit !== "base" && !unit.removedFromKit);
  ui.outro(
    wholeKit
      ? `Project now tracks @zazz-ui/core@${target.version} ` +
          `(${applied.length} unit${applied.length === 1 ? "" : "s"} updated${
            skippedUnits.length > 0 ? `, ${skippedUnits.length} skipped` : ""
          }).`
      : `Updated ${updatedPrimitives.map((unit) => unit.unit).join(", ") || "nothing"} to ${target.version}.`,
  );
}

interface UpdateContext {
  config: ZazzConfig;
  root: string;
  target: ResolvedKit;
  kitAt: (version: string) => Promise<ResolvedKit>;
  ui: Ui;
  strategy: Strategy | null;
  interactive: boolean;
}

/** Plans one primitive's update; prompts are answered here, writes staged. */
async function planPrimitiveUnit(name: string, context: UpdateContext): Promise<UnitPlan> {
  const { config, target } = context;
  const record = config.primitives[name];
  if (!record) throw new ZazzError(`primitive record vanished: ${name}`);
  const oldKit = await context.kitAt(record.version);
  const newEntry = target.manifest.primitives[name];

  const unit: UnitPlan = {
    unit: name,
    fromVersion: record.version,
    writes: [],
    deletes: [],
    hashes: {},
    skipped: false,
    removedFromKit: false,
    notes: [],
    straySkips: 0,
  };

  if (!newEntry) {
    // Removed upstream: per-file delete/keep, then the record goes away.
    unit.removedFromKit = true;
    for (const [file, recordedHash] of Object.entries(record.files)) {
      const resolved = await resolveFile(unit, context, {
        file,
        recordedHash,
        base: () => readKitFile(oldKit, file),
        theirs: async () => null,
      });
      if (!resolved) return unit; // unit skipped
    }
    unit.notes.push(`${name}: removed upstream in ${target.version}`);
    return unit;
  }

  const wantExamples = newEntry.examples.some((file) => file in record.files);
  const needed = primitiveFiles(newEntry, config.language, { examples: wantExamples });
  const files = [...new Set([...Object.keys(record.files), ...needed])];

  for (const file of files) {
    const resolved = await resolveFile(unit, context, {
      file,
      recordedHash: record.files[file] ?? null,
      base: () => readKitFile(oldKit, file),
      theirs: () => readKitFile(target, file),
    });
    if (!resolved) return unit; // unit skipped
  }
  return unit;
}

/**
 * @description Plans the base unit. Whole-kit updates merge every base file;
 * narrowed updates only regenerate the entries and vendor base scripts the
 * updated/new primitives now need — the platform itself stays put.
 */
async function planBaseUnit(
  context: UpdateContext,
  options: {
    wholeKit: boolean;
    primitiveVersionAfter: Map<string, string>;
    removedPrimitives: UnitPlan[];
  },
): Promise<UnitPlan> {
  const { config, target } = context;
  const baseVersion = config.base.version ?? config.kit.version;
  const oldKit = await context.kitAt(baseVersion);
  // The kit whose base platform the entries reference after this run.
  const entriesKit = options.wholeKit ? target : oldKit;

  const unit: UnitPlan = {
    unit: "base",
    fromVersion: baseVersion,
    writes: [],
    deletes: [],
    hashes: {},
    skipped: false,
    removedFromKit: false,
    notes: [],
    straySkips: 0,
  };

  const entryScript = config.language === "ts" ? "index.ts" : "index.js";
  const generated = new Set(["index.css", "index.js", "index.ts", "head.html"]);

  // Vendored primitive set before/after, for entry regeneration.
  const removed = new Set(options.removedPrimitives.map((plan) => plan.unit));
  const beforeVersions = new Map<string, string>(
    Object.entries(config.primitives).map(([name, entry]) => [name, entry.version]),
  );
  const afterVersions = new Map(
    [...options.primitiveVersionAfter].filter(([name]) => !removed.has(name)),
  );

  const entriesBefore = await entrySources(context, oldKit, beforeVersions);
  const entriesAfter = await entrySources(context, entriesKit, afterVersions);

  // The base scripts the post-update primitive set needs (per language).
  const afterEntries = [];
  for (const [name, primitiveVersion] of afterVersions) {
    const kit = await context.kitAt(primitiveVersion);
    const entry = kit.manifest.primitives[name];
    if (entry) afterEntries.push(entry);
  }
  const neededScripts = baseScriptFiles(afterEntries, config.language);

  const vendorable = options.wholeKit
    ? [
        ...new Set([
          ...Object.keys(config.base.files).filter((file) => !generated.has(file)),
          ...baseFiles(target.manifest, config.language),
          ...neededScripts,
        ]),
      ]
    : neededScripts.filter((file) => !(file in config.base.files));

  // Untouched base files keep their records in narrowed mode.
  if (!options.wholeKit) {
    for (const [file, hash] of Object.entries(config.base.files)) {
      if (!generated.has(file)) unit.hashes[file] = hash;
    }
  }

  for (const file of vendorable) {
    const resolved = await resolveFile(unit, context, {
      file,
      recordedHash: config.base.files[file] ?? null,
      base: () => readKitFile(oldKit, file),
      theirs: () => readKitFile(options.wholeKit ? target : oldKit, file),
    });
    if (!resolved) return unit;
  }

  // Generated entries: ancestor and target are regenerated, never read.
  for (const file of ["index.css", entryScript]) {
    const resolved = await resolveFile(unit, context, {
      file,
      recordedHash: config.base.files[file] ?? null,
      base: async () => (file === "index.css" ? entriesBefore.css : entriesBefore.js),
      theirs: async () => (file === "index.css" ? entriesAfter.css : entriesAfter.js),
    });
    if (!resolved) return unit;
  }

  // head.html is CLI-owned: regenerate, write on change, never prompt.
  const nextHead = renderHead(entriesKit, config);
  const headPath = destPath(context, "head.html");
  const currentHead = existsSync(headPath) ? await readFile(headPath, "utf8") : null;
  if (nextHead !== currentHead) {
    unit.writes.push({ dest: headPath, content: nextHead, note: "head" });
  }
  unit.hashes["head.html"] = sha256(nextHead);

  return unit;
}

/** Regenerates the entry pair for a vendored set at explicit versions. */
async function entrySources(
  context: UpdateContext,
  baseKit: ResolvedKit,
  versions: Map<string, string>,
): Promise<{ css: string; js: string }> {
  const cascade = new Map(
    context.target.manifest.cssCascadeOrder.map((name, index) => [name, index]),
  );
  const ordered = [...versions.keys()].sort(
    (a, b) => (cascade.get(a) ?? Infinity) - (cascade.get(b) ?? Infinity),
  );

  const primitives: { name: string; css: string[] }[] = [];
  const scripts: string[] = [];
  for (const name of ordered) {
    const version = versions.get(name);
    if (version === undefined) continue;
    const kit = await context.kitAt(version);
    const entry = kit.manifest.primitives[name];
    if (!entry) continue;
    primitives.push({ name, css: entry.css });
    scripts.push(...entry.base, ...entry.js);
  }

  const css = renderIndexCss({ kit: baseKit, legacy: context.config.legacy, primitives });
  const js = appendJsImports(
    renderIndexJs({ kit: baseKit, language: context.config.language }),
    [...new Set(scripts)],
    context.config.language,
  );
  return { css, js };
}

/**
 * @description Classifies one file and resolves its disposition into the
 * unit plan. Returns false when the user (or non-interactive default) chose
 * to skip — the caller abandons the whole unit.
 */
async function resolveFile(
  unit: UnitPlan,
  context: UpdateContext,
  input: {
    file: string;
    recordedHash: string | null;
    base: () => Promise<Buffer | string | null>;
    theirs: () => Promise<Buffer | string | null>;
  },
): Promise<boolean> {
  const { file } = input;
  const dest = destPath(context, file);
  const rel = path.relative(context.root, dest);
  const ours = existsSync(dest) ? await readFile(dest) : null;
  const theirs = await input.theirs();
  const base = await input.base();

  const labels = {
    ours: "yours",
    base: unit.fromVersion,
    theirs: context.target.version,
  };
  const disposition = classify({ ours, base, theirs, recordedHash: input.recordedHash, labels });

  const recordTheirs = (): void => {
    if (theirs !== null) unit.hashes[file] = sha256(theirs);
  };

  switch (disposition.kind) {
    case "unchanged":
      recordTheirs();
      return true;
    case "take-theirs":
      if (theirs !== null) unit.writes.push({ dest, content: theirs, note: "update" });
      recordTheirs();
      return true;
    case "keep-ours":
      recordTheirs();
      return true;
    case "auto-merged":
      unit.writes.push({ dest, content: disposition.content, note: "merge" });
      recordTheirs();
      unit.notes.push(`${rel}: merged your edits with ${context.target.version}`);
      return true;
    case "restore":
      if (theirs !== null) unit.writes.push({ dest, content: theirs, note: "restore" });
      recordTheirs();
      unit.notes.push(`${rel}: was deleted locally — restored at ${context.target.version}`);
      return true;
    case "create":
      if (ours !== null && theirs !== null && sha256(ours) === sha256(theirs)) {
        recordTheirs();
        return true;
      }
      if (ours !== null) {
        // Stray file where a new upstream file lands: the collision contract.
        const overwrite = await context.ui.confirm(`${dest} already exists. Overwrite?`, false);
        if (!overwrite) {
          recordTheirs();
          unit.notes.push(`${rel}: kept your existing file (new upstream file skipped)`);
          unit.straySkips += 1;
          return true;
        }
      }
      if (theirs !== null) unit.writes.push({ dest, content: theirs, note: "vendor" });
      recordTheirs();
      return true;
    case "delete-pristine":
      if (ours !== null) unit.deletes.push(dest);
      unit.notes.push(`${rel}: removed upstream — deleted (it was unedited)`);
      return true;
    case "removed-upstream-edited":
      return resolveRemovedEdited(unit, context, { file, dest, rel });
    case "conflict":
      return resolveConflict(unit, context, {
        file,
        dest,
        rel,
        theirs,
        markers: disposition.markers,
      });
    default:
      return true;
  }
}

/** Upstream removed a file the user edited: keep (untracked) or delete. */
async function resolveRemovedEdited(
  unit: UnitPlan,
  context: UpdateContext,
  file: { file: string; dest: string; rel: string },
): Promise<boolean> {
  const choice =
    context.strategy === "theirs"
      ? "delete"
      : context.strategy !== null || !context.interactive
        ? "keep"
        : await context.ui.select(
            `${file.rel} was removed in ${context.target.version}, but you've edited it.`,
            [
              {
                value: "keep",
                label: "Keep the file",
                hint: "it becomes yours; no longer tracked",
              },
              { value: "delete", label: "Delete it", hint: "follows upstream" },
            ],
            "keep",
          );
  if (choice === "delete") {
    unit.deletes.push(file.dest);
    unit.notes.push(`${file.rel}: removed upstream — deleted`);
  } else {
    unit.notes.push(`${file.rel}: removed upstream — kept your edited copy (now untracked)`);
  }
  return true;
}

/** A real conflict: strategy flag, prompt, or (non-interactive) skip. */
async function resolveConflict(
  unit: UnitPlan,
  context: UpdateContext,
  file: {
    file: string;
    dest: string;
    rel: string;
    theirs: Buffer | string | null;
    markers: string | null;
  },
): Promise<boolean> {
  const binary = file.markers === null;
  let choice: "keep" | "theirs" | "markers" | "skip";

  if (context.strategy !== null) {
    choice = context.strategy;
    if (choice === "markers" && binary) {
      context.ui.warn(
        `${file.rel}: binary conflict — markers are impossible, skipping ${unit.unit}`,
      );
      choice = "skip";
    }
  } else if (!context.interactive) {
    choice = "skip";
  } else {
    const choices: {
      value: "keep" | "theirs" | "markers" | "skip";
      label: string;
      hint?: string;
    }[] = [
      ...(binary
        ? []
        : [
            {
              value: "markers" as const,
              label: "Write conflict markers",
              hint: "resolve in your editor",
            },
          ]),
      { value: "keep", label: "Keep your version", hint: "still records the new pristine base" },
      { value: "theirs", label: `Take ${context.target.version}`, hint: "discards your edits" },
      {
        value: "skip",
        label: `Skip ${unit.unit}`,
        hint: "leaves the whole unit at its recorded version",
      },
    ];
    choice = await context.ui.select(
      `${file.rel}: your edits conflict with ${context.target.version}${binary ? " (binary)" : ""}`,
      choices,
      binary ? "keep" : "markers",
    );
  }

  switch (choice) {
    case "skip":
      unit.skipped = true;
      return false;
    case "keep":
      if (file.theirs !== null) unit.hashes[file.file] = sha256(file.theirs);
      unit.notes.push(`${file.rel}: kept your version (conflicted with ${context.target.version})`);
      return true;
    case "theirs":
      if (file.theirs !== null) {
        unit.writes.push({ dest: file.dest, content: file.theirs, note: "update" });
        unit.hashes[file.file] = sha256(file.theirs);
      }
      return true;
    case "markers":
      if (file.markers !== null) {
        unit.writes.push({ dest: file.dest, content: file.markers, note: "merge" });
      }
      if (file.theirs !== null) unit.hashes[file.file] = sha256(file.theirs);
      unit.notes.push(`${file.rel}: conflict markers written — resolve them in your editor`);
      return true;
    default:
      return true;
  }
}

function destPath(context: UpdateContext, file: string): string {
  return path.join(context.root, context.config.dir, ...file.split("/"));
}

async function readKitFile(kit: ResolvedKit, file: string): Promise<Buffer | null> {
  return kit.has(file) ? kit.readFile(file) : null;
}

/** The kit's CHANGELOG.md, from the extracted tarball root; null if absent. */
export async function readChangelog(kit: ResolvedKit): Promise<string | null> {
  try {
    return await readFile(path.join(kit.extractDir, "CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }
}
