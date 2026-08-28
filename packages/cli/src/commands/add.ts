"use strict";

/**
 * @fileoverview `zazz-ui add` — vendor primitives and their dependencies.
 * @description Resolves the requested primitives' dependency closure through
 * the kit's own manifest at the project's *recorded* kit version (never
 * latest — moving forward is `update`'s job), vendors what isn't already
 * there (css, scripts per language, required base scripts), inserts entry
 * imports at cascade position, regenerates `head.html`, and records
 * per-primitive provenance. No examples unless `--examples` (ticket 05).
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type ZazzConfig, loadConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { type ResolvedKit, kitSpec, resolveKit } from "../kit.ts";
import { loadFetchOptions } from "../npmrc.ts";
import { baseScriptFiles, primitiveFiles } from "../plan.ts";
import { type Transaction, type Write, apply, describe } from "../transaction.ts";
import { type Ui, createUi } from "../ui.ts";
import { sha256, vendorFiles } from "../vendor.ts";
import {
  appendJsImports,
  insertCssImports,
  renderHead,
  renderIndexCss,
  renderIndexJs,
} from "../wiring.ts";
import type { GlobalFlags } from "./init.ts";

export interface AddFlags {
  examples?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export async function runAdd(names: string[], flags: AddFlags, global: GlobalFlags): Promise<void> {
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

  ui.intro("zazz-ui add");
  // The recorded version, exactly: a project stays internally consistent.
  const kit = await ui.spinner(
    `Loading @zazz-ui/core@${config.kit.version}…`,
    () => resolveKit(kitSpec(config.kit.version), fetch),
    (resolved) => `Using @zazz-ui/core@${resolved.version}`,
  );

  for (const name of names) {
    if (!kit.manifest.primitives[name]) {
      throw new ZazzError(`unknown primitive "${name}"`, {
        hint: `the kit at ${kit.version} ships: ${Object.keys(kit.manifest.primitives).sort().join(", ")}`,
      });
    }
  }

  const closure = kit.manifest.resolveClosure(names);
  const fresh = closure.filter((name) => !config.primitives[name]);
  if (fresh.length === 0) {
    ui.outro(`Nothing to do — ${names.join(", ")} (and dependencies) already vendored.`);
    return;
  }
  const ridingAlong = fresh.filter((name) => !names.includes(name));
  ui.step(
    `Closure at ${kit.version}: ${closure.join(", ")}` +
      (ridingAlong.length > 0 ? `  (new dependencies: ${ridingAlong.join(", ")})` : ""),
  );

  const destRoot = path.join(root, config.dir);
  const vendorWrites: Write[] = [];

  for (const name of fresh) {
    const entry = kit.manifest.primitives[name];
    if (!entry) continue;
    const files = primitiveFiles(entry, config.language, {
      examples: flags.examples === true && names.includes(name),
    });
    const { writes, hashes } = await vendorFiles(kit, files, destRoot);
    vendorWrites.push(...writes);
    config.primitives[name] = { version: kit.version, files: hashes };
  }

  // Base scripts the closure needs that init didn't vendor (typeahead, embla…).
  const freshEntries = fresh.flatMap((name) => kit.manifest.primitives[name] ?? []);
  const neededBase = baseScriptFiles(freshEntries, config.language).filter(
    (file) => !(file in config.base.files),
  );
  const base = await vendorFiles(kit, neededBase, destRoot);
  vendorWrites.push(...base.writes);
  Object.assign(config.base.files, base.hashes);

  // Unexpected pre-existing files: prompt / --force / skip (still recorded).
  const { kept, skipped } = await filterCollisions(vendorWrites, {
    ui,
    force: flags.force === true,
  });

  const writes = [...kept, ...(await wiringWrites(kit, config, destRoot, fresh))];
  const tx: Transaction = { root, writes, config };

  if (flags.dryRun === true) {
    ui.step(`plan:\n${describe(tx)}`);
    ui.outro("Dry run — nothing written.");
    return;
  }
  await apply(tx);

  if (skipped.length > 0) {
    ui.warn(
      `Skipped ${skipped.length} existing file(s) (kept yours; --force overwrites):\n  ${skipped
        .map((dest) => path.relative(root, dest))
        .join("\n  ")}`,
    );
    process.exitCode = 2;
  }
  ui.outro(
    `Vendored ${fresh.join(", ")} into ${config.dir}/ — entry imports inserted in cascade order.`,
  );
}

/** Entry insertion + head regeneration; records the new generated hashes. */
async function wiringWrites(
  kit: ResolvedKit,
  config: ZazzConfig,
  destRoot: string,
  fresh: string[],
): Promise<Write[]> {
  const writes: Write[] = [];
  const cascade = kit.manifest.cssCascadeOrder;

  // index.css — surgical insertion into whatever is there; regenerate if gone.
  const cssPath = path.join(destRoot, "index.css");
  const cssAdditions = fresh.map((name) => ({
    name,
    css: kit.manifest.primitives[name]?.css ?? [],
  }));
  const currentCss = existsSync(cssPath)
    ? await readFile(cssPath, "utf8")
    : renderIndexCss({ kit, legacy: config.legacy, primitives: [] });
  const nextCss = insertCssImports(currentCss, cssAdditions, cascade);
  if (!existsSync(cssPath) || nextCss !== currentCss) {
    writes.push({ dest: cssPath, content: nextCss, note: "entry" });
  }
  config.base.files["index.css"] = sha256(nextCss);

  // index entry — idempotent appends in dependency order (base before js).
  const entryName = config.language === "ts" ? "index.ts" : "index.js";
  const entryPath = path.join(destRoot, entryName);
  const scripts = [
    ...new Set(
      fresh.flatMap((name) => {
        const entry = kit.manifest.primitives[name];
        return entry ? [...entry.base, ...entry.js] : [];
      }),
    ),
  ];
  const currentEntry = existsSync(entryPath)
    ? await readFile(entryPath, "utf8")
    : renderIndexJs({ kit, language: config.language });
  const nextEntry = appendJsImports(currentEntry, scripts, config.language);
  if (!existsSync(entryPath) || nextEntry !== currentEntry) {
    writes.push({ dest: entryPath, content: nextEntry, note: "entry" });
  }
  config.base.files[entryName] = sha256(nextEntry);

  // head.html is CLI-owned: regenerate unconditionally, write only on change.
  const headPath = path.join(destRoot, "head.html");
  const nextHead = renderHead(kit, config);
  const currentHead = existsSync(headPath) ? await readFile(headPath, "utf8") : null;
  if (nextHead !== currentHead) {
    writes.push({ dest: headPath, content: nextHead, note: "head" });
  }
  config.base.files["head.html"] = sha256(nextHead);

  return writes;
}

async function filterCollisions(
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
