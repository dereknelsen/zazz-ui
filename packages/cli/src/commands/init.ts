"use strict";

/**
 * @fileoverview `zazz-ui init` — vendor the Zazz base platform.
 * @description Fresh projects get the base css layers, the core runtime,
 * CLI-composed entry files, `head.html`, and a `zazz.json` provenance record.
 * Re-running in an initialized project is repair mode: restore what's
 * missing, report what's edited, touch nothing edited without `--force`,
 * and never re-ask identity decisions (ticket 04). No happy-path prompts.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { filterCollisions } from "../collisions.ts";
import { SCHEMA_URL, type ZazzConfig, loadConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { type ResolvedKit, kitSpec, resolveKit } from "../kit.ts";
import { type FetchOptions, loadFetchOptions } from "../npmrc.ts";
import { baseFiles } from "../plan.ts";
import { type Transaction, type Write, apply, describe } from "../transaction.ts";
import { type Ui, createUi } from "../ui.ts";
import { sha256, vendorFiles } from "../vendor.ts";
import { appendJsImports, renderHead, renderIndexCss, renderIndexJs } from "../wiring.ts";

export interface GlobalFlags {
  cwd: string;
  yes?: boolean;
  silent?: boolean;
  registry?: string;
  offline?: boolean;
  preferOffline?: boolean;
}

export interface InitFlags {
  dir: string;
  ts?: boolean;
  legacy?: string;
  /** From --no-fonts (default true). */
  fonts: boolean;
  /** From --no-theme-script (default true). */
  themeScript: boolean;
  force?: boolean;
  dryRun?: boolean;
}

/** Strips the @-prefix off a version positional (`@0.1.0` → `0.1.0`). */
export function parseVersionArg(arg: string | undefined): string {
  if (arg === undefined) return "latest";
  const version = arg.startsWith("@") ? arg.slice(1) : arg;
  if (version.length === 0) throw new ZazzError(`invalid version argument: ${arg}`);
  return version;
}

export async function runInit(
  versionArg: string | undefined,
  flags: InitFlags,
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

  const existing = await loadConfig(cwd);
  if (existing) {
    await repair(existing.config, existing.root, { fetch, ui, force: flags.force === true });
    return;
  }

  ui.intro("zazz-ui init");
  const version = parseVersionArg(versionArg);
  const kit = await ui.spinner(
    `Resolving @zazz-ui/core@${version}…`,
    () => resolveKit(kitSpec(version), fetch),
    (resolved) => `Resolved @zazz-ui/core@${resolved.version}`,
  );

  const config: ZazzConfig = {
    $schema: SCHEMA_URL,
    kit: { version: kit.version, integrity: kit.integrity },
    dir: flags.dir,
    language: flags.ts === true ? "ts" : "js",
    legacy: flags.legacy ?? null,
    head: { fonts: flags.fonts, themeScript: flags.themeScript },
    base: { files: {} },
    primitives: {},
  };

  const destRoot = path.join(cwd, config.dir);
  const { writes, hashes } = await vendorFiles(
    kit,
    baseFiles(kit.manifest, config.language),
    destRoot,
  );
  for (const write of generatedWrites(kit, config, destRoot, hashes)) writes.push(write);
  config.base.files = hashes;

  // Stray files at target paths (no zazz.json): conflict prompt per ticket 01.
  const { kept, skipped } = await filterCollisions(writes, {
    ui,
    force: flags.force === true,
  });

  const tx: Transaction = { root: cwd, writes: kept, config };
  if (flags.dryRun === true) {
    ui.step(`plan:\n${describe(tx)}`);
    ui.outro("Dry run — nothing written.");
    return;
  }
  await apply(tx);

  if (skipped.length > 0) {
    ui.warn(
      `Skipped ${skipped.length} existing file(s) (kept yours; --force overwrites):\n  ${skipped
        .map((dest) => path.relative(cwd, dest))
        .join("\n  ")}`,
    );
    process.exitCode = 2;
  }
  ui.outro(
    `Vendored ${kept.length} files into ${config.dir}/. ` +
      `Paste the contents of ${config.dir}/head.html into your <head>, then: zazz-ui add button`,
  );
}

/** The CLI-composed artifacts: entry css/js and head.html, hashed as generated. */
function generatedWrites(
  kit: ResolvedKit,
  config: ZazzConfig,
  destRoot: string,
  hashes: Record<string, string>,
): Write[] {
  const entryScript = config.language === "ts" ? "index.ts" : "index.js";
  const artifacts: [string, string, string][] = [
    ["index.css", renderIndexCss({ kit, legacy: config.legacy, primitives: [] }), "entry"],
    [entryScript, renderIndexJs({ kit, language: config.language }), "entry"],
    ["head.html", renderHead(kit, config), "head"],
  ];
  return artifacts.map(([file, content, note]) => {
    hashes[file] = sha256(content);
    return { dest: path.join(destRoot, file), content, note };
  });
}

/** Repair mode: restore missing files, report edits, keep identity decisions. */
async function repair(
  config: ZazzConfig,
  root: string,
  context: { fetch: FetchOptions; ui: Ui; force: boolean },
): Promise<void> {
  const { ui } = context;
  ui.intro("zazz-ui init — already initialized, checking the vendored tree");
  const kit = await ui.spinner(
    `Resolving @zazz-ui/core@${config.kit.version}…`,
    () => resolveKit(kitSpec(config.kit.version), context.fetch),
    (resolved) => `Using @zazz-ui/core@${resolved.version}`,
  );

  const destRoot = path.join(root, config.dir);
  const inventory: Record<string, string> = { ...config.base.files };
  for (const entry of Object.values(config.primitives)) Object.assign(inventory, entry.files);

  const writes: Write[] = [];
  const modified: string[] = [];
  let intact = 0;
  for (const [file, recordedHash] of Object.entries(inventory)) {
    const dest = path.join(destRoot, ...file.split("/"));
    const content = await pristineContent(kit, config, file);
    if (content === null) continue; // unknown generated artifact — leave it be
    if (!existsSync(dest)) {
      writes.push({ dest, content, note: "restore" });
      continue;
    }
    const onDisk = await readFile(dest);
    if (sha256(onDisk) === recordedHash) {
      intact += 1;
    } else if (context.force) {
      writes.push({ dest, content, note: "reset" });
    } else {
      modified.push(file);
    }
  }

  if (writes.length > 0) {
    await apply({ root, writes, config });
  }
  const restored = writes.length;
  const kept = modified.length;
  ui.outro(
    `${intact} intact · ${restored} restored · ${kept} edited${
      kept > 0 ? " (left alone; --force resets them to pristine)" : ""
    }`,
  );
}

/** Pristine bytes for a recorded file: tarball bytes, or regenerated artifact. */
async function pristineContent(
  kit: ResolvedKit,
  config: ZazzConfig,
  file: string,
): Promise<Buffer | string | null> {
  if (kit.has(file)) return kit.readFile(file);

  // Regenerated entries must reflect everything vendored, in cascade order.
  const cascade = new Map(kit.manifest.cssCascadeOrder.map((name, index) => [name, index]));
  const vendored = Object.keys(config.primitives)
    .filter((name) => kit.manifest.primitives[name])
    .sort((a, b) => (cascade.get(a) ?? Infinity) - (cascade.get(b) ?? Infinity));

  switch (file) {
    case "index.css":
      return renderIndexCss({
        kit,
        legacy: config.legacy,
        primitives: vendored.map((name) => ({
          name,
          css: kit.manifest.primitives[name]?.css ?? [],
        })),
      });
    case "index.js":
    case "index.ts": {
      const scripts = vendored.flatMap((name) => {
        const entry = kit.manifest.primitives[name];
        return entry ? [...entry.base, ...entry.js] : [];
      });
      return appendJsImports(
        renderIndexJs({ kit, language: config.language }),
        [...new Set(scripts)],
        config.language,
      );
    }
    case "head.html":
      return renderHead(kit, config);
    default:
      return null;
  }
}
